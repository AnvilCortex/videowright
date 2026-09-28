import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_DRIFT = "cubic-bezier(0.37, 0, 0.63, 1)";
const WORD_MS = 380;

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
	id: "intention-sample-title",
	advances: [3.0, 7.6],
	voiceover: "Every system starts as one idea. So we gave everything one place.",

	mount(el) {
		host = el;
		el.innerHTML = `
      <div style="position: relative; height: 100%; color: var(--color-fg); font-family: var(--font-body); overflow: hidden;">
        ${paper("intention-title")}
        <div data-ref="world" style="position: absolute; inset: 0; transform-origin: 50% 45%;">
          <div data-ref="dot" style="
            position: absolute; left: 960px; top: 400px;
            width: var(--dot); height: var(--dot); margin: calc(var(--dot) / -2);
            border-radius: 50%; background: var(--color-fg);
            transform: scale(0);
          "></div>
          <div data-ref="title" style="
            position: absolute; left: 0; right: 0; top: 480px;
            text-align: center;
            font-family: var(--font-display);
            font-weight: 300;
            font-size: var(--type-title);
            line-height: 1;
            opacity: 0;
          ">One place.</div>
        </div>
        <div data-ref="cap1" style="position: absolute; left: 0; right: 0; top: 700px; text-align: center; font-size: var(--type-caption); opacity: 0;">${caption("Every system starts as one idea.")}</div>
        <div data-ref="cap2" style="position: absolute; left: 0; right: 0; top: 700px; text-align: center; font-size: var(--type-caption); opacity: 0;">${caption("So we gave everything one place.", [4, 5])}</div>
      </div>
    `;
	},

	async play(ctx) {
		const q = (ref: string) => host?.querySelector(`[data-ref="${ref}"]`) as HTMLElement;
		const style = getComputedStyle(host as HTMLElement);
		const ink = style.getPropertyValue("--color-fg").trim();
		const accent = style.getPropertyValue("--color-accent").trim();

		// The camera never stops: a slow drift under the whole scene.
		q("world").animate([{ transform: "scale(1)" }, { transform: "scale(1.035)" }], {
			duration: 8000,
			fill: "forwards",
			easing: EASE_DRIFT,
		});
		q("dot").animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], {
			duration: 700,
			fill: "forwards",
			easing: EASE_OUT,
		});
		speak(q("cap1"), ink, accent, 300);

		await ctx.waitForNext();

		q("cap1").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: "forwards" });
		// Title reveal: letters close from wide tracking while the line rises and fades in.
		q("title").animate(
			[
				{ opacity: 0, letterSpacing: "10px", transform: "translateY(8px)" },
				{ opacity: 1, offset: 0.4 },
				{ opacity: 1, letterSpacing: "-1.5px", transform: "translateY(0)" },
			],
			{ duration: 2200, fill: "forwards", easing: EASE_OUT },
		);
		speak(q("cap2"), ink, accent, 450);
		// play() resolves here; the scene holds until the final advance moves on.
	},

	unmount() {
		host = null;
	},
});
