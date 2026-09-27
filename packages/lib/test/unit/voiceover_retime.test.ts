import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

type Word = { word: string; start: number; end: number };
type Edit = { at: number; remove: number; insert: number };
type Script = { tokens: string[]; pauses: { seconds: number; afterToken: number }[] };
type RetimeModule = {
	scriptBody(markdown: string): string;
	ttsText(markdown: string, pauseTag?: string): string;
	tokenize(text: string): string[];
	similarity(a: string, b: string): number;
	parseScript(markdown: string): Script;
	readWords(json: unknown): Word[];
	alignTokens(ref: string[], hyp: string[]): number[];
	transcriptDiffs(
		ref: string[],
		hyp: string[],
		refToHyp: number[],
	): { expected: string; heard: string; problem: boolean }[];
	planEdits(
		script: Script,
		words: Word[],
		silences: [number, number][],
		duration: number,
	): { edits: Edit[]; report: { label: string; before: number; after: number }[] };
	shiftTime(t: number, edits: Edit[]): number;
};

const SCRIPT_PATH = resolve(__dirname, "../../skill/scripts/retime.mjs");
let retime: RetimeModule;

beforeAll(async () => {
	retime = (await import(SCRIPT_PATH)) as RetimeModule;
});

const PROVIDER_SCRIPT = `# Provider Script

> Provider: Gemini 3.8 Flash TTS

---

[[pause 1.0s]]

Hello there, friend.

[[pause 1.5s]]

It’s a new day.
`;

// Words as an STT pass would return them for PROVIDER_SCRIPT.
const WORDS: Word[] = [
	{ word: "Hello", start: 0.2, end: 0.5 },
	{ word: "there,", start: 0.55, end: 0.8 },
	{ word: "friend.", start: 0.85, end: 1.2 },
	{ word: "It's", start: 1.7, end: 1.9 },
	{ word: "a", start: 1.95, end: 2.0 },
	{ word: "new", start: 2.05, end: 2.3 },
	{ word: "day.", start: 2.35, end: 2.8 },
];

describe("retime script text", () => {
	it("returns only the body below the rule", () => {
		expect(retime.scriptBody("header\n---\nbody")).toBe("body");
		expect(retime.scriptBody("no rule")).toBe("no rule");
	});

	it("requires a pause tag for markers between lines", () => {
		expect(() => retime.ttsText(PROVIDER_SCRIPT)).toThrow(/--pause-tag/);
	});

	it("needs no pause tag for markers at the start or end only", () => {
		const script = "---\n[[pause 1s]]\nHello there.\n[[pause 0.5s]]\n";
		expect(retime.ttsText(script)).toBe("Hello there.");
	});

	it("adds the pause tag at markers between speech only", () => {
		const script = `${PROVIDER_SCRIPT}\n[[pause 0.5s]]\n`;
		expect(retime.ttsText(script, "[pause]")).toBe(
			"Hello there, friend. [pause]\n\nIt’s a new day.",
		);
	});

	it("drops the pause tag from transcript tokens", () => {
		const text = retime.ttsText(PROVIDER_SCRIPT, "<long pause>");
		expect(retime.tokenize(text)).toEqual(retime.parseScript(PROVIDER_SCRIPT).tokens);
	});

	it("tokenizes without provider tags, punctuation, or curly quotes", () => {
		expect(retime.tokenize("[excited] It’s pixel-perfect! <short pause> Done.")).toEqual([
			"it's",
			"pixel",
			"perfect",
			"done",
		]);
	});

	it("parses pauses with the index of the preceding token", () => {
		const { tokens, pauses } = retime.parseScript(PROVIDER_SCRIPT);
		expect(tokens).toEqual(["hello", "there", "friend", "it's", "a", "new", "day"]);
		expect(pauses).toEqual([
			{ seconds: 1.0, afterToken: -1 },
			{ seconds: 1.5, afterToken: 2 },
		]);
	});
});

describe("retime STT input", () => {
	it("reads OpenRouter verbose_json words", () => {
		expect(retime.readWords({ text: "Hi", words: [{ word: " Hi", start: 0, end: 0.3 }] })).toEqual([
			{ word: " Hi", start: 0, end: 0.3 },
		]);
	});

	it("reads ElevenLabs Scribe words and skips spacing entries", () => {
		const scribe = {
			words: [
				{ text: "Hi", start: 0, end: 0.3, type: "word" },
				{ text: " ", start: 0.3, end: 0.4, type: "spacing" },
				{ text: "(laughs)", start: 0.4, end: 0.9, type: "audio_event" },
				{ text: "you", start: 0.9, end: 1.1, type: "word" },
			],
		};
		expect(retime.readWords(scribe).map((w) => w.word)).toEqual(["Hi", "you"]);
	});

	it("throws on JSON with no words array", () => {
		expect(() => retime.readWords({ text: "Hi" })).toThrow(/words/);
	});
});

describe("retime transcript check", () => {
	const check = (ref: string, heard: string) => {
		const a = retime.tokenize(ref);
		const b = retime.tokenize(heard);
		return retime.transcriptDiffs(a, b, retime.alignTokens(a, b));
	};

	it("passes STT spelling noise", () => {
		const diffs = check("Videowright works in Claude Code.", "VideoWrite works in cloud code.");
		expect(diffs.length).toBeGreaterThan(0);
		expect(diffs.some((d) => d.problem)).toBe(false);
	});

	it("passes letter-by-letter and phonetic spellings", () => {
		const diffs = check("The A P I uses is-tee-oh.", "The API uses Istio.");
		expect(diffs.length).toBe(2);
		expect(diffs.some((d) => d.problem)).toBe(false);
	});

	it("flags a dropped sentence", () => {
		const diffs = check(
			"Even your real UI. If your stack runs in a browser, it works. One command.",
			"Even your real UI. One command.",
		);
		expect(diffs.filter((d) => d.problem)).toHaveLength(1);
	});

	it("flags a repeated phrase", () => {
		const diffs = check(
			"using any web technologies. That includes SVG.",
			"using any web technologies. Using any web technologies. That includes SVG.",
		);
		expect(diffs.filter((d) => d.problem)).toHaveLength(1);
	});

	it("flags a spoken tag", () => {
		const diffs = check("Hello there. Goodbye.", "Hello there. Short pause. Goodbye.");
		expect(diffs.some((d) => d.problem && d.heard === "short pause")).toBe(true);
	});
});

describe("retime edit planning", () => {
	const script = () => retime.parseScript(PROVIDER_SCRIPT);

	it("lengthens a short gap and a short lead-in", () => {
		const silences: [number, number][] = [
			[0, 0.2],
			[1.2, 1.7],
		];
		const { edits, report } = retime.planEdits(script(), WORDS, silences, 3.0);
		expect(edits).toEqual([
			{ at: 0, remove: 0, insert: expect.closeTo(0.8, 6) },
			{ at: expect.closeTo(1.45, 6), remove: 0, insert: expect.closeTo(1.0, 6) },
		]);
		expect(report.map((r) => r.after)).toEqual([expect.closeTo(1.0, 6), expect.closeTo(1.5, 6)]);
	});

	it("shortens a long gap from its middle", () => {
		const long = WORDS.map((w, i) => (i >= 3 ? { ...w, start: w.start + 2, end: w.end + 2 } : w));
		const silences: [number, number][] = [
			[0, 1.0],
			[1.2, 3.7],
		];
		const { edits } = retime.planEdits(script(), long, silences, 5.0);
		// Silence 1.2-3.7 (2.5s) -> 1.5s: remove 1.0s centred on 2.45.
		expect(edits[1]).toEqual({
			at: expect.closeTo(1.95, 6),
			remove: expect.closeTo(1.0, 6),
			insert: 0,
		});
		// Lead-in 1.0s already matches the target.
		expect(edits[0]).toEqual({ at: 0, remove: 0, insert: 0 });
	});

	it("refuses to cut between lines with no silence", () => {
		expect(() => retime.planEdits(script(), WORDS, [], 3.0)).toThrow(/no natural pause/);
	});

	it("refuses to cut between lines with a too-short silence", () => {
		const silences: [number, number][] = [[1.25, 1.45]];
		expect(() => retime.planEdits(script(), WORDS, silences, 3.0)).toThrow(/silence 0.20s/);
	});

	it("adds lead-in silence when the take starts with speech", () => {
		const { edits } = retime.planEdits(script(), WORDS, [[1.2, 1.7]], 3.0);
		expect(edits[0]).toEqual({ at: 0, remove: 0, insert: expect.closeTo(1.0, 6) });
	});

	it("throws when the words next to a pause are missing from the STT", () => {
		const missing = WORDS.slice(0, 3);
		expect(() => retime.planEdits(script(), missing, [], 3.0)).toThrow(/pause 2/);
	});
});

describe("retime time shift", () => {
	const edits: Edit[] = [
		{ at: 0, remove: 0, insert: 1 },
		{ at: 2, remove: 0.5, insert: 0 },
		{ at: 4, remove: 0, insert: 2 },
	];

	it("shifts times after each edit", () => {
		expect(retime.shiftTime(1, edits)).toBeCloseTo(2, 6);
		expect(retime.shiftTime(3, edits)).toBeCloseTo(3.5, 6);
		expect(retime.shiftTime(5, edits)).toBeCloseTo(7.5, 6);
	});

	it("clamps times inside a removed region to its start", () => {
		expect(retime.shiftTime(2.25, edits)).toBeCloseTo(3, 6);
	});
});
