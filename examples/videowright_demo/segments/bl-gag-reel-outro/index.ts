import { defineSegment } from "videowright";
import { frameClose, frameOpen, runHud, slate, statusStrip } from "../../components/blooper-kit";

// SCENE 09 — that's a wrap. The tally of the damage, and a wink: the good take
// actually shipped.

let host: HTMLElement | null = null;

const STATS: { label: string; value: number; suffix?: string }[] = [
	{ label: "TAKES", value: 47 },
	{ label: "USABLE", value: 1 },
	{ label: '"VIDEOWRIGHT" MISPRONOUNCED', value: 12 },
	{ label: "COFFEES LOST", value: 3 },
	{ label: "ROCKETS CRASHED", value: 1 },
];

export default defineSegment({
	id: "bl-gag-reel-outro",
	advances: [8.4],
	voiceover:
		"[BLOOPER] That's a wrap. The good take actually shipped — see examples/videowright_demo. No narrators were harmed. A few were mildly embarrassed.",

	mount(el) {
		host = el;
		el.innerHTML = `
      ${frameOpen()}
      ${slate("SCENE 09 &middot; WRAP", "✓")}

      <!-- clapperboard -->
      <div style="position:absolute; left:50%; top:23%; transform:translate(-50%,-50%); display:flex; flex-direction:column; align-items:center; gap:22px;">
        <div style="position:relative; width:150px; height:120px;">
          <div data-ref="clap-arm" style="position:absolute; left:0; top:-16px; width:150px; height:26px; transform-origin:left center; transform:rotate(-24deg); background:repeating-linear-gradient(115deg, var(--color-fg) 0 12px, var(--color-bg) 12px 24px); border:1px solid var(--color-fg);"></div>
          <div style="position:absolute; left:0; top:16px; width:150px; height:104px; background:#0b0f14; border:2px solid var(--color-fg);"></div>
        </div>
        <div data-ref="wrap-title" style="font-family:var(--font-display); font-size:96px; font-weight:600; color:var(--color-fg); opacity:0;">That's a wrap.</div>
      </div>

      <div data-ref="stats" style="position:absolute; left:50%; top:57%; transform:translate(-50%,-50%); display:flex; flex-direction:column; gap:8px; width:860px;">
        ${STATS.map(
					(s, i) =>
						`<div data-ref="stat-${i}" style="display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid var(--color-border); padding-bottom:6px; opacity:0;">
            <span style="font-family:var(--font-mono); font-size:22px; letter-spacing:0.08em; color:var(--color-muted);">${s.label}</span>
            <span data-ref="statval-${i}" style="font-family:var(--font-display); font-size:36px; font-weight:700; color:${s.label === "USABLE" ? "#7ddc7d" : "var(--color-accent)"};">0</span>
          </div>`,
				).join("")}
      </div>

      <div data-ref="wink" style="position:absolute; left:50%; top:75%; transform:translate(-50%,-50%); text-align:center; opacity:0;">
        <div style="font-family:var(--font-display); font-size:32px; color:var(--color-fg);">The good take actually shipped &rarr; <span style="font-family:var(--font-mono); color:var(--cyan);">examples/videowright_demo</span></div>
        <div style="font-family:var(--font-mono); font-size:20px; color:var(--color-muted); margin-top:10px;">No narrators were harmed. A few were mildly embarrassed.</div>
      </div>

      ${statusStrip("THAT'S A WRAP, EVERYBODY")}
      ${frameClose()}
    `;
	},

	async play(ctx) {
		const h = host as HTMLElement;
		const clapArm = h.querySelector('[data-ref="clap-arm"]') as HTMLElement;
		const wrapTitle = h.querySelector('[data-ref="wrap-title"]') as HTMLElement;
		const wink = h.querySelector('[data-ref="wink"]') as HTMLElement;

		runHud(h, ctx);
		await ctx.hold(250);

		// clapper snaps shut
		clapArm.animate([{ transform: "rotate(-24deg)" }, { transform: "rotate(0deg)" }], {
			duration: 240,
			easing: "cubic-bezier(0.5,0,0.9,0.4)",
			fill: "forwards",
		});
		await ctx.hold(160);
		wrapTitle.animate(
			[
				{ opacity: 0, transform: "translateY(10px)" },
				{ opacity: 1, transform: "translateY(0)" },
			],
			{ duration: 360, easing: "cubic-bezier(0.2,0.8,0.2,1)", fill: "forwards" },
		);
		await ctx.hold(500);

		// tally counts up
		for (let i = 0; i < STATS.length; i++) {
			const row = h.querySelector(`[data-ref="stat-${i}"]`) as HTMLElement;
			const val = h.querySelector(`[data-ref="statval-${i}"]`) as HTMLElement;
			row.animate(
				[
					{ opacity: 0, transform: "translateX(-12px)" },
					{ opacity: 1, transform: "translateX(0)" },
				],
				{ duration: 260, fill: "forwards" },
			);
			const target = STATS[i].value;
			const steps = Math.min(target, 14);
			for (let s = 1; s <= steps; s++) {
				if (ctx.signal.aborted) return;
				val.textContent = String(Math.round((s / steps) * target));
				await ctx.hold(26);
			}
			val.textContent = String(target);
			val.animate([{ transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: 220 });
			await ctx.hold(180);
		}

		await ctx.hold(350);
		wink.animate(
			[
				{ opacity: 0, transform: "translateX(-50%) translateY(8px)" },
				{ opacity: 1, transform: "translateX(-50%) translateY(0)" },
			],
			{ duration: 400, fill: "forwards" },
		);

		// let the final frame breathe
		await ctx.hold(3000);
		await ctx.waitForNext();
	},

	unmount() {
		host = null;
	},
});
