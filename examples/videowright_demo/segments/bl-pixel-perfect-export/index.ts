import { defineSegment } from "videowright";
import {
	cutStamp,
	frameClose,
	frameOpen,
	runHud,
	slate,
	statusStrip,
	typeInto,
} from "../../components/blooper-kit";

// SCENE 05 — pixel-perfect export. Deterministic, frame-by-frame, and it dies
// at frame 4439 of 4440. Every time. Then the retry counts straight past the end.

let host: HTMLElement | null = null;

const CMD = "npx videowright render --output explainer.mp4";
const TOTAL = 4440;

export default defineSegment({
	id: "bl-pixel-perfect-export",
	advances: [9.8],
	voiceover:
		"[BLOOPER] One command exports your video — deterministic, pixel-perfect— …it was at NINETY-NINE percent.",

	mount(el) {
		host = el;
		el.innerHTML = `
      ${frameOpen()}
      ${slate("SCENE 05 &middot; RENDER", 2)}

      <div style="position:absolute; left:50%; top:42%; transform:translate(-50%,-50%); width:1400px; height:560px; background:#0c0c0c; border:1px solid #2a2a2a; border-radius:8px; box-shadow:0 30px 80px rgba(0,0,0,0.7); display:flex; flex-direction:column; overflow:hidden;">
        <div style="display:flex; align-items:center; gap:10px; padding:13px 20px; background:#1c1c1c; border-bottom:1px solid #2a2a2a;">
          <div style="width:13px; height:13px; border-radius:50%; background:#ff5f57;"></div>
          <div style="width:13px; height:13px; border-radius:50%; background:#febc2e;"></div>
          <div style="width:13px; height:13px; border-radius:50%; background:#28c840;"></div>
          <div style="flex:1; text-align:center; font-family:var(--font-mono); font-size:15px; color:#999;">~/explainer — videowright render</div>
        </div>
        <div style="flex:1; padding:32px 40px; font-family:var(--font-mono); font-size:26px; line-height:1.6; color:#e5e5e5;">
          <div><span style="color:var(--color-accent);">$</span> <span data-ref="cmd"></span></div>
          <div data-ref="progress-wrap" style="margin-top:34px; opacity:0;">
            <div style="display:flex; justify-content:space-between; font-size:22px; color:#9fb0c0;">
              <span>encoding frames</span>
              <span><span data-ref="frame-n">0</span> / ${TOTAL}</span>
            </div>
            <div style="margin-top:12px; height:26px; background:#141a20; border:1px solid #2a333c; border-radius:4px; overflow:hidden;">
              <div data-ref="bar" style="height:100%; width:0%; background:linear-gradient(90deg, var(--cyan), var(--color-accent));"></div>
            </div>
            <div data-ref="status-line" style="margin-top:20px; font-size:24px; color:#9fb0c0;"></div>
          </div>
        </div>
      </div>

      ${statusStrip("EXPORT / DETERMINISTIC (allegedly)")}
      ${frameClose()}
    `;
	},

	async play(ctx) {
		const h = host as HTMLElement;
		const cmd = h.querySelector('[data-ref="cmd"]') as HTMLElement;
		const wrap = h.querySelector('[data-ref="progress-wrap"]') as HTMLElement;
		const frameN = h.querySelector('[data-ref="frame-n"]') as HTMLElement;
		const bar = h.querySelector('[data-ref="bar"]') as HTMLElement;
		const status = h.querySelector('[data-ref="status-line"]') as HTMLElement;

		runHud(h, ctx);
		await ctx.hold(300);

		await typeInto(cmd, CMD, ctx, 26);
		await ctx.hold(350);
		wrap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: "forwards" });
		await ctx.hold(300);

		// climb to 99% (frame 4439 / 4440) and stall
		const STALL = TOTAL - 1; // 4439
		const steps = 46;
		for (let i = 1; i <= steps; i++) {
			if (ctx.signal.aborted) return;
			const frac = i / steps;
			const n = Math.round(frac * STALL);
			frameN.textContent = String(n);
			bar.style.width = `${((n / TOTAL) * 100).toFixed(1)}%`;
			await ctx.hold(38);
		}
		status.textContent = "⠿ finalizing…";
		await ctx.hold(1000);

		// it dies one frame from the end
		status.innerHTML = `<span style="color:#ff6b6b;">✗ render failed at frame ${STALL} / ${TOTAL} — Error: out of vibes</span>`;
		bar.style.background = "#ff5f57";
		await ctx.hold(1300);

		// the retry sails right past the finish line
		status.innerHTML = `<span style="color:#ffd27a;">↻ retrying…</span>`;
		bar.style.background = "linear-gradient(90deg, var(--cyan), var(--color-accent))";
		for (const n of [TOTAL, TOTAL + 1, TOTAL + 2, TOTAL + 3]) {
			if (ctx.signal.aborted) return;
			frameN.textContent = String(n);
			bar.style.width = "100%";
			await ctx.hold(300);
		}
		frameN.style.color = "#ff6b6b";
		status.innerHTML = `<span style="color:#ff8a8a;">…that's more frames than the video has.</span>`;
		await ctx.hold(750);

		await cutStamp(h, ctx, "CUT!", { sub: "WE DON'T TALK ABOUT FRAME 4439", holdMs: 1150 });
		await ctx.waitForNext();
	},

	unmount() {
		host = null;
	},
});
