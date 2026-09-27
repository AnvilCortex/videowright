#!/usr/bin/env node
// Voiceover retime tool. Dependency-free; needs ffmpeg + ffprobe on PATH.
//
// The provider script marks pauses with [[pause 1.5s]]. The TTS model gets the text without
// the markers and paces the speech itself. After STT gives word timings, `apply` sets each
// marked pause to its exact length and shifts the word timings to match the new audio.
//
// Usage:
//   node retime.mjs text  <provider_script.md> [--pause-tag <tag>]
//       Print the text to send to the TTS provider. Each marker between two lines ends the line
//       with the provider's pause tag ("[pause]" for ElevenLabs v3, "<long pause>" for Gemini),
//       so the model really pauses there. Required when the script has such markers.
//   node retime.mjs check <provider_script.md> <stt.json>
//       Compare the STT transcript to the script. Exit 1 if the take has dropped,
//       repeated, or invented words (regenerate the take).
//   node retime.mjs apply <provider_script.md> <raw_audio> <stt.json> <out_audio> <out_timing.json>
//       [--allow-mismatch]
//       Run `check`, then write the retimed audio and the shifted timing JSON. Edits only
//       inside a real silence at each marker; stops if the take did not pause there.
//
// <stt.json> accepts OpenRouter/OpenAI verbose_json ({words: [{word, start, end}]}), ElevenLabs
// Scribe ({words: [{text, start, end, type}]}), or the canonical timing format.

import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MARKER = /\[\[\s*pause\s+([0-9]*\.?[0-9]+)\s*s?\s*\]\]/gi;
// Seconds of natural silence kept next to each word when a pause is shortened.
const EDGE_GUARD = 0.06;
// How far outside the STT word edges to look for the real silence.
const SEARCH_SLACK = 0.3;
// Shortest natural silence that may be edited between two lines. Shorter gaps (no pure-silence
// point, voice still trailing off) sound re-cut, so the take must be regenerated instead.
const MIN_NATURAL_PAUSE = 0.4;

/** Text below the first `---` line (the whole text when there is no `---`). */
export function scriptBody(markdown) {
	const lines = markdown.split(/\r?\n/);
	const rule = lines.findIndex((l) => l.trim() === "---");
	return rule === -1 ? markdown : lines.slice(rule + 1).join("\n");
}

/**
 * The text to send to the TTS provider. Each marker between two lines of speech appends the
 * provider's pause tag (e.g. "[pause]") to the line before it, so the model ends the line and
 * leaves a real gap for `apply` to edit. Markers at the start or end become plain breaks.
 */
export function ttsText(markdown, pauseTag) {
	const body = scriptBody(markdown);
	const hasSpeech = (s) => tokenize(s.replace(MARKER, " ")).length > 0;
	return body
		.replace(new RegExp(`\\s*${MARKER.source}\\s*`, "gi"), (match, _s, offset) => {
			const interior =
				hasSpeech(body.slice(0, offset)) && hasSpeech(body.slice(offset + match.length));
			if (!interior) return "\n\n";
			if (!pauseTag) {
				throw new Error(
					'pause markers between lines need --pause-tag ("[pause]" for ElevenLabs v3, "<long pause>" for Gemini)',
				);
			}
			return ` ${pauseTag}\n\n`;
		})
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/** Lowercase word tokens. Drops provider tags like [excited] and <short pause>. */
export function tokenize(text) {
	return text
		.replace(/<[^>]*>/g, " ")
		.replace(/\[[^\]]*\]/g, " ")
		.toLowerCase()
		.replace(/[‘’]/g, "'")
		.replace(/[-‐-―]/g, " ")
		.replace(/[^a-z0-9' ]/g, " ")
		.split(/\s+/)
		.filter((t) => t && t !== "'");
}

/**
 * Split the script into tokens and pauses. Each pause records the index of the last token
 * before it (-1 = before any speech) and the requested length in seconds.
 */
export function parseScript(markdown) {
	const body = scriptBody(markdown);
	const tokens = [];
	const pauses = [];
	let last = 0;
	for (const m of body.matchAll(MARKER)) {
		tokens.push(...tokenize(body.slice(last, m.index)));
		pauses.push({ seconds: Number.parseFloat(m[1]), afterToken: tokens.length - 1 });
		last = m.index + m[0].length;
	}
	tokens.push(...tokenize(body.slice(last)));
	return { tokens, pauses };
}

/** Normalise any supported STT/timing JSON to [{word, start, end}]. */
export function readWords(json) {
	const list = Array.isArray(json) ? json : json.words;
	if (!Array.isArray(list)) throw new Error("timing JSON has no `words` array");
	return list
		.filter((w) => w.type === undefined || w.type === "word")
		.map((w) => ({ word: String(w.word ?? w.text ?? ""), start: +w.start, end: +w.end }))
		.filter((w) => w.word.trim() && Number.isFinite(w.start) && Number.isFinite(w.end));
}

/** Longest-common-subsequence match. Returns refToHyp: hyp index per ref token, or -1. */
export function alignTokens(ref, hyp) {
	const n = ref.length;
	const m = hyp.length;
	const w = m + 1;
	const dp = new Uint32Array((n + 1) * w);
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i * w + j] =
				ref[i] === hyp[j]
					? dp[(i + 1) * w + j + 1] + 1
					: Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
		}
	}
	const refToHyp = new Array(n).fill(-1);
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (ref[i] === hyp[j]) {
			refToHyp[i++] = j++;
		} else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
			i++;
		} else {
			j++;
		}
	}
	return refToHyp;
}

/** Similarity of two strings from 0 to 1 (1 - normalised Levenshtein distance). */
export function similarity(a, b) {
	if (!a.length && !b.length) return 1;
	let prev = Array.from({ length: b.length + 1 }, (_, k) => k);
	for (let x = 1; x <= a.length; x++) {
		const cur = [x];
		for (let y = 1; y <= b.length; y++) {
			cur[y] = Math.min(prev[y] + 1, cur[y - 1] + 1, prev[y - 1] + (a[x - 1] === b[y - 1] ? 0 : 1));
		}
		prev = cur;
	}
	return 1 - prev[b.length] / Math.max(a.length, b.length);
}

/**
 * Non-matching runs between the script and the transcript. A run is a problem when it drops or
 * adds 2+ words, or replaces words with 2+ more/fewer words that do not sound alike. Small swaps
 * ("videowright" -> "video write", "a p i" -> "api") are normal STT spelling noise.
 */
export function transcriptDiffs(ref, hyp, refToHyp) {
	const diffs = [];
	let i = 0;
	let j = 0;
	const push = (i2, j2) => {
		if (i2 === i && j2 === j) return;
		const expected = ref.slice(i, i2);
		const heard = hyp.slice(j, j2);
		const problem =
			expected.length === 0 || heard.length === 0
				? Math.max(expected.length, heard.length) >= 2
				: Math.abs(expected.length - heard.length) >= 2 &&
					similarity(expected.join(""), heard.join("")) < 0.5;
		diffs.push({ expected: expected.join(" "), heard: heard.join(" "), problem });
	};
	for (let k = 0; k <= ref.length; k++) {
		if (k < ref.length && refToHyp[k] === -1) continue;
		const j2 = k < ref.length ? refToHyp[k] : hyp.length;
		push(k, j2);
		i = k + 1;
		j = j2 + 1;
	}
	return diffs;
}

/** Tokens for STT words, with the index of the word each token came from. */
function hypTokens(words) {
	const tokens = [];
	const wordIndex = [];
	words.forEach((w, wi) => {
		for (const t of tokenize(w.word)) {
			tokens.push(t);
			wordIndex.push(wi);
		}
	});
	return { tokens, wordIndex };
}

/**
 * Plan the audio edits. Each edit replaces [at, at + remove] of the source with `insert`
 * seconds of silence. `silences` are [start, end] intervals from ffmpeg silencedetect.
 */
export function planEdits({ tokens, pauses }, words, silences, duration) {
	const hyp = hypTokens(words);
	const refToHyp = alignTokens(tokens, hyp.tokens);
	const wordFor = (ti) => hyp.wordIndex[refToHyp[ti]];
	const bounds = [-1, ...pauses.map((p) => p.afterToken), tokens.length - 1];
	const edits = [];
	const report = [];

	pauses.forEach((pause, pi) => {
		const context = tokens.slice(Math.max(0, pause.afterToken - 3), pause.afterToken + 1);
		const label = pause.afterToken < 0 ? "(start)" : `after "...${context.join(" ")}"`;
		// Nearest matched tokens on each side, without crossing a neighbouring marker.
		let before = -1;
		for (let t = pause.afterToken; t > bounds[pi] && t >= 0; t--) {
			if (refToHyp[t] !== -1) {
				before = t;
				break;
			}
		}
		let after = -1;
		for (let t = pause.afterToken + 1; t <= bounds[pi + 2] && t < tokens.length; t++) {
			if (refToHyp[t] !== -1) {
				after = t;
				break;
			}
		}
		const isStart = pause.afterToken < 0;
		const isEnd = pause.afterToken >= tokens.length - 1;
		if ((!isStart && before === -1) || (!isEnd && after === -1)) {
			throw new Error(`pause ${pi + 1} ${label}: cannot find the neighbouring words in the STT`);
		}
		const a = isStart ? 0 : words[wordFor(before)].end;
		const b = isEnd ? duration : words[wordFor(after)].start;

		// Edit only inside a real silence; STT word edges are loose. At the start/end, only a
		// silence touching the file edge counts (none = add silence at the edge).
		const lo = isStart ? 0 : a - SEARCH_SLACK;
		const hi = isEnd ? duration : b + SEARCH_SLACK;
		let s0 = isEnd ? duration : 0;
		let s1 = isEnd ? duration : 0;
		let best = 0;
		for (const [x, y] of silences) {
			if (isStart && x > 0.05) continue;
			if (isEnd && y < duration - 0.05) continue;
			const overlap = Math.min(y, hi) - Math.max(x, lo);
			if (overlap > best) {
				best = overlap;
				s0 = isStart ? 0 : x;
				s1 = isEnd ? duration : y;
			}
		}
		if (!isStart && !isEnd && s1 - s0 < MIN_NATURAL_PAUSE) {
			throw new Error(
				`pause ${pi + 1} ${label}: the take has no natural pause here (silence ${(s1 - s0).toFixed(2)}s, need ${MIN_NATURAL_PAUSE}s). Cutting here would sound re-cut. Regenerate the take.`,
			);
		}

		const current = s1 - s0;
		const target = pause.seconds;
		const guard = (isStart ? 0 : EDGE_GUARD) + (isEnd ? 0 : EDGE_GUARD);
		let edit;
		if (target >= current) {
			const at = isStart ? 0 : isEnd ? duration : (s0 + s1) / 2;
			edit = { at, remove: 0, insert: target - current };
		} else {
			const remove = Math.max(0, Math.min(current - target, current - guard));
			const at = isStart ? 0 : isEnd ? duration - remove : (s0 + s1) / 2 - remove / 2;
			edit = { at, remove, insert: 0 };
		}
		edits.push(edit);
		report.push({ label, before: current, after: current - edit.remove + edit.insert });
	});
	return { edits: edits.sort((x, y) => x.at - y.at), report };
}

/** Map a time in the source audio to the retimed audio. */
export function shiftTime(t, edits) {
	let shift = 0;
	for (const e of edits) {
		if (t >= e.at + e.remove) shift += e.insert - e.remove;
		else if (t > e.at) shift += Math.min(t - e.at, e.insert) - (t - e.at);
	}
	return t + shift;
}

function run(cmd, args) {
	const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	if (r.error) throw new Error(`${cmd} failed: ${r.error.message} (is ${cmd} installed?)`);
	return r;
}

function probe(audio) {
	const r = run("ffprobe", [
		"-v",
		"error",
		"-select_streams",
		"a:0",
		"-show_entries",
		"stream=sample_rate,channels:format=duration",
		"-of",
		"json",
		audio,
	]);
	if (r.status !== 0) throw new Error(`ffprobe could not read ${audio}: ${r.stderr}`);
	const info = JSON.parse(r.stdout);
	const stream = info.streams[0];
	return {
		duration: Number.parseFloat(info.format.duration),
		sampleRate: stream.sample_rate,
		layout: stream.channels === 1 ? "mono" : "stereo",
	};
}

function detectSilences(audio, duration) {
	const r = run("ffmpeg", [
		"-hide_banner",
		"-i",
		audio,
		"-af",
		"silencedetect=n=-40dB:d=0.05",
		"-f",
		"null",
		"-",
	]);
	const silences = [];
	let open = null;
	for (const line of r.stderr.split("\n")) {
		const s = line.match(/silence_start: ([0-9.]+)/);
		const e = line.match(/silence_end: ([0-9.]+)/);
		if (s) open = Number.parseFloat(s[1]);
		if (e && open !== null) {
			silences.push([open, Number.parseFloat(e[1])]);
			open = null;
		}
	}
	if (open !== null) silences.push([open, duration]);
	return silences;
}

function renderAudio(audio, edits, info, out) {
	const filters = [];
	const labels = [];
	let pos = 0;
	edits.forEach((e, i) => {
		filters.push(
			`[0]atrim=start=${pos.toFixed(6)}:end=${e.at.toFixed(6)},asetpts=PTS-STARTPTS[p${i}]`,
		);
		labels.push(`[p${i}]`);
		if (e.insert > 0) {
			filters.push(
				`anullsrc=r=${info.sampleRate}:cl=${info.layout},atrim=duration=${e.insert.toFixed(6)}[s${i}]`,
			);
			labels.push(`[s${i}]`);
		}
		pos = e.at + e.remove;
	});
	filters.push(`[0]atrim=start=${pos.toFixed(6)},asetpts=PTS-STARTPTS[pend]`);
	labels.push("[pend]");
	filters.push(`${labels.join("")}concat=n=${labels.length}:v=0:a=1[out]`);
	const codec = out.toLowerCase().endsWith(".wav")
		? ["-c:a", "pcm_s16le"]
		: ["-c:a", "libmp3lame", "-b:a", "192k"];
	const r = run("ffmpeg", [
		"-loglevel",
		"error",
		"-y",
		"-i",
		audio,
		"-filter_complex",
		filters.join(";"),
		"-map",
		"[out]",
		...codec,
		out,
	]);
	if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
}

function checkCommand(scriptPath, sttPath) {
	const script = parseScript(readFileSync(scriptPath, "utf8"));
	const words = readWords(JSON.parse(readFileSync(sttPath, "utf8")));
	const hyp = hypTokens(words).tokens;
	const diffs = transcriptDiffs(script.tokens, hyp, alignTokens(script.tokens, hyp));
	const problems = diffs.filter((d) => d.problem);
	for (const d of diffs) {
		const tag = d.problem ? "PROBLEM" : "ok     ";
		console.log(`${tag} expected "${d.expected}" heard "${d.heard}"`);
	}
	console.log(
		problems.length
			? `FAIL: ${problems.length} problem(s). The take dropped, repeated, or invented words. Regenerate it.`
			: `PASS: ${diffs.length} small STT spelling difference(s), no problems.`,
	);
	return problems.length === 0;
}

function applyCommand(scriptPath, audio, sttPath, outAudio, outTiming, allowMismatch) {
	if (!checkCommand(scriptPath, sttPath) && !allowMismatch) {
		throw new Error("transcript check failed (pass --allow-mismatch to retime anyway)");
	}
	const script = parseScript(readFileSync(scriptPath, "utf8"));
	const words = readWords(JSON.parse(readFileSync(sttPath, "utf8")));
	const info = probe(audio);
	const silences = detectSilences(audio, info.duration);
	const { edits, report } = planEdits(script, words, silences, info.duration);
	for (const r of report) {
		console.log(`pause ${r.label}: ${r.before.toFixed(2)}s -> ${r.after.toFixed(2)}s`);
	}
	renderAudio(audio, edits, info, outAudio);
	const round = (t) => Math.round(shiftTime(t, edits) * 1000) / 1000;
	const timing = {
		words: words.map((w) => ({ word: w.word, start: round(w.start), end: round(w.end) })),
	};
	writeFileSync(outTiming, `${JSON.stringify(timing, null, "\t")}\n`);
	console.log(`Wrote ${outAudio} (${probe(outAudio).duration.toFixed(2)}s) and ${outTiming}`);
}

function main(argv) {
	const [cmd, ...rest] = argv;
	const allowMismatch = rest.includes("--allow-mismatch");
	const tagAt = rest.indexOf("--pause-tag");
	const pauseTag = tagAt === -1 ? undefined : rest[tagAt + 1];
	const args = rest.filter(
		(a, k) => a !== "--allow-mismatch" && (tagAt === -1 || (k !== tagAt && k !== tagAt + 1)),
	);
	if (cmd === "text" && args.length === 1) {
		process.stdout.write(`${ttsText(readFileSync(args[0], "utf8"), pauseTag)}\n`);
	} else if (cmd === "check" && args.length === 2) {
		if (!checkCommand(args[0], args[1])) process.exitCode = 1;
	} else if (cmd === "apply" && args.length === 5) {
		applyCommand(args[0], args[1], args[2], args[3], args[4], allowMismatch);
	} else {
		console.error(
			"usage:\n  retime.mjs text <provider_script.md> [--pause-tag <tag>]\n  retime.mjs check <provider_script.md> <stt.json>\n" +
				"  retime.mjs apply <provider_script.md> <raw_audio> <stt.json> <out_audio> <out_timing.json> [--allow-mismatch]",
		);
		process.exitCode = 2;
	}
}

// Compare real paths: the skill is usually reached through a symlink (node_modules, .claude/skills).
if (
	process.argv[1] &&
	realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
	try {
		main(process.argv.slice(2));
	} catch (err) {
		console.error(`retime: ${err.message}`);
		process.exitCode = 1;
	}
}
