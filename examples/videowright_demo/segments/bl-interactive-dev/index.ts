import { defineSegment } from "videowright";
import {
	CLAUDE_ORANGE,
	cutStamp,
	frameClose,
	frameOpen,
	runHud,
	slate,
	statusStrip,
	typeInto,
} from "../../components/blooper-kit";

// SCENE 04 — "iterate in chat." The agent iterates, all right. Straight into
// Comic Sans, a rainbow gradient, and a cat. Hot reload → hot mess.

let host: HTMLElement | null = null;

const USER_PROMPT = "update the title card to our latest branding";

export default defineSegment({
	id: "bl-interactive-dev",
	advances: [9.6],
	voiceover:
		"[BLOOPER] Request changes in your coding agent, and the preview hot relo— …what did it DO to it.",

	mount(el) {
		host = el;
		el.innerHTML = `
      ${frameOpen()}
      ${slate("SCENE 04 &middot; HOT RELOAD", 3)}

      <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:1620px; height:600px; display:flex; gap:18px;">
        <!-- left: claude terminal -->
        <div style="flex:0 0 41%; background:#0c0c0c; border:1px solid #2a2a2a; border-radius:8px; display:flex; flex-direction:column; overflow:hidden;">
          <div style="display:flex; align-items:center; gap:9px; padding:12px 16px; background:#1c1c1c; border-bottom:1px solid #2a2a2a;">
            <div style="width:12px; height:12px; border-radius:50%; background:#ff5f57;"></div>
            <div style="width:12px; height:12px; border-radius:50%; background:#febc2e;"></div>
            <div style="width:12px; height:12px; border-radius:50%; background:#28c840;"></div>
            <div style="flex:1; text-align:center; font-family:var(--font-mono); font-size:14px; color:#999;">claude</div>
          </div>
          <div style="flex:1; padding:22px 24px; font-family:var(--font-mono); font-size:21px; line-height:1.5; color:#e5e5e5;">
            <div><span style="color:${CLAUDE_ORANGE};">&gt;</span> <span data-ref="user-prompt"></span></div>
            <div data-ref="agent-1" style="margin-top:18px; opacity:0;"><span style="color:${CLAUDE_ORANGE};">●</span> <span style="color:#e5e5e5;">On it — applying tasteful design.</span>
              <div data-ref="working" style="margin-top:10px; padding-left:26px; display:flex; gap:10px; align-items:center; font-size:18px; color:${CLAUDE_ORANGE}; opacity:0;">
                <span data-ref="spinner" style="width:1ch;"></span><span style="color:#ccc;">Applying tasteful design…</span>
              </div>
            </div>
            <div data-ref="agent-2" style="margin-top:22px; opacity:0;"><span style="color:#9fc77a;">✓</span> <span style="color:#e5e5e5;">Done! Hot-reloaded.</span> <span style="color:#888;">…that's not right, is it.</span></div>
          </div>
        </div>

        <!-- right: browser -->
        <div style="flex:1; background:#0b0f14; border:1px solid var(--color-border); border-radius:8px; display:flex; flex-direction:column; overflow:hidden; position:relative;">
          <div style="display:flex; align-items:center; gap:12px; padding:12px 16px; background:#131c25; border-bottom:1px solid var(--color-border);">
            <div style="display:flex; gap:7px;"><span style="width:11px;height:11px;border-radius:50%;background:#3a4a58;"></span><span style="width:11px;height:11px;border-radius:50%;background:#3a4a58;"></span></div>
            <div style="flex:1; background:#0b0f14; border:1px solid var(--color-border); border-radius:20px; padding:6px 16px; font-family:var(--font-mono); font-size:15px; color:var(--color-muted);">localhost:5173 · <span style="color:var(--cyan);">HMR</span></div>
          </div>
          <div data-ref="hmr" style="position:absolute; right:18px; top:64px; z-index:6; font-family:var(--font-mono); font-size:18px; font-weight:700; color:#ff6b6b; background:rgba(38,10,10,0.9); border:1px solid #ff6b6b; border-radius:4px; padding:6px 12px; opacity:0;">🔥 HOT MESS</div>
          <div data-ref="browser" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px;">
            <div style="font-family:var(--font-display); font-size:96px; font-weight:500; color:var(--color-fg);">Videowright</div>
            <div style="font-family:var(--font-display); font-size:30px; color:var(--color-muted);">Build videos in Claude Code</div>
          </div>
        </div>
      </div>

      ${statusStrip("DEV SERVER / HMR: ⚠")}
      ${frameClose()}
    `;
	},

	async play(ctx) {
		const h = host as HTMLElement;
		const opts = { fill: "forwards" as const, easing: "ease-out" };
		const userPrompt = h.querySelector('[data-ref="user-prompt"]') as HTMLElement;
		const agent1 = h.querySelector('[data-ref="agent-1"]') as HTMLElement;
		const working = h.querySelector('[data-ref="working"]') as HTMLElement;
		const spinner = h.querySelector('[data-ref="spinner"]') as HTMLElement;
		const agent2 = h.querySelector('[data-ref="agent-2"]') as HTMLElement;
		const hmr = h.querySelector('[data-ref="hmr"]') as HTMLElement;
		const browser = h.querySelector('[data-ref="browser"]') as HTMLElement;

		runHud(h, ctx);
		await ctx.hold(300);

		await typeInto(userPrompt, USER_PROMPT, ctx, 34);
		await ctx.hold(250);
		agent1.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 200 });
		await ctx.hold(350);

		working.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 150 });
		const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
		for (let i = 0; i < 15; i++) {
			if (ctx.signal.aborted) return;
			spinner.textContent = frames[i % frames.length];
			await ctx.hold(80);
		}
		working.animate([{ opacity: 1 }, { opacity: 0 }], { ...opts, duration: 120 });

		// hot reload → the agent's "tasteful" redesign lands
		hmr.animate(
			[
				{ opacity: 0, transform: "translateY(-6px)" },
				{ opacity: 1, transform: "translateY(0)" },
			],
			{ ...opts, duration: 200 },
		);
		browser.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" });
		await ctx.hold(180);
		browser.innerHTML = `
      <div style="font-family:'Comic Sans MS','Comic Sans',cursive; font-size:88px; font-weight:700; transform:rotate(-7deg);
        background:linear-gradient(90deg,#ff5f57,#febc2e,#28c840,#4fd1e0,#d97757); -webkit-background-clip:text; background-clip:text; color:transparent;">VideoWrong™</div>
      <div style="font-family:'Comic Sans MS','Comic Sans',cursive; font-size:32px; color:#ff8ad0;">the vibe agent tool ✨</div>
      <div style="font-size:78px;">🐱</div>`;
		browser.animate(
			[
				{ opacity: 0, transform: "scale(1.06)" },
				{ opacity: 1, transform: "scale(1)" },
			],
			{ duration: 260, fill: "forwards" },
		);
		await ctx.hold(700);

		agent2.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 220 });
		await ctx.hold(1500);

		await cutStamp(h, ctx, "CUT!", { sub: "REVERT. REVERT. REVERT.", holdMs: 1150 });
		await ctx.waitForNext();
	},

	unmount() {
		host = null;
	},
});
