import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const WORD_MS = 380;

// Geometry as data. Rings, labels, connectors and the packet are all placed from these numbers,
// so every connector ends exactly on an outline.
const NODES = [
	{ cx: 420, cy: 500, r: 72, label: "Request" },
	{ cx: 960, cy: 500, r: 72, label: "Triage" },
	{ cx: 1500, cy: 500, r: 72, label: "Owning team" },
];
const GAP = 12; // space between a connector's end and the outline it lands on
const CAPTIONS = [
	{ text: "A request arrives.", gold: [] as number[] },
	{ text: "Triage checks what it is.", gold: [] },
	{ text: "And it reaches the team that owns it.", gold: [4, 5, 6, 7] },
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

/** Endpoints of the connector from node a to node b: on the outlines, not the centers. */
function edge(a: (typeof NODES)[number], b: (typeof NODES)[number]) {
	const len = Math.hypot(b.cx - a.cx, b.cy - a.cy);
	const ux = (b.cx - a.cx) / len;
	const uy = (b.cy - a.cy) / len;
	const x1 = a.cx + ux * (a.r + GAP);
	const y1 = a.cy + uy * (a.r + GAP);
	const x2 = b.cx - ux * (b.r + GAP);
	const y2 = b.cy - uy * (b.r + GAP);
	return { x1, y1, x2, y2, length: Math.hypot(x2 - x1, y2 - y1) };
}

const EDGES = [edge(NODES[0], NODES[1]), edge(NODES[1], NODES[2])];

export default defineSegment({
	id: "intention-sample-feature",
	advances: [2.2, 5.2, 9.4],
	voiceover: "A request arrives. Triage checks what it is. And it reaches the team that owns it.",

	mount(el) {
		host = el;
		const rings = NODES.map(
			(n, i) =>
				`<circle data-ring="${i}" cx="${n.cx}" cy="${n.cy}" r="${n.r}" fill="none" stroke="currentColor" stroke-width="2"
            stroke-dasharray="${2 * Math.PI * n.r}" stroke-dashoffset="${2 * Math.PI * n.r}" transform="rotate(-90 ${n.cx} ${n.cy})" />`,
		).join("");
		const lines = EDGES.map(
			(e, i) =>
				`<line data-edge="${i}" x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="currentColor" stroke-width="2"
            stroke-dasharray="${e.length}" stroke-dashoffset="${e.length}" />`,
		).join("");
		const labels = NODES.map(
			(n, i) => `<div data-label="${i}" style="
          position: absolute; left: ${n.cx - 200}px; width: 400px; top: ${n.cy + n.r + 36}px;
          text-align: center; font-size: calc(var(--type-label) * 1.2); opacity: 0;
        ">${n.label}</div>`,
		).join("");
		const captions = CAPTIONS.map(
			(c, i) =>
				`<div data-cap="${i}" style="position: absolute; left: 0; right: 0; top: 960px; text-align: center; font-size: var(--type-caption); opacity: 0;">${caption(c.text, c.gold)}</div>`,
		).join("");
		el.innerHTML = `
      <div style="position: relative; height: 100%; color: var(--color-fg); font-family: var(--font-body); overflow: hidden;">
        ${paper("intention-feature")}
        <div data-ref="world" style="position: absolute; inset: 0; transform-origin: ${NODES[2].cx}px ${NODES[2].cy}px;">
          <div data-ref="eyebrow" style="
            position: absolute; left: 0; right: 0; top: 200px; text-align: center;
            font-size: var(--type-header); font-weight: 600;
            letter-spacing: var(--tracking-header); text-transform: uppercase; color: var(--color-muted); opacity: 0;
          ">How a request reaches the right team</div>
          <svg style="position: absolute; inset: 0; width: 1920px; height: 1080px; overflow: visible;">${rings}${lines}</svg>
          ${labels}
          <div data-ref="packet" style="
            position: absolute; left: 0; top: 0; width: var(--dot); height: var(--dot); margin: calc(var(--dot) / -2);
            border-radius: 50%; background: var(--color-fg);
            transform: translate(${NODES[0].cx}px, ${NODES[0].cy}px) scale(0);
          "></div>
        </div>
        ${captions}
      </div>
    `;
	},

	async play(ctx) {
		const q = (sel: string) => host?.querySelector(sel) as HTMLElement;
		const style = getComputedStyle(host as HTMLElement);
		const ink = style.getPropertyValue("--color-fg").trim();
		const gold = style.getPropertyValue("--color-accent").trim();
		const opts = { fill: "forwards" as const, easing: EASE_OUT };

		const drawRing = (i: number, delay = 0) => {
			q(`[data-ring="${i}"]`).animate(
				[{ strokeDashoffset: 2 * Math.PI * NODES[i].r }, { strokeDashoffset: 0 }],
				{
					...opts,
					duration: 1100,
					delay,
				},
			);
			q(`[data-label="${i}"]`).animate(
				[
					{ opacity: 0, transform: "translateY(8px)" },
					{ opacity: 1, transform: "translateY(0)" },
				],
				{ ...opts, duration: 700, delay: delay + 400 },
			);
		};
		// A hop: the line draws just ahead of the packet, and both land on the next outline.
		const hop = (i: number) => {
			const e = EDGES[i];
			q(`[data-edge="${i}"]`).animate([{ strokeDashoffset: e.length }, { strokeDashoffset: 0 }], {
				fill: "forwards",
				easing: EASE_IN_OUT,
				duration: 1500,
			});
			q('[data-ref="packet"]').animate(
				[
					{ transform: `translate(${NODES[i].cx}px, ${NODES[i].cy}px) scale(1)` },
					{ transform: `translate(${e.x1}px, ${e.y1}px) scale(1)`, offset: 0.1 },
					{ transform: `translate(${e.x2}px, ${e.y2}px) scale(1)`, offset: 0.85 },
					{ transform: `translate(${NODES[i + 1].cx}px, ${NODES[i + 1].cy}px) scale(1)` },
				],
				{ fill: "forwards", easing: EASE_IN_OUT, duration: 1800, delay: 150 },
			);
			drawRing(i + 1, 1100);
		};

		q('[data-ref="eyebrow"]').animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 900 });
		drawRing(0, 200);
		q('[data-ref="packet"]').animate(
			[
				{ transform: `translate(${NODES[0].cx}px, ${NODES[0].cy}px) scale(0)` },
				{ transform: `translate(${NODES[0].cx}px, ${NODES[0].cy}px) scale(1)` },
			],
			{ ...opts, duration: 600, delay: 900 },
		);
		speak(q('[data-cap="0"]'), ink, gold, 300);

		for (let i = 0; i < EDGES.length; i++) {
			await ctx.waitForNext();
			q(`[data-cap="${i}"]`).animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: 350,
				fill: "forwards",
			});
			hop(i);
			speak(q(`[data-cap="${i + 1}"]`), ink, gold, 400);
		}

		// The climax leans in on the arrival and holds there; the answer goes gold.
		q('[data-ref="world"]').animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }], {
			fill: "forwards",
			easing: EASE_IN_OUT,
			duration: 2800,
			delay: 600,
		});
		q('[data-ring="2"]').animate([{ stroke: ink }, { stroke: gold }], {
			...opts,
			duration: 900,
			delay: 1900,
		});
		q('[data-ref="packet"]').animate([{ backgroundColor: ink }, { backgroundColor: gold }], {
			...opts,
			duration: 900,
			delay: 1900,
		});
	},

	unmount() {
		host = null;
	},
});
