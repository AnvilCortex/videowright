import { defineSegment } from "videowright";
import {
	cameraShake,
	cutStamp,
	frameClose,
	frameOpen,
	runHud,
	setTake,
	slate,
	statusStrip,
} from "../../components/blooper-kit";

// SCENE 02 — the title card. There is exactly one word in this video and the
// narrator cannot say it. The title glitches through every wrong spelling while
// the TAKE counter climbs to twelve. Then, finally: PRINT.

let host: HTMLElement | null = null;

export default defineSegment({
	id: "bl-title-card",
	advances: [9.8],
	voiceover:
		"[BLOOPER] Video-right? Video-rite? Vid… okay — Vid-e-o-wright. …nailed it. Take twelve.",

	mount(el) {
		host = el;
		el.innerHTML = `
      ${frameOpen()}
      ${slate("SCENE 02 &middot; TITLE", 7)}

      <div data-ref="tag" style="
        position: absolute; left: 50%; top: 33%; transform: translate(-50%, -50%);
        font-family: var(--font-mono); font-size: 20px; letter-spacing: 0.3em;
        color: var(--color-accent); opacity: 0;
      ">&#9698; PRODUCT &middot; 001</div>

      <div data-ref="title" style="
        position: absolute; left: 50%; top: 45%; transform: translate(-50%, -50%);
        font-family: var(--font-display); font-size: 130px; font-weight: 500;
        letter-spacing: -0.02em; line-height: 1; white-space: nowrap; opacity: 0;
      ">Videowright</div>

      <svg data-ref="dimline" style="position: absolute; left: 50%; top: calc(45% + 96px); transform: translate(-50%, 0); overflow: visible;" width="820" height="40">
        <line x1="0" y1="20" x2="820" y2="20" stroke="var(--cyan)" stroke-width="1.5" style="transform-origin: 410px 20px; transform: scaleX(0);" data-ref="dim" />
      </svg>

      <div data-ref="subtitle" style="
        position: absolute; left: 50%; top: calc(45% + 150px); transform: translate(-50%, 0);
        font-family: var(--font-display); font-size: 34px; font-weight: 400;
        color: var(--color-muted); opacity: 0;
      ">Build videos in Claude Code</div>

      ${statusStrip("TITLE CARD / PRONUNCIATION: PENDING")}
      ${frameClose()}
    `;
	},

	async play(ctx) {
		const h = host as HTMLElement;
		const opts = { fill: "forwards" as const, easing: "cubic-bezier(0.2,0.8,0.2,1)" };
		const tag = h.querySelector('[data-ref="tag"]') as HTMLElement;
		const title = h.querySelector('[data-ref="title"]') as HTMLElement;
		const dim = h.querySelector('[data-ref="dim"]') as SVGLineElement;
		const subtitle = h.querySelector('[data-ref="subtitle"]') as HTMLElement;

		runHud(h, ctx);

		// Establish the "real" title card frame.
		tag.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 300, delay: 0 });
		title.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 360, delay: 150 });
		dim.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
			...opts,
			duration: 500,
			delay: 350,
		});
		subtitle.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 320, delay: 500 });

		const swap = (text: string, o: { size?: number; color?: string; glow?: boolean } = {}) => {
			title.textContent = text;
			title.style.fontSize = `${o.size ?? 130}px`;
			title.style.color = o.color ?? "var(--color-fg)";
			title.style.textShadow = o.glow ? "0 0 40px rgba(79,209,224,0.6)" : "none";
			title.animate(
				[
					{ opacity: 0.2, transform: "translate(-50%,-50%) skewX(9deg) scale(1.04)" },
					{ opacity: 1, transform: "translate(-50%,-50%) skewX(0) scale(1)" },
				],
				{ duration: 260, easing: "steps(4, end)", fill: "backwards" },
			);
		};

		await ctx.hold(900);

		// Attempt 1 — the hyphen problem.
		swap("Video-Wright");
		await ctx.hold(1200);

		// Attempt 2 — "-rite".
		swap("VideoRite", { color: "#ffd27a" });
		cameraShake(h, 7, 300);
		setTake(h, 8);
		await ctx.hold(1150);

		// Attempt 3 — full derailment.
		swap("Videowridge", { size: 122 });
		setTake(h, 9);
		await ctx.hold(1150);

		// Attempt 4 — the spoonerism.
		swap("Wideovright", { color: "#ffd27a" });
		cameraShake(h, 9, 320);
		setTake(h, 10);
		await ctx.hold(1150);

		// Attempt 5 — reaching.
		swap("Video Wright Bros.", { size: 96 });
		setTake(h, 11);
		await ctx.hold(1150);

		// The keeper.
		swap("Videowright", { color: "var(--cyan)", glow: true });
		setTake(h, 12);
		await ctx.hold(1350);

		await cutStamp(h, ctx, "PRINT!", { color: "#7ddc7d", sub: "finally", holdMs: 1250 });
		await ctx.waitForNext();
	},

	unmount() {
		host = null;
	},
});
