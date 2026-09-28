#!/usr/bin/env node
// Gemini API tool (Google AI Studio key). Dependency-free; needs Node 18+, and ffmpeg for mp3 output.
// Reads GEMINI_API_KEY from the environment (source load_env.sh first; it resolves op:// references).
//
// Usage:
//   node gemini.mjs image <prompt | @prompt.md> --out <file.png|.jpg> [--ref <image>]...
//       [--aspect 16:9] [--size 1K|2K|4K] [--model gemini-3.1-flash-image]
//       Generate (or, with --ref, edit or restyle) an image with Nano Banana 2.
//   node gemini.mjs tts <text-file | -> --voice <name> --out <file.mp3|.wav> [--style <one line>]
//       [--model gemini-3.8-flash-tts]
//       Speak the text word for word. The style directs delivery and is never spoken.
//   node gemini.mjs ask <prompt | @prompt.md> [file...] [--model <model>]
//       Ask about local media (video, audio, images); prints the answer.
//   node gemini.mjs review <video.mp4> [--brief <text | @file>] [--script <file>] [--changes <text>]
//       [--out <review.md>] [--model <model>]
//       QC pass: Gemini watches and listens to the whole video and reports defects with timestamps.
//   node gemini.mjs rank <criteria | @file> <candidate>... [--ref <file>] [--passes 4]
//       Blind ranking of audio (or image/video) candidates over several shuffled passes and models.
//
// Every command exits non-zero with the API's error message on failure. The key is sent in a
// header, never in a URL, and is never printed.

import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://generativelanguage.googleapis.com";
const MODELS = {
	image: "gemini-3.1-flash-image",
	tts: "gemini-3.8-flash-tts",
	ask: "gemini-3.1-pro-preview",
	// rank alternates these so one model's taste does not decide alone.
	rank: ["gemini-3.1-pro-preview", "gemini-3.8-flash"],
};
const MIME = {
	".mp3": "audio/mpeg",
	".wav": "audio/wav",
	".m4a": "audio/mp4",
	".aac": "audio/aac",
	".flac": "audio/flac",
	".mp4": "video/mp4",
	".webm": "video/webm",
	".mov": "video/quicktime",
	".mkv": "video/x-matroska",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
};
// Larger files go through the Files API instead of inline base64.
const INLINE_LIMIT = 15e6;

function key() {
	const k = process.env.GEMINI_API_KEY?.trim();
	if (!k) throw new Error("GEMINI_API_KEY is not set (add it to .env and source load_env.sh)");
	return k;
}

function mimeOf(file) {
	const mime = MIME[extname(file).toLowerCase()];
	if (!mime) throw new Error(`unsupported file type: ${file}`);
	return mime;
}

/** `@path` reads the text from a file; anything else is the text itself. */
function textArg(value) {
	return value?.startsWith("@") ? readFileSync(value.slice(1), "utf8") : value;
}

async function api(path, body, { method = "POST" } = {}) {
	for (let attempt = 0; ; attempt++) {
		const res = await fetch(`${API}${path}`, {
			method,
			headers: { "x-goog-api-key": key(), "Content-Type": "application/json" },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		if (res.ok) return res.json();
		const text = await res.text();
		// Rate limits and overloads clear on their own; everything else is a real error.
		if ((res.status === 429 || res.status >= 500) && attempt < 5) {
			await sleep(3000 * (attempt + 1));
			continue;
		}
		throw new Error(`${path} returned HTTP ${res.status}: ${text.slice(0, 800)}`);
	}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Upload through the Files API and wait until the file is ready; returns a fileData part. */
async function upload(file, mime) {
	const size = statSync(file).size;
	const start = await fetch(`${API}/upload/v1beta/files`, {
		method: "POST",
		headers: {
			"x-goog-api-key": key(),
			"X-Goog-Upload-Protocol": "resumable",
			"X-Goog-Upload-Command": "start",
			"X-Goog-Upload-Header-Content-Length": String(size),
			"X-Goog-Upload-Header-Content-Type": mime,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ file: { display_name: basename(file) } }),
	});
	const url = start.headers.get("x-goog-upload-url");
	if (!start.ok || !url) throw new Error(`upload of ${file} failed: HTTP ${start.status}`);
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"X-Goog-Upload-Offset": "0",
			"X-Goog-Upload-Command": "upload, finalize",
			"Content-Length": String(size),
		},
		body: readFileSync(file),
	});
	let info = (await res.json()).file;
	while (info?.state === "PROCESSING") {
		await sleep(3000);
		info = await api(`/v1beta/${info.name}`, undefined, { method: "GET" });
	}
	if (info?.state !== "ACTIVE")
		throw new Error(`upload of ${file} failed: ${JSON.stringify(info)}`);
	return { fileData: { mimeType: mime, fileUri: info.uri } };
}

async function mediaPart(file) {
	const mime = mimeOf(file);
	if (statSync(file).size < INLINE_LIMIT) {
		return { inlineData: { mimeType: mime, data: readFileSync(file).toString("base64") } };
	}
	return upload(file, mime);
}

/** Ask a model about text and media files; returns the text answer. */
export async function ask(prompt, files = [], { model = MODELS.ask, temperature = 0.4 } = {}) {
	const parts = [];
	for (const f of files) parts.push(await mediaPart(f));
	parts.push({ text: prompt });
	const json = await api(`/v1beta/models/${model}:generateContent`, {
		contents: [{ role: "user", parts }],
		generationConfig: { temperature },
	});
	const candidate = json.candidates?.[0];
	if (!candidate?.content) throw new Error(`no answer: ${JSON.stringify(json).slice(0, 800)}`);
	return candidate.content.parts.map((p) => p.text ?? "").join("");
}

/** The last output block of a type from an Interactions API response. */
function outputBlock(json, type) {
	const blocks = (json.steps ?? [])
		.filter((s) => s.type === "model_output")
		.flatMap((s) => s.content ?? [])
		.filter((c) => c.type === type && c.data);
	const block = blocks.at(-1);
	if (!block) throw new Error(`no ${type} in the response: ${JSON.stringify(json).slice(0, 800)}`);
	return block;
}

export async function image(
	prompt,
	out,
	{ refs = [], aspect = "16:9", size = "2K", model = MODELS.image } = {},
) {
	const input = [
		{ type: "text", text: prompt },
		...refs.map((f) => ({
			type: "image",
			mime_type: mimeOf(f),
			data: readFileSync(f).toString("base64"),
		})),
	];
	const json = await api("/v1beta/interactions", {
		model,
		input,
		response_format: { type: "image", aspect_ratio: aspect, image_size: size },
	});
	const block = outputBlock(json, "image");
	const data = Buffer.from(block.data, "base64");
	if (!block.mime_type || block.mime_type === mimeOf(out)) {
		writeFileSync(out, data);
	} else {
		// The API returns JPEG; convert when the output asks for another format.
		const r = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-i", "pipe:0", out], {
			input: data,
		});
		if (r.error || r.status !== 0)
			throw new Error(`ffmpeg failed: ${r.error?.message ?? r.stderr}`);
	}
	console.log(`Wrote ${out}`);
}

export async function tts(text, out, { voice, style, model = MODELS.tts } = {}) {
	if (!voice) throw new Error("tts needs --voice (for example Charon)");
	const content = { type: "text", text };
	if (style) content.annotations = [{ type: "speech_metadata", style }];
	const json = await api("/v1beta/interactions", {
		model,
		input: [{ type: "user_input", content: [content] }],
		response_format: { type: "audio", mime_type: "audio/wav" },
		generation_config: { speech_config: [{ voice }] },
	});
	const wav = Buffer.from(outputBlock(json, "audio").data, "base64");
	if (extname(out).toLowerCase() === ".wav") {
		writeFileSync(out, wav);
	} else {
		// Encode through ffmpeg: WAV (24 kHz mono) in on stdin, the requested format out.
		const r = spawnSync(
			"ffmpeg",
			["-loglevel", "error", "-y", "-i", "pipe:0", "-b:a", "192k", out],
			{
				input: wav,
			},
		);
		if (r.error || r.status !== 0)
			throw new Error(`ffmpeg failed: ${r.error?.message ?? r.stderr}`);
	}
	console.log(`Wrote ${out}`);
}

const REVIEW_CHECKLIST = `Check for:
- Legibility at 1080p on a laptop: captions, headings and labels that are too small, too faint, overlapping, or cut off.
- Visual sync: does each visual beat land with the words that describe it? Anything early, late, or lingering?
- Lines, arrows and connectors that end in empty space or point at nothing; objects popping in or out without motion.
- Motion quality: jumps, flicker, jitter, abrupt cuts, busy or cluttered frames, dead air.
- Audio: clicks, pops, clipping, music masking the narration, sound effects that are too loud or mistimed, mispronunciations.
- Clarity for the intended audience: would they understand each idea on first viewing? Anything confusing or jargon-heavy?
- Anything that looks like a slide or pitch deck rather than a finished, cinematic video.

Report only defects you actually observe, each as: timestamp range (m:ss), what is wrong, severity (must-fix / should-fix / nitpick).
Do not pad with praise. Then give an overall score out of 10 and one sentence on whether it is ready for its audience.`;

export async function review(video, { brief, script, changes, model = MODELS.ask } = {}) {
	const prompt = [
		"You are a demanding broadcast QC reviewer and creative director. Watch and listen to this entire video.",
		brief && `Brief: ${brief}`,
		script && `Narration script:\n${script}`,
		changes &&
			`The editor says these changed since the last review. For each, say whether that part of the video now looks right. You cannot measure pixels or seconds, so judge the look, not the numbers:\n${changes}`,
		REVIEW_CHECKLIST,
	]
		.filter(Boolean)
		.join("\n\n");
	return ask(prompt, [video], { model });
}

/** Deterministic shuffle so each pass hears the candidates in a different order. */
function shuffle(items, seed) {
	const r = [...items];
	let s = seed * 9301 + 49297;
	for (let i = r.length - 1; i > 0; i--) {
		s = (s * 9301 + 49297) % 233280;
		const j = Math.floor((s / 233280) * (i + 1));
		[r[i], r[j]] = [r[j], r[i]];
	}
	return r;
}

export async function rank(criteria, candidates, { ref, passes = 4 } = {}) {
	const scores = new Map(candidates.map((c) => [c, []]));
	const runs = await Promise.all(
		Array.from({ length: passes }, async (_, p) => {
			const order = shuffle(candidates, p + 1);
			const labels = order.map((_, i) => String.fromCharCode(65 + i));
			const prompt = `${ref ? "The FIRST file is a reference for the target style, not a candidate. " : ""}The candidate files follow, labelled in order ${labels.join(", ")}. ${criteria}
Take in every candidate completely. Respond ONLY with JSON: {"scores": {"A": <0-100>, ...}, "notes": {"A": "<short critique>", ...}}`;
			const model = MODELS.rank[p % MODELS.rank.length];
			const answer = await ask(prompt, [...(ref ? [ref] : []), ...order], { model });
			const json = JSON.parse(answer.slice(answer.indexOf("{"), answer.lastIndexOf("}") + 1));
			return { order, labels, json, model };
		}),
	);
	for (const { order, labels, json, model } of runs) {
		console.log(`--- ${model}`);
		for (const [i, c] of order.entries()) {
			const s = Number(json.scores?.[labels[i]]);
			if (Number.isFinite(s)) scores.get(c).push(s);
			console.log(
				`${basename(c).padEnd(32)} ${String(s).padStart(4)}  ${json.notes?.[labels[i]] ?? ""}`,
			);
		}
	}
	console.log("=== mean");
	const means = [...scores]
		.map(([c, s]) => [c, s.reduce((a, b) => a + b, 0) / Math.max(1, s.length)])
		.sort((a, b) => b[1] - a[1]);
	for (const [c, m] of means) console.log(`${basename(c).padEnd(32)} ${m.toFixed(1)}`);
}

/** Split argv into positionals and --flags; repeated flags collect into arrays. */
function parse(argv) {
	const pos = [];
	const flags = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith("--")) {
			pos.push(a);
			continue;
		}
		const name = a.slice(2);
		const value = argv[++i];
		if (value === undefined) throw new Error(`--${name} needs a value`);
		flags[name] = name in flags ? [flags[name], value].flat() : value;
	}
	return { pos, flags };
}

const list = (v) => (v === undefined ? [] : [v].flat());

const USAGE = `usage:
  gemini.mjs image <prompt | @prompt.md> --out <file.png> [--ref <image>]... [--aspect 16:9] [--size 2K]
  gemini.mjs tts <text-file | -> --voice <name> --out <file.mp3> [--style <one line>]
  gemini.mjs ask <prompt | @prompt.md> [file...]
  gemini.mjs review <video.mp4> [--brief <text | @file>] [--script <file>] [--changes <text>] [--out <review.md>]
  gemini.mjs rank <criteria | @file> <candidate>... [--ref <file>] [--passes 4]
All commands take --model <id>.`;

async function main(argv) {
	const [cmd, ...rest] = argv;
	const { pos, flags } = parse(rest);
	const model = flags.model ? { model: flags.model } : {};
	if (cmd === "image" && pos.length === 1 && flags.out) {
		await image(textArg(pos[0]), flags.out, {
			refs: list(flags.ref),
			aspect: flags.aspect,
			size: flags.size,
			...model,
		});
	} else if (cmd === "tts" && pos.length === 1 && flags.out) {
		const text = readFileSync(pos[0] === "-" ? 0 : pos[0], "utf8").trim();
		if (!text) throw new Error("no text to speak");
		await tts(text, flags.out, { voice: flags.voice, style: flags.style, ...model });
	} else if (cmd === "ask" && pos.length >= 1) {
		console.log(await ask(textArg(pos[0]), pos.slice(1), model));
	} else if (cmd === "review" && pos.length === 1) {
		const answer = await review(pos[0], {
			brief: textArg(flags.brief),
			script: flags.script && readFileSync(flags.script, "utf8"),
			changes: flags.changes,
			...model,
		});
		if (flags.out) writeFileSync(flags.out, `${answer.trim()}\n`);
		console.log(answer);
		if (flags.out) console.log(`\nSaved ${flags.out}`);
	} else if (cmd === "rank" && pos.length >= 3) {
		await rank(textArg(pos[0]), pos.slice(1), {
			ref: flags.ref,
			passes: Number(flags.passes ?? 4),
		});
	} else {
		console.error(USAGE);
		process.exitCode = 2;
	}
}

// Compare real paths: the skill is usually reached through a symlink (node_modules, .claude/skills).
if (
	process.argv[1] &&
	realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
	main(process.argv.slice(2)).catch((err) => {
		console.error(`gemini: ${err.message}`);
		process.exitCode = 1;
	});
}
