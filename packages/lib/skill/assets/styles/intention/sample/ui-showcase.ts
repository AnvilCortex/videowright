import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const WORD_MS = 380;

// An abstract panel drawn in ink lines. Rows are clean bars, never fake text.
const PANEL = { x: 220, y: 210, w: 1140, h: 620, sidebar: 250 };
const ROWS = [0.62, 0.48, 0.7, 0.4, 0.55].map((width, i) => ({ width, y: PANEL.y + 190 + i * 88 }));
const FOCUS = 2; // the row the story is about
const LABEL = { x: 1470, text: "Owned by one team" };

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

const mainX = PANEL.x + PANEL.sidebar + 60;
const mainW = PANEL.w - PANEL.sidebar - 120;

export default defineSegment({
	id: "intention-sample-ui-showcase",
	advances: [3.2, 7.4],
	voiceover: "Everything we run sits in one list. And every row shows who owns it.",

	mount(el) {
		host = el;
		const sideBars = [0.7, 0.5, 0.6, 0.45]
			.map(
				(w, i) =>
					`<rect data-draw x="${PANEL.x + 40}" y="${PANEL.y + 110 + i * 70}" width="${(PANEL.sidebar - 80) * w}" height="12" rx="6" fill="currentColor" opacity="0" />`,
			)
			.join("");
		const rows = ROWS.map(
			(r, i) => `
          <circle data-row-dot="${i}" cx="${mainX + 10}" cy="${r.y}" r="7" fill="currentColor" opacity="0" />
          <rect data-row="${i}" x="${mainX + 40}" y="${r.y - 8}" width="${(mainW - 260) * r.width}" height="16" rx="8" fill="currentColor" opacity="0" />
          <rect data-row="${i}" x="${mainX + mainW - 160}" y="${r.y - 6}" width="140" height="12" rx="6" fill="currentColor" opacity="0" />`,
		).join("");
		const focusY = ROWS[FOCUS].y;
		el.innerHTML = `
      <div style="position: relative; height: 100%; color: var(--color-fg); font-family: var(--font-body); overflow: hidden;">
        ${paper("intention-ui")}
        <svg style="position: absolute; inset: 0; width: 1920px; height: 1080px; overflow: visible;">
          <rect data-ref="frame" x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.w}" height="${PANEL.h}" rx="14"
            fill="none" stroke="currentColor" stroke-width="2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" />
          <line data-ref="divider" x1="${PANEL.x + PANEL.sidebar}" y1="${PANEL.y}" x2="${PANEL.x + PANEL.sidebar}" y2="${PANEL.y + PANEL.h}"
            stroke="currentColor" stroke-width="1" opacity="0" />
          <rect data-draw x="${mainX}" y="${PANEL.y + 70}" width="${mainW * 0.35}" height="22" rx="11" fill="currentColor" opacity="0" />
          ${sideBars}${rows}
          <line data-ref="leader" x1="${mainX + mainW - 20 + 16}" y1="${focusY}" x2="${LABEL.x - 24}" y2="${focusY}"
            stroke="currentColor" stroke-width="2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" />
        </svg>
        <div data-ref="label" style="
          position: absolute; left: ${LABEL.x}px; top: ${focusY}px; transform: translateY(-50%);
          width: 360px; font-size: calc(var(--type-label) * 1.2); line-height: 1.2; opacity: 0;
        ">${LABEL.text}</div>
        <div data-cap="0" style="position: absolute; left: 0; right: 0; top: 940px; text-align: center; font-size: var(--type-caption); opacity: 0;">${caption("Everything we run sits in one list.")}</div>
        <div data-cap="1" style="position: absolute; left: 0; right: 0; top: 940px; text-align: center; font-size: var(--type-caption); opacity: 0;">${caption("And every row shows who owns it.", [4, 5, 6])}</div>
      </div>
    `;
	},

	async play(ctx) {
		const q = (sel: string) => host?.querySelector(sel) as HTMLElement;
		const all = (sel: string) => Array.from(host?.querySelectorAll<HTMLElement>(sel) ?? []);
		const style = getComputedStyle(host as HTMLElement);
		const ink = style.getPropertyValue("--color-fg").trim();
		const gold = style.getPropertyValue("--color-accent").trim();
		const opts = { fill: "forwards" as const, easing: EASE_OUT };

		// The panel draws itself on, then its parts arrive; the rows land as a wave.
		q('[data-ref="frame"]').animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
			fill: "forwards",
			easing: EASE_IN_OUT,
			duration: 1600,
		});
		q('[data-ref="divider"]').animate([{ opacity: 0 }, { opacity: 0.45 }], {
			...opts,
			duration: 800,
			delay: 900,
		});
		all("[data-draw]").forEach((bar, i) => {
			bar.animate([{ opacity: 0 }, { opacity: 0.3 }], {
				...opts,
				duration: 700,
				delay: 1100 + i * 60,
			});
		});
		ROWS.forEach((_, i) => {
			for (const part of all(`[data-row="${i}"], [data-row-dot="${i}"]`)) {
				part.animate(
					[
						{ opacity: 0, transform: "translateX(-16px)" },
						{ opacity: i === FOCUS ? 0.8 : 0.45, transform: "translateX(0)" },
					],
					{ ...opts, duration: 800, delay: 1300 + i * 90 },
				);
			}
		});
		speak(q('[data-cap="0"]'), ink, gold, 300);

		await ctx.waitForNext();

		// Highlight envelope: the focus row goes gold, the others recede, a leader lands on the label.
		q('[data-cap="0"]').animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: 350,
			fill: "forwards",
		});
		ROWS.forEach((_, i) => {
			for (const part of all(`[data-row="${i}"], [data-row-dot="${i}"]`)) {
				const frames =
					i === FOCUS
						? [
								{ opacity: 0.8, fill: ink },
								{ opacity: 1, fill: gold },
							]
						: [{ opacity: 0.45 }, { opacity: 0.18 }];
				part.animate(frames, { ...opts, duration: 900 });
			}
		});
		q('[data-ref="leader"]').animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
			...opts,
			duration: 800,
			delay: 400,
		});
		q('[data-ref="label"]').animate(
			[
				{ opacity: 0, transform: "translate(12px, -50%)" },
				{ opacity: 1, transform: "translate(0, -50%)" },
			],
			{ ...opts, duration: 800, delay: 900 },
		);
		speak(q('[data-cap="1"]'), ink, gold, 400);
	},

	unmount() {
		host = null;
	},
});
