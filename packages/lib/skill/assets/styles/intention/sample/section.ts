import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const WORD_MS = 380;

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

// The section card is the night scene: the "before", or a reveal. Paper cross-fades to night
// (never a hard cut) and the statement is the narration itself, set as type.
export default defineSegment({
	id: "intention-sample-section",
	advances: [3.0, 6.4],
	voiceover: "Then everything went quiet. So we gave everything one home.",

	mount(el) {
		host = el;
		el.innerHTML = `
      <div style="position: relative; height: 100%; font-family: var(--font-body); overflow: hidden;">
        <div style="position: absolute; inset: 0; background: var(--color-bg);"></div>
        <div data-ref="night" style="
          position: absolute; inset: 0; opacity: 0;
          background: radial-gradient(ellipse 80% 75% at 50% 45%, var(--color-night) 55%, var(--color-night-edge) 140%);
        "></div>
        <div data-ref="dot" style="
          position: absolute; left: 960px; top: 330px;
          width: var(--dot); height: var(--dot); margin: calc(var(--dot) / -2);
          border-radius: 50%; background: var(--color-fg);
        "></div>
        <div data-ref="eyebrow" style="
          position: absolute; left: 0; right: 0; top: 400px; text-align: center;
          font-size: var(--type-header); font-weight: 600;
          letter-spacing: var(--tracking-header); text-transform: uppercase;
          color: var(--color-night-fg); opacity: 0;
        ">Part two</div>
        <div data-ref="quiet" style="
          position: absolute; left: 0; right: 0; top: 480px; text-align: center;
          font-family: var(--font-display); font-weight: 300; font-size: var(--type-statement);
          opacity: 0;
        ">${caption("Then everything went quiet.")}</div>
        <div data-ref="home" style="
          position: absolute; left: 0; right: 0; top: 480px; text-align: center;
          font-family: var(--font-display); font-weight: 300; font-size: var(--type-statement);
          opacity: 0;
        ">${caption("So we gave everything one home.", [5])}</div>
      </div>
    `;
	},

	async play(ctx) {
		const q = (ref: string) => host?.querySelector(`[data-ref="${ref}"]`) as HTMLElement;
		const style = getComputedStyle(host as HTMLElement);
		const nightInk = style.getPropertyValue("--color-night-fg").trim();
		const gold = style.getPropertyValue("--color-accent-soft").trim();

		// Night reveal: the background cross-fades; the dot keeps its place and turns to night ink.
		q("night").animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: 1200,
			fill: "forwards",
			easing: EASE_IN_OUT,
		});
		q("dot").animate(
			[
				{ backgroundColor: style.getPropertyValue("--color-fg").trim() },
				{ backgroundColor: nightInk },
			],
			{ duration: 1200, fill: "forwards", easing: EASE_IN_OUT },
		);
		speak(q("quiet"), nightInk, gold, 500);

		await ctx.waitForNext();

		q("quiet").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: "forwards" });
		q("eyebrow").animate(
			[
				{ opacity: 0, transform: "translateY(6px)" },
				{ opacity: 0.7, transform: "translateY(0)" },
			],
			{ duration: 900, delay: 300, fill: "forwards", easing: EASE_OUT },
		);
		// The dot glows gold as "home" is spoken: the answer of this beat.
		q("dot").animate(
			[
				{ backgroundColor: nightInk, transform: "scale(1)" },
				{ backgroundColor: gold, transform: "scale(1.6)" },
			],
			{ duration: 900, delay: 450 + 250 + 5 * WORD_MS, fill: "forwards", easing: EASE_OUT },
		);
		speak(q("home"), nightInk, gold, 450);
	},

	unmount() {
		host = null;
	},
});
