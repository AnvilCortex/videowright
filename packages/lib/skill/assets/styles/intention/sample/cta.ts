import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const EASE_DRIFT = "cubic-bezier(0.37, 0, 0.63, 1)";
const WORD_MS = 380;

// The end card: the film's dots settle into one ring emblem, the answer sits at its center.
const EMBLEM = { cx: 960, cy: 400, r: 150, count: 24, dot: 10 };
const TITLE = { text: "All of it, in one place.", gold: [4, 5], at: 2000 };

/** Seeded random numbers: layouts must be identical on every render. */
function rng(seed: number) {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

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

// Each dot starts somewhere in a loose field around the emblem and ends on the ring.
const R = rng(4242);
const DOTS = Array.from({ length: EMBLEM.count }, (_, i) => {
	const a = (i / EMBLEM.count) * 2 * Math.PI - Math.PI / 2;
	const fa = R() * 2 * Math.PI;
	const fd = 240 + R() * 180;
	return {
		field: { x: EMBLEM.cx + fd * Math.cos(fa), y: EMBLEM.cy + fd * Math.sin(fa) },
		ring: { x: EMBLEM.cx + EMBLEM.r * Math.cos(a), y: EMBLEM.cy + EMBLEM.r * Math.sin(a) },
	};
});

export default defineSegment({
	id: "intention-sample-cta",
	advances: [4.6, 10.6],
	voiceover: "All of it, in one place. Start with one question.",

	mount(el) {
		host = el;
		const half = EMBLEM.dot / 2;
		const dots = DOTS.map(
			(d, i) => `<div data-dot="${i}" style="
          position: absolute; left: 0; top: 0; width: ${EMBLEM.dot}px; height: ${EMBLEM.dot}px; margin: -${half}px;
          border-radius: 50%; background: var(--color-fg);
          transform: translate(${d.field.x}px, ${d.field.y}px) scale(0);
        "></div>`,
		).join("");
		el.innerHTML = `
      <div style="position: relative; height: 100%; color: var(--color-fg); font-family: var(--font-body); overflow: hidden;">
        ${paper("intention-cta")}
        <div data-ref="world" style="position: absolute; inset: 0; transform-origin: ${EMBLEM.cx}px ${EMBLEM.cy}px;">
          <div data-ref="emblem" style="
            position: absolute; inset: 0; transform-origin: ${EMBLEM.cx}px ${EMBLEM.cy}px; transform: rotate(-120deg);
          ">${dots}</div>
          <div data-ref="center" style="
            position: absolute; left: ${EMBLEM.cx}px; top: ${EMBLEM.cy}px;
            width: var(--dot); height: var(--dot); margin: calc(var(--dot) / -2);
            border-radius: 50%; background: var(--color-accent); transform: scale(0);
          "></div>
          <div data-ref="title" style="
            position: absolute; left: 0; right: 0; top: ${EMBLEM.cy + EMBLEM.r + 110}px; text-align: center;
            font-family: var(--font-display); font-weight: 400; font-size: var(--type-heading);
            line-height: 1.1; opacity: 0;
          ">${caption(TITLE.text, TITLE.gold)}</div>
          <div data-ref="line" style="
            position: absolute; left: 0; right: 0; top: ${EMBLEM.cy + EMBLEM.r + 200}px; text-align: center;
            font-weight: 300; font-size: var(--type-caption); opacity: 0;
          ">${caption("Start with one question.")}</div>
        </div>
      </div>
    `;
	},

	async play(ctx) {
		const q = (ref: string) => host?.querySelector(`[data-ref="${ref}"]`) as HTMLElement;
		const dot = (i: number) => host?.querySelector(`[data-dot="${i}"]`) as HTMLElement;
		const style = getComputedStyle(host as HTMLElement);
		const ink = style.getPropertyValue("--color-fg").trim();
		const accent = style.getPropertyValue("--color-accent").trim();

		// The camera never stops, and the emblem turns into place on one long ease-out.
		q("world").animate([{ transform: "scale(1)" }, { transform: "scale(1.03)" }], {
			duration: 10600,
			fill: "forwards",
			easing: EASE_DRIFT,
		});
		q("emblem").animate([{ transform: "rotate(-120deg)" }, { transform: "rotate(0deg)" }], {
			duration: 5600,
			fill: "forwards",
			easing: EASE_OUT,
		});
		// Each dot grows where it is, then travels home to its place on the ring.
		DOTS.forEach((d, i) => {
			dot(i).animate(
				[
					{ transform: `translate(${d.field.x}px, ${d.field.y}px) scale(0)`, easing: EASE_OUT },
					{
						transform: `translate(${d.field.x}px, ${d.field.y}px) scale(1)`,
						offset: 0.22,
						easing: EASE_IN_OUT,
					},
					{ transform: `translate(${d.ring.x}px, ${d.ring.y}px) scale(1)` },
				],
				{ duration: 3200, delay: i * 25, fill: "forwards" },
			);
		});

		// The title is the narration: its words light as spoken, and the center warms on "one place".
		speak(q("title"), ink, accent, TITLE.at);
		q("title").animate([{ letterSpacing: "6px" }, { letterSpacing: "0px" }], {
			duration: 2400,
			delay: TITLE.at,
			fill: "forwards",
			easing: EASE_OUT,
		});
		q("center").animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], {
			duration: 800,
			delay: TITLE.at + 250 + TITLE.gold[0] * WORD_MS,
			fill: "forwards",
			easing: EASE_OUT,
		});

		await ctx.waitForNext();

		// One line beneath, then the card holds while the music fades.
		speak(q("line"), ink, accent, 300);
	},

	unmount() {
		host = null;
	},
});
