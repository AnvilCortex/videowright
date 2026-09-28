import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_DRIFT = "cubic-bezier(0.37, 0, 0.63, 1)";
const WORD_MS = 380;

const PHRASES = [
	{ text: "Simple questions get surprisingly hard.", gold: [] as number[] },
	{ text: "Who owns this?", gold: [] },
	{ text: "What does it cost?", gold: [] },
	{ text: "Who do we call when it breaks?", gold: [] },
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

/** Fade the phrase in (rising a few pixels), then darken each word as the narrator reaches it. */
function speak(line: HTMLElement, ink: string, accent: string, delay = 0) {
	line.animate(
		[
			{ opacity: 0, transform: "translateY(8px)" },
			{ opacity: 1, transform: "translateY(0)" },
		],
		{ duration: 600, delay, fill: "forwards", easing: EASE_OUT },
	);
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

// Kinetic: the narration is the picture. One phrase at a time, never overlapping.
export default defineSegment({
	id: "intention-sample-kinetic",
	advances: [2.9, 4.9, 7.2, 11.2],
	voiceover:
		"Simple questions get surprisingly hard. Who owns this? What does it cost? Who do we call when it breaks?",

	mount(el) {
		host = el;
		const lines = PHRASES.map(
			(p, i) => `
          <div data-ref="p${i}" style="
            position: absolute; left: var(--safe-x); right: var(--safe-x); top: 50%;
            margin-top: calc(var(--type-statement) * -0.6);
            text-align: center;
            font-family: var(--font-display); font-weight: 300;
            font-size: var(--type-statement); line-height: 1.2;
            opacity: 0;
          ">${caption(p.text, p.gold)}</div>`,
		).join("");
		el.innerHTML = `
      <div style="position: relative; height: 100%; color: var(--color-fg); font-family: var(--font-body); overflow: hidden;">
        ${paper("intention-kinetic")}
        <div data-ref="world" style="position: absolute; inset: 0; transform-origin: 50% 50%;">${lines}</div>
      </div>
    `;
	},

	async play(ctx) {
		const q = (ref: string) => host?.querySelector(`[data-ref="${ref}"]`) as HTMLElement;
		const style = getComputedStyle(host as HTMLElement);
		const ink = style.getPropertyValue("--color-fg").trim();
		const accent = style.getPropertyValue("--color-accent").trim();

		q("world").animate([{ transform: "scale(1)" }, { transform: "scale(1.04)" }], {
			duration: 11200,
			fill: "forwards",
			easing: EASE_DRIFT,
		});

		speak(q("p0"), ink, accent, 200);
		for (let i = 1; i < PHRASES.length; i++) {
			await ctx.waitForNext();
			// The previous phrase leaves before the next one arrives.
			q(`p${i - 1}`).animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: "forwards" });
			speak(q(`p${i}`), ink, accent, 380);
		}
	},

	unmount() {
		host = null;
	},
});
