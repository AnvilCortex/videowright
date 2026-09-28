import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const WORD_MS = 380;

// A "what happened" beat: normal state, impact first, how it was noticed, what changed.
// Red marks the failure and gold the fix; everything else is ink. Times come from the record.
const LINE = { x1: 240, x2: 1680, y: 500 };
type Kind = "ink" | "alert" | "accent";
const EVENTS: { time: string; x: number; label: string; kind: Kind }[] = [
	{ time: "09:00", x: 360, label: "Normal", kind: "ink" },
	{ time: "09:12", x: 720, label: "Checkout fails", kind: "alert" },
	{ time: "09:31", x: 1110, label: "On-call paged", kind: "ink" },
	{ time: "10:05", x: 1560, label: "Fix is live", kind: "accent" },
];
const CAPTIONS = [
	{ text: "At nine, everything is normal.", gold: [] as number[] },
	{ text: "At twelve past, checkout starts failing.", gold: [] },
	{ text: "The on-call engineer is paged.", gold: [] },
	{ text: "By five past ten, a fix is live.", gold: [5, 6, 7] },
];

/** Paper: a soft vignette toward the paper edge and faint static grain. */
function paper(id: string) {
	return `
    <div style="position: absolute; inset: 0; background: radial-gradient(ellipse 80% 75% at 50% 45%, var(--color-bg) 55%, var(--color-paper-edge) 140%);"></div>
    <svg aria-hidden="true" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.06; mix-blend-mode: multiply; will-change: transform;">
      <filter id="${id}-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" /></filter>
      <rect width="100%" height="100%" filter="url(#${id}-grain)" />
    </svg>`;
}

/** Caption markup: every word starts faint; words at the `gold` indices warm to the accent. */
function caption(text: string, gold: number[] = []) {
	return text
		.split(" ")
		.map(
			(w, i) =>
				`<span data-word${gold.includes(i) ? " data-gold" : ""} style="opacity: 0.2;">${w}</span>`,
		)
		.join(" ");
}

/** Fade the phrase in, then darken each word as the narrator reaches it. */
function speak(line: HTMLElement, ink: string, accent: string, delay = 0) {
	line.animate([{ opacity: 0 }, { opacity: 1 }], {
		duration: 400,
		delay,
		fill: "forwards",
		easing: EASE_OUT,
	});
	line.querySelectorAll<HTMLElement>("[data-word]").forEach((word, i) => {
		const to = word.hasAttribute("data-gold") ? accent : ink;
		word.animate(
			[
				{ opacity: 0.2, color: ink },
				{ opacity: 1, color: to },
			],
			{ duration: 320, delay: delay + 250 + i * WORD_MS, fill: "forwards", easing: EASE_OUT },
		);
	});
}

export default defineSegment({
	id: "intention-sample-content",
	advances: [2.8, 5.8, 8.6, 13.2],
	voiceover:
		"At nine, everything is normal. At twelve past, checkout starts failing. The on-call engineer is paged. By five past ten, a fix is live.",

	mount(el) {
		host = el;
		const events = EVENTS.map(
			(e, i) => `
          <div data-time="${i}" style="
            position: absolute; left: ${e.x - 120}px; width: 240px; top: ${LINE.y - 90}px; text-align: center;
            font-size: var(--type-header); font-weight: 600; letter-spacing: 0.12em;
            font-variant-numeric: tabular-nums; color: var(--color-muted); opacity: 0;
          ">${e.time}</div>
          <div data-pulse="${i}" style="
            position: absolute; left: ${e.x}px; top: ${LINE.y}px; width: 60px; height: 60px; margin: -30px;
            border-radius: 50%; border: 2px solid var(--color-alert); opacity: 0;
          "></div>
          <div data-event="${i}" style="
            position: absolute; left: ${e.x}px; top: ${LINE.y}px; width: 20px; height: 20px; margin: -10px;
            border-radius: 50%; background: var(--color-fg); transform: scale(0);
          "></div>
          <div data-label="${i}" style="
            position: absolute; left: ${e.x - 180}px; width: 360px; top: ${LINE.y + 50}px; text-align: center;
            font-size: calc(var(--type-label) * 1.1); opacity: 0;
          ">${e.label}</div>`,
		).join("");
		const captions = CAPTIONS.map(
			(c, i) =>
				`<div data-cap="${i}" style="position: absolute; left: 0; right: 0; top: 860px; text-align: center; font-size: var(--type-caption); opacity: 0;">${caption(c.text, c.gold)}</div>`,
		).join("");
		el.innerHTML = `
      <div style="position: relative; height: 100%; color: var(--color-fg); font-family: var(--font-body); overflow: hidden;">
        ${paper("intention-content")}
        <div data-ref="line" style="
          position: absolute; left: ${LINE.x1}px; top: ${LINE.y}px; width: ${LINE.x2 - LINE.x1}px; height: var(--line);
          margin-top: calc(var(--line) / -2); background: var(--color-muted);
          transform-origin: 0 50%; transform: scaleX(0);
        "></div>
        ${events}${captions}
      </div>
    `;
	},

	async play(ctx) {
		const q = (sel: string) => host?.querySelector(sel) as HTMLElement;
		const style = getComputedStyle(host as HTMLElement);
		const ink = style.getPropertyValue("--color-fg").trim();
		const colors: Record<Kind, string> = {
			ink,
			alert: style.getPropertyValue("--color-alert").trim(),
			accent: style.getPropertyValue("--color-accent").trim(),
		};
		const opts = { fill: "forwards" as const, easing: EASE_OUT };

		const mark = (i: number, delay: number) => {
			const e = EVENTS[i];
			q(`[data-time="${i}"]`).animate([{ opacity: 0 }, { opacity: 1 }], {
				...opts,
				duration: 700,
				delay,
			});
			q(`[data-event="${i}"]`).animate(
				[
					{ transform: "scale(0)", backgroundColor: ink },
					{ transform: "scale(1)", backgroundColor: colors[e.kind] },
				],
				{ ...opts, duration: 800, delay },
			);
			q(`[data-label="${i}"]`).animate(
				[
					{ opacity: 0, transform: "translateY(8px)", color: ink },
					{
						opacity: 1,
						transform: "translateY(0)",
						color: e.kind === "accent" ? colors.accent : ink,
					},
				],
				{ ...opts, duration: 800, delay: delay + 250 },
			);
			if (e.kind === "alert") {
				// The failure pulses twice, softly, then rests.
				q(`[data-pulse="${i}"]`).animate(
					[
						{ opacity: 0.8, transform: "scale(0.4)" },
						{ opacity: 0, transform: "scale(1.8)" },
					],
					{ duration: 1400, delay: delay + 300, iterations: 2, easing: EASE_OUT },
				);
			}
		};

		q('[data-ref="line"]').animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
			fill: "forwards",
			easing: EASE_IN_OUT,
			duration: 1800,
		});
		mark(0, 700);
		speak(q('[data-cap="0"]'), ink, colors.accent, 300);

		for (let i = 1; i < EVENTS.length; i++) {
			await ctx.waitForNext();
			q(`[data-cap="${i - 1}"]`).animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: 350,
				fill: "forwards",
			});
			mark(i, 100);
			speak(q(`[data-cap="${i}"]`), ink, colors.accent, 400);
		}
	},

	unmount() {
		host = null;
	},
});
