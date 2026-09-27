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

// SCENE 01 — the cold open, take one. The coding agent confidently builds the
// wrong thing, and the narrator can't get through the first line. CUT.

let host: HTMLElement | null = null;

const USER_PROMPT = "I want to build a video explaining Videowright.";
const AGENT_WRONG = "Absolutely — compiling your video about video games…";

export default defineSegment({
	id: "bl-cold-open",
	advances: [10.4],
	voiceover:
		"[BLOOPER] The video you're watching and this voice were gener— *[sneezes]* — sorry, can we go from the top?",

	mount(el) {
		host = el;
		el.innerHTML = `
      ${frameOpen()}
      ${slate("SCENE 01 &middot; COLD OPEN", 1)}

      <!-- terminal window (sits above the caption) -->
      <div data-ref="terminal" style="
        position: absolute; left: 50%; top: 45%;
        width: 1480px; height: 640px;
        transform: translate(-50%, -50%);
        background: #0c0c0c; border: 1px solid #2a2a2a; border-radius: 8px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.7);
        display: flex; flex-direction: column; overflow: hidden; opacity: 0;
      ">
        <div style="display: flex; align-items: center; gap: 10px; padding: 13px 20px; background: #1c1c1c; border-bottom: 1px solid #2a2a2a;">
          <div style="width: 13px; height: 13px; border-radius: 50%; background: #ff5f57;"></div>
          <div style="width: 13px; height: 13px; border-radius: 50%; background: #febc2e;"></div>
          <div style="width: 13px; height: 13px; border-radius: 50%; background: #28c840;"></div>
          <div style="flex: 1; text-align: center; font-family: var(--font-mono); font-size: 15px; color: #999;">~/projects/videowright-demo — claude — 160×48</div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; padding: 26px 34px; font-family: var(--font-mono); color: #e5e5e5; background: #0c0c0c; overflow: hidden;">
          <div style="display: flex; align-items: flex-start; gap: 18px; padding-bottom: 16px; border-bottom: 1px dashed #2a2a2a; margin-bottom: 22px;">
            <pre style="margin: 0; font-family: var(--font-mono); font-size: 18px; line-height: 1.05; color: ${CLAUDE_ORANGE};">  ▐▛███▜▌
 ▝▜█████▛▘
   ▘▘ ▝▝</pre>
            <div style="display: flex; flex-direction: column; gap: 3px; padding-top: 3px;">
              <div style="font-size: 21px; color: ${CLAUDE_ORANGE}; font-weight: 500;">✻ Welcome to Claude Code</div>
              <div style="font-size: 17px; color: #888;">cwd: ~/projects/videowright-demo</div>
            </div>
          </div>
          <div style="flex: 1; font-size: 24px; line-height: 1.55; overflow: hidden;">
            <div><span style="color: ${CLAUDE_ORANGE};">&gt;</span> <span data-ref="user-prompt" style="color: #e5e5e5;"></span></div>
            <div data-ref="agent-1" style="margin-top: 22px; opacity: 0;">
              <span style="color: ${CLAUDE_ORANGE};">●</span>
              <span data-ref="agent-1-text" style="color: #e5e5e5;"></span>
              <div data-ref="working" style="margin-top: 12px; padding-left: 30px; display: flex; align-items: center; gap: 12px; font-size: 20px; color: ${CLAUDE_ORANGE}; opacity: 0;">
                <span data-ref="spinner" style="display: inline-block; width: 1ch;"></span>
                <span style="color: #ccc;">Rendering 4,000 frames of Mario…</span>
              </div>
            </div>
            <div data-ref="agent-2" style="margin-top: 26px; opacity: 0;">
              <span style="color: #ff6b6b;">●</span>
              <span style="color: #ff8a8a;">✗ Wait — that's not the brief.</span>
            </div>
          </div>
        </div>
      </div>

      ${statusStrip("SLATE 01 / TAKE 01")}
      ${frameClose()}
    `;
	},

	async play(ctx) {
		const terminal = host?.querySelector('[data-ref="terminal"]') as HTMLElement;
		const userPrompt = host?.querySelector('[data-ref="user-prompt"]') as HTMLElement;
		const agent1 = host?.querySelector('[data-ref="agent-1"]') as HTMLElement;
		const agent1Text = host?.querySelector('[data-ref="agent-1-text"]') as HTMLElement;
		const working = host?.querySelector('[data-ref="working"]') as HTMLElement;
		const spinner = host?.querySelector('[data-ref="spinner"]') as HTMLElement;
		const agent2 = host?.querySelector('[data-ref="agent-2"]') as HTMLElement;
		const opts = { fill: "forwards" as const, easing: "ease-out" };

		runHud(host as HTMLElement, ctx);

		await ctx.hold(400);
		terminal.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 240 });
		await ctx.hold(300);

		await typeInto(userPrompt, USER_PROMPT, ctx, 32);
		await ctx.hold(320);

		agent1.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 200 });
		agent1Text.textContent = " ";
		await typeInto(agent1Text, ` ${AGENT_WRONG}`, ctx, 20);

		// "thinking" spinner on the wrong task
		working.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 150 });
		const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
		for (let i = 0; i < 16; i++) {
			if (ctx.signal.aborted) return;
			spinner.textContent = frames[i % frames.length];
			await ctx.hold(80);
		}
		working.animate([{ opacity: 1 }, { opacity: 0 }], { ...opts, duration: 150 });

		await ctx.hold(150);
		agent2.animate(
			[
				{ opacity: 0, transform: "translateY(6px)" },
				{ opacity: 1, transform: "translateY(0)" },
			],
			{ ...opts, duration: 240 },
		);
		await ctx.hold(500);

		// The narrator can't get the first line out.
		await ctx.hold(3650);

		await cutStamp(host as HTMLElement, ctx, "CUT!", { sub: "BACK TO ONE", holdMs: 1150 });
		await ctx.waitForNext();
	},

	unmount() {
		host = null;
	},
});
