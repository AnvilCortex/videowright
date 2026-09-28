import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const WORD_MS = 380;

const HEADS = ["Product", "Application", "Team", "Service"];
const COLS = [480, 800, 1120, 1440];
const ROWS = [440, 580, 720];
const DOT_R = 7;
const GAP = 12;

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

// One seeded stream: the scattered position of each dot, then the tangles between them.
const R = rng(2013);
const DOTS = ROWS.flatMap((y, r) =>
	COLS.map((x, c) => ({
		cell: { x, y },
		field: { x: 260 + R() * 1400, y: 220 + R() * 600 },
		id: r * COLS.length + c,
	})),
);
const TANGLES = Array.from({ length: 14 }, () => {
	const a = DOTS[Math.floor(R() * DOTS.length)].field;
	const b = DOTS[Math.floor(R() * DOTS.length)].field;
	const bend = () => (R() - 0.5) * 700;
	return `M ${a.x} ${a.y} C ${a.x + bend()} ${a.y + bend()}, ${b.x + bend()} ${b.y + bend()}, ${b.x} ${b.y}`;
});

export default defineSegment({
	id: "intention-sample-grid",
	advances: [3.4, 8.2],
	voiceover: "Each part was built its own way. Now each is described the same way, and connected.",

	mount(el) {
		host = el;
		const dots = DOTS.map(
			(d) => `<div data-dot="${d.id}" style="
          position: absolute; left: 0; top: 0; width: ${DOT_R * 2}px; height: ${DOT_R * 2}px; margin: -${DOT_R}px;
          border-radius: 50%; background: var(--color-fg);
          transform: translate(${d.field.x}px, ${d.field.y}px) scale(0);
        "></div>`,
		).join("");
		const tangles = TANGLES.map(
			(d) =>
				`<path data-tangle d="${d}" fill="none" stroke="currentColor" stroke-width="1" opacity="0" pathLength="1"
          stroke-dasharray="1" stroke-dashoffset="1" />`,
		).join("");
		// Straight rules between neighbours in a row, from outline to outline.
		const rules = ROWS.flatMap((y) =>
			COLS.slice(0, -1).map(
				(x, c) =>
					`<line data-rule x1="${x + DOT_R + GAP}" y1="${y}" x2="${COLS[c + 1] - DOT_R - GAP}" y2="${y}" stroke="currentColor" stroke-width="2"
            pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" />`,
			),
		).join("");
		const heads = HEADS.map(
			(h, c) => `<div data-head style="
          position: absolute; left: ${COLS[c] - 160}px; width: 320px; top: 320px; text-align: center;
          font-size: var(--type-header); font-weight: 600; letter-spacing: var(--tracking-header);
          text-transform: uppercase; opacity: 0;
        ">${h}</div>`,
		).join("");
		el.innerHTML = `
      <div style="position: relative; height: 100%; color: var(--color-fg); font-family: var(--font-body); overflow: hidden;">
        ${paper("intention-grid")}
        <svg style="position: absolute; inset: 0; width: 1920px; height: 1080px; overflow: visible;">${tangles}${rules}</svg>
        ${heads}${dots}
        <div data-cap="0" style="position: absolute; left: 0; right: 0; top: 940px; text-align: center; font-size: var(--type-caption); opacity: 0;">${caption("Each part was built its own way.")}</div>
        <div data-cap="1" style="position: absolute; left: 0; right: 0; top: 940px; text-align: center; font-size: var(--type-caption); opacity: 0;">${caption("Now each is described the same way, and connected.", [3, 4, 5, 6])}</div>
      </div>
    `;
	},

	async play(ctx) {
		const all = (sel: string) => Array.from(host?.querySelectorAll<HTMLElement>(sel) ?? []);
		const q = (sel: string) => host?.querySelector(sel) as HTMLElement;
		const style = getComputedStyle(host as HTMLElement);
		const ink = style.getPropertyValue("--color-fg").trim();
		const gold = style.getPropertyValue("--color-accent").trim();

		// The tangle: dots scatter in, curved hairlines criss-cross between them.
		for (const d of DOTS) {
			q(`[data-dot="${d.id}"]`).animate(
				[
					{ transform: `translate(${d.field.x}px, ${d.field.y}px) scale(0)` },
					{ transform: `translate(${d.field.x}px, ${d.field.y}px) scale(1)` },
				],
				{ duration: 700, delay: d.id * 40, fill: "forwards", easing: EASE_OUT },
			);
		}
		all("[data-tangle]").forEach((path, i) => {
			path.animate(
				[
					{ strokeDashoffset: 1, opacity: 0.45 },
					{ strokeDashoffset: 0, opacity: 0.45 },
				],
				{ duration: 1600, delay: 500 + i * 70, fill: "forwards", easing: EASE_IN_OUT },
			);
		});
		speak(q('[data-cap="0"]'), ink, gold, 300);

		await ctx.waitForNext();

		// Order: tangles fade, dots settle into the grid, straight rules draw on between them.
		q('[data-cap="0"]').animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: 350,
			fill: "forwards",
		});
		for (const path of all("[data-tangle]")) {
			path.animate([{ opacity: 0.45 }, { opacity: 0 }], {
				duration: 600,
				fill: "forwards",
				easing: EASE_IN_OUT,
			});
		}
		for (const d of DOTS) {
			q(`[data-dot="${d.id}"]`).animate(
				[
					{ transform: `translate(${d.field.x}px, ${d.field.y}px)` },
					{ transform: `translate(${d.cell.x}px, ${d.cell.y}px)` },
				],
				{ duration: 1800, delay: d.id * 30, fill: "forwards", easing: EASE_IN_OUT },
			);
		}
		all("[data-rule]").forEach((line, i) => {
			line.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
				duration: 700,
				delay: 1900 + i * 60,
				fill: "forwards",
				easing: EASE_OUT,
			});
		});
		all("[data-head]").forEach((head, i) => {
			head.animate(
				[
					{ opacity: 0, transform: "translateY(8px)" },
					{ opacity: 1, transform: "translateY(0)" },
				],
				{ duration: 800, delay: 1400 + i * 120, fill: "forwards", easing: EASE_OUT },
			);
		});
		speak(q('[data-cap="1"]'), ink, gold, 400);
	},

	unmount() {
		host = null;
	},
});
