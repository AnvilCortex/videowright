import { defineSegment } from "videowright";
import {
	cutStamp,
	frameClose,
	frameOpen,
	runHud,
	slate,
	statusStrip,
} from "../../components/blooper-kit";

// SCENE 07 — "works in every major coding agent." The compatibility card,
// except the art department did not show up: a 404, a mystery duck, and a card
// that simply falls over.

let host: HTMLElement | null = null;

export default defineSegment({
	id: "bl-any-coding-agent",
	advances: [7.4],
	voiceover: "[BLOOPER] And Videowright works in every major coding agent— …whose logo IS that.",

	mount(el) {
		host = el;
		el.innerHTML = `
      ${frameOpen()}
      ${slate("SCENE 07 &middot; COMPAT", 5)}

      <div style="position:absolute; left:50%; top:22%; transform:translate(-50%,-50%); font-family:var(--font-display); font-size:64px; font-weight:500; color:var(--color-fg);">Works in any coding agent.</div>

      <div style="position:absolute; left:50%; top:52%; transform:translate(-50%,-50%); display:flex; gap:44px;">
        <!-- card 1: broken image -->
        <div data-ref="card-0" style="width:360px; height:400px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:26px; opacity:0;">
          <div style="width:170px; height:170px; border:2px dashed #55636f; border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:#7a8896;">
            <span style="font-size:60px;">🖼️</span>
            <span style="font-family:var(--font-mono); font-size:16px;">logo.svg (404)</span>
          </div>
          <div style="font-family:var(--font-display); font-size:34px; color:var(--color-fg);">Claude Code</div>
          <div data-ref="badge-0" style="font-family:var(--font-mono); font-size:18px; color:#ff6b6b;">SUPPORTED ✗</div>
        </div>

        <!-- card 2: mystery duck -->
        <div data-ref="card-1" style="width:360px; height:400px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:26px; opacity:0;">
          <div style="width:170px; height:170px; display:flex; align-items:center; justify-content:center; font-size:120px;" data-ref="icon-1">🦆</div>
          <div style="font-family:var(--font-display); font-size:34px; color:var(--color-fg);">Codex</div>
          <div data-ref="badge-1" style="font-family:var(--font-mono); font-size:18px; color:var(--color-muted);">is this it?</div>
        </div>

        <!-- card 3: falls over -->
        <div data-ref="card-2" style="width:360px; height:400px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:26px; opacity:0; transform-origin:bottom right;">
          <div style="width:150px; height:150px; border-radius:14px; overflow:hidden; display:flex;">
            <div style="flex:1; background:#f2b705;"></div>
            <div style="flex:1; background:#0b0f14;"></div>
          </div>
          <div style="font-family:var(--font-display); font-size:34px; color:var(--color-fg);">opencode</div>
          <div style="font-family:var(--font-mono); font-size:18px; color:#7ddc7d;">SUPPORTED ✓</div>
        </div>
      </div>

      ${statusStrip("COMPATIBILITY / ART DEPT: MISSING")}
      ${frameClose()}
    `;
	},

	async play(ctx) {
		const h = host as HTMLElement;
		const card = (i: number) => h.querySelector(`[data-ref="card-${i}"]`) as HTMLElement;

		runHud(h, ctx);
		await ctx.hold(300);

		// cards fade in one by one, each already subtly wrong
		for (let i = 0; i < 3; i++) {
			card(i).animate(
				[
					{ opacity: 0, transform: "translateY(16px)" },
					{ opacity: 1, transform: "translateY(0)" },
				],
				{ duration: 380, delay: i * 260, easing: "cubic-bezier(0.2,0.8,0.2,1)", fill: "forwards" },
			);
		}
		await ctx.hold(1400);

		// beat on the duck
		const icon1 = h.querySelector('[data-ref="icon-1"]') as HTMLElement;
		icon1.animate(
			[{ transform: "rotate(-8deg)" }, { transform: "rotate(8deg)" }, { transform: "rotate(0)" }],
			{ duration: 500 },
		);
		const badge1 = h.querySelector('[data-ref="badge-1"]') as HTMLElement;
		badge1.textContent = "SUPPOSED?";
		await ctx.hold(1200);

		// card three gives up and falls over
		card(2).animate(
			[
				{ transform: "translateY(0) rotate(0)" },
				{ transform: "translateY(60px) rotate(46deg)", offset: 0.6 },
				{ transform: "translateY(320px) rotate(92deg)", opacity: 0.4 },
			],
			{ duration: 800, easing: "cubic-bezier(0.6,0,0.9,0.5)", fill: "forwards" },
		);
		await ctx.hold(720);

		await cutStamp(h, ctx, "CUT!", { sub: "SOMEONE CALL DESIGN", holdMs: 1150 });
		await ctx.waitForNext();
	},

	unmount() {
		host = null;
	},
});
