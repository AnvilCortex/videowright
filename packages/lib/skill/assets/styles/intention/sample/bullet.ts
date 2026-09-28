import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

const ITEMS = [
	"Every product, described the same way.",
	"Every team, connected.",
	"Every incident, an owner.",
	"Every question, one place to ask.",
];
// Geometry as data: the ring the dots start on, and the column they curl into.
const RING = { cx: 1060, cy: 540, r: 230, n: 8 };
const COLUMN = { x: 520, top: 330, step: 140 };

/** Paper: a soft vignette toward the paper edge and faint static grain. */
function paper(id: string) {
	return `
    <div style="position: absolute; inset: 0; background: radial-gradient(ellipse 80% 75% at 50% 45%, var(--color-bg) 55%, var(--color-paper-edge) 140%);"></div>
    <svg aria-hidden="true" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.06; mix-blend-mode: multiply; will-change: transform;">
      <filter id="${id}-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" /></filter>
      <rect width="100%" height="100%" filter="url(#${id}-grain)" />
    </svg>`;
}

/** Ring position of dot i. The left arc (i < n/2) runs top to bottom, so it curls into the column without crossing. */
function ringAt(i: number) {
	const a = Math.PI + ((RING.n / 4 - 0.5 - i) * 2 * Math.PI) / RING.n;
	return { x: RING.cx + RING.r * Math.cos(a), y: RING.cy + RING.r * Math.sin(a) };
}

/** Keyframes along a curl: the blend bows away from the ring's center, so the string opens rather than slides. */
function curl(from: { x: number; y: number }, to: { x: number; y: number }, bow: number) {
	return Array.from({ length: 9 }, (_, s) => {
		const k = s / 8;
		const x = from.x + (to.x - from.x) * k;
		const y = from.y + (to.y - from.y) * k + Math.sin(Math.PI * k) * bow;
		return { transform: `translate(${x}px, ${y}px)` };
	});
}

export default defineSegment({
	id: "intention-sample-bullet",
	advances: [2.6, 5.0, 7.0, 9.0, 12.0],
	voiceover:
		"Four things change. Every product is described the same way. Every team is connected. Every incident has an owner. And every question has one place to ask.",

	mount(el) {
		host = el;
		const dots = Array.from({ length: RING.n }, (_, i) => {
			const p = ringAt(i);
			return `<div data-dot="${i}" style="
          position: absolute; left: 0; top: 0;
          width: var(--dot); height: var(--dot); margin: calc(var(--dot) / -2);
          border-radius: 50%; background: var(--color-fg);
          transform: translate(${p.x}px, ${p.y}px) scale(0);
        "></div>`;
		}).join("");
		const labels = ITEMS.map(
			(text, i) => `<div data-label="${i}" style="
          position: absolute; left: ${COLUMN.x + 56}px; top: ${COLUMN.top + i * COLUMN.step}px;
          transform: translateY(-50%);
          font-size: calc(var(--type-label) * 1.4); line-height: 1.2; opacity: 0;
        ">${text}</div>`,
		).join("");
		el.innerHTML = `
      <div style="position: relative; height: 100%; color: var(--color-fg); font-family: var(--font-body); overflow: hidden;">
        ${paper("intention-bullet")}
        <div data-ref="rule" style="
          position: absolute; left: ${COLUMN.x - 1}px; top: ${COLUMN.top - 60}px;
          width: var(--line-hair); height: ${COLUMN.step * (ITEMS.length - 1) + 120}px;
          background: var(--color-muted); transform-origin: 50% 0; transform: scaleY(0);
        "></div>
        ${dots}${labels}
      </div>
    `;
	},

	async play(ctx) {
		const dot = (i: number) => host?.querySelector(`[data-dot="${i}"]`) as HTMLElement;
		const label = (i: number) => host?.querySelector(`[data-label="${i}"]`) as HTMLElement;
		const style = getComputedStyle(host as HTMLElement);
		const ink = style.getPropertyValue("--color-fg").trim();
		const muted = style.getPropertyValue("--color-muted").trim();
		const gold = style.getPropertyValue("--color-accent").trim();
		const opts = { fill: "forwards" as const, easing: EASE_OUT };

		// The ring arrives as a wave, then its left arc curls into the column.
		for (let i = 0; i < RING.n; i++) {
			const p = ringAt(i);
			dot(i).animate(
				[
					{ transform: `translate(${p.x}px, ${p.y}px) scale(0)` },
					{ transform: `translate(${p.x}px, ${p.y}px) scale(1)` },
				],
				{ ...opts, duration: 600, delay: i * 40 },
			);
		}
		await ctx.hold(900);
		for (let i = 0; i < RING.n; i++) {
			const p = ringAt(i);
			if (i < ITEMS.length) {
				const to = { x: COLUMN.x, y: COLUMN.top + i * COLUMN.step };
				dot(i).animate(curl(p, to, (i - (ITEMS.length - 1) / 2) * 60), {
					fill: "forwards",
					easing: EASE_IN_OUT,
					duration: 1800,
					delay: i * 60,
				});
			} else {
				// The rest of the ring shrinks away into the paper so nothing lingers beside the labels.
				dot(i).animate(
					[
						{ transform: `translate(${p.x}px, ${p.y}px) scale(1)`, opacity: 1 },
						{ transform: `translate(${p.x}px, ${p.y}px) scale(0)`, opacity: 0 },
					],
					{ ...opts, duration: 1600 },
				);
			}
		}
		host
			?.querySelector<HTMLElement>('[data-ref="rule"]')
			?.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], {
				...opts,
				duration: 1400,
				delay: 900,
			});

		for (let i = 0; i < ITEMS.length; i++) {
			await ctx.waitForNext();
			const last = i === ITEMS.length - 1;
			if (i > 0) {
				label(i - 1).animate([{ color: ink }, { color: muted }], { ...opts, duration: 600 });
			}
			label(i).animate(
				[
					{ opacity: 0, transform: "translate(12px, -50%)", color: ink },
					{ opacity: 1, transform: "translate(0, -50%)", color: last ? gold : ink },
				],
				{ ...opts, duration: 800 },
			);
			if (last) {
				dot(i).animate([{ backgroundColor: ink }, { backgroundColor: gold }], {
					...opts,
					duration: 800,
				});
			}
		}
	},

	unmount() {
		host = null;
	},
});
