import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const WORD_MS = 380;

// The spoken number is rounded ("over seventy"); the numeral on screen is exact.
const COUNT = 73;
const RING = { cx: 960, cy: 480, r: 310 };

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

// Field positions (scattered) and ring positions for every dot, from one seeded stream.
const R = rng(7301);
const DOTS = Array.from({ length: COUNT }, (_, i) => {
	const a = (i / COUNT) * 2 * Math.PI - Math.PI / 2;
	return {
		field: { x: 200 + R() * 1520, y: 140 + R() * 760 },
		ring: { x: RING.cx + RING.r * Math.cos(a), y: RING.cy + RING.r * Math.sin(a) },
	};
});

export default defineSegment({
	id: "intention-sample-stat",
	advances: [2.4, 7.0],
	voiceover: "Over seventy products, all in one catalog.",

	mount(el) {
		host = el;
		const dots = DOTS.map(
			(d, i) => `<div data-dot="${i}" style="
          position: absolute; left: 0; top: 0; width: 8px; height: 8px; margin: -4px;
          border-radius: 50%; background: var(--color-fg);
          transform: translate(${d.field.x}px, ${d.field.y}px) scale(0);
        "></div>`,
		).join("");
		el.innerHTML = `
      <div style="position: relative; height: 100%; color: var(--color-fg); font-family: var(--font-body); overflow: hidden;">
        ${paper("intention-stat")}
        ${dots}
        <div data-ref="numeral" style="
          position: absolute; left: 0; right: 0; top: ${RING.cy}px; transform: translateY(-50%);
          text-align: center; font-family: var(--font-display); font-weight: 300;
          font-size: calc(var(--type-title) * 2.2); line-height: 1; font-variant-numeric: tabular-nums;
          opacity: 0;
        ">0</div>
        <div data-ref="cap" style="position: absolute; left: 0; right: 0; top: 920px; text-align: center; font-size: var(--type-caption); opacity: 0;">${caption("Over seventy products, all in one catalog.", [5, 6])}</div>
      </div>
    `;
	},

	async play(ctx) {
		const q = (ref: string) => host?.querySelector(`[data-ref="${ref}"]`) as HTMLElement;
		const dot = (i: number) => host?.querySelector(`[data-dot="${i}"]`) as HTMLElement;
		const style = getComputedStyle(host as HTMLElement);
		const ink = style.getPropertyValue("--color-fg").trim();
		const accent = style.getPropertyValue("--color-accent").trim();

		// A field of things arrives as a wave from the center outward.
		DOTS.forEach((d, i) => {
			const dist = Math.hypot(d.field.x - 960, d.field.y - 540);
			dot(i).animate(
				[
					{ transform: `translate(${d.field.x}px, ${d.field.y}px) scale(0)` },
					{ transform: `translate(${d.field.x}px, ${d.field.y}px) scale(1)` },
				],
				{ duration: 700, delay: dist * 1.1, fill: "forwards", easing: EASE_OUT },
			);
		});
		speak(q("cap"), ink, accent, 200);

		await ctx.waitForNext();

		// Everything flies home to one ring; the numeral counts as it forms.
		DOTS.forEach((d, i) => {
			dot(i).animate(
				[
					{ transform: `translate(${d.field.x}px, ${d.field.y}px)` },
					{ transform: `translate(${d.ring.x}px, ${d.ring.y}px)` },
				],
				{ duration: 2000, delay: (i % 12) * 30, fill: "forwards", easing: EASE_IN_OUT },
			);
		});
		const numeral = q("numeral");
		numeral.animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: 600,
			fill: "forwards",
			easing: EASE_OUT,
		});
		// Counting is a discrete text change, so it steps with ctx.hold rather than WAAPI.
		const steps = 30;
		for (let i = 1; i <= steps; i++) {
			const k = 1 - (1 - i / steps) ** 3;
			numeral.textContent = String(Math.round(k * COUNT));
			await ctx.hold(1800 / steps);
		}
		numeral.textContent = String(COUNT);
	},

	unmount() {
		host = null;
	},
});
