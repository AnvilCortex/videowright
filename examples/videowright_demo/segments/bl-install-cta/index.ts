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

// SCENE 08 — the install line. The narrator can spell it now; the keyboard
// cannot. Three typos, then the coffee.

let host: HTMLElement | null = null;

type Attempt = { cmd: string; result: string; ok: boolean };
const ATTEMPTS: Attempt[] = [
	{
		cmd: "npm install videowrite",
		result: `<span style="color:#ff6b6b;">✗ 404 Not Found — 'videowrite' is not in the registry</span>`,
		ok: false,
	},
	{
		cmd: "npm install video-wright",
		result: `<span style="color:#ff6b6b;">✗ 404 Not Found — did you mean everything else</span>`,
		ok: false,
	},
	{
		cmd: "npm intall videowright",
		result: `<span style="color:#ff6b6b;">✗ Unknown command: 'intall'</span>`,
		ok: false,
	},
	{
		cmd: "npm install videowright",
		result: `<span style="color:#7ddc7d;">✓ added 1 package in 1.2s</span>`,
		ok: true,
	},
];

export default defineSegment({
	id: "bl-install-cta",
	advances: [10.2],
	voiceover:
		"[BLOOPER] Install Videowright and you'll have a video before your coffee is— …it's on the keyboard. it's on the keyboard.",

	mount(el) {
		host = el;
		el.innerHTML = `
      ${frameOpen()}
      ${slate("SCENE 08 &middot; INSTALL", 9)}

      <div style="position:absolute; left:50%; top:24%; transform:translate(-50%,-50%); font-family:var(--font-display); font-size:74px; font-weight:500; color:var(--color-fg);">Install Videowright</div>

      <div style="position:absolute; left:50%; top:52%; transform:translate(-50%,-50%); width:1180px; background:#0c0c0c; border:1px solid var(--color-accent); border-radius:8px; padding:34px 40px; box-shadow:0 24px 70px rgba(0,0,0,0.6); font-family:var(--font-mono);">
        <div style="font-size:30px; color:#e5e5e5;"><span style="color:var(--color-accent);">$</span> <span data-ref="cmd"></span><span data-ref="cursor" style="color:var(--color-accent);">▋</span></div>
        <div data-ref="result" style="margin-top:20px; font-size:26px; min-height:1.3em;"></div>
      </div>

      <!-- coffee, waiting to happen -->
      <div data-ref="coffee" style="position:absolute; right:180px; bottom:150px; font-size:90px; transform-origin:bottom center; z-index:20;">☕</div>
      <div data-ref="stain" style="position:absolute; right:60px; bottom:60px; width:520px; height:360px; border-radius:50%; background:radial-gradient(ellipse at center, rgba(94,54,30,0.92), rgba(70,38,20,0.7) 55%, rgba(70,38,20,0) 75%); transform:scale(0); transform-origin:70% 40%; z-index:10;"></div>

      ${statusStrip("INSTALL / KEEP LIQUIDS AWAY FROM SET")}
      ${frameClose()}
    `;
	},

	async play(ctx) {
		const h = host as HTMLElement;
		const cmd = h.querySelector('[data-ref="cmd"]') as HTMLElement;
		const result = h.querySelector('[data-ref="result"]') as HTMLElement;
		const coffee = h.querySelector('[data-ref="coffee"]') as HTMLElement;
		const stain = h.querySelector('[data-ref="stain"]') as HTMLElement;

		runHud(h, ctx);
		await ctx.hold(300);

		for (const a of ATTEMPTS) {
			if (ctx.signal.aborted) return;
			cmd.textContent = "";
			result.innerHTML = "";
			await typeInto(cmd, a.cmd, ctx, 30);
			await ctx.hold(280);
			result.innerHTML = a.result;
			result.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: "backwards" });
			if (!a.ok) {
				result.animate(
					[
						{ transform: "translateX(-5px)" },
						{ transform: "translateX(5px)" },
						{ transform: "translateX(0)" },
					],
					{ duration: 220 },
				);
			}
			await ctx.hold(a.ok ? 500 : 620);
		}

		// "…before your coffee is—"
		await ctx.hold(700);

		// the coffee tips
		coffee.animate([{ transform: "rotate(0)" }, { transform: "rotate(-108deg)" }], {
			duration: 420,
			easing: "cubic-bezier(0.6,0,0.9,0.4)",
			fill: "forwards",
		});
		await ctx.hold(260);
		stain.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], {
			duration: 900,
			easing: "cubic-bezier(0.3,0.7,0.3,1)",
			fill: "forwards",
		});
		await ctx.hold(1150);

		await cutStamp(h, ctx, "CUT!", { color: "#a9714a", sub: "GET PAPER TOWELS", holdMs: 1200 });
		await ctx.waitForNext();
	},

	unmount() {
		host = null;
	},
});
