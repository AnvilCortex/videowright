import { defineSegment } from "videowright";
import {
	cutStamp,
	frameClose,
	frameOpen,
	runHud,
	slate,
	statusStrip,
} from "../../components/blooper-kit";

// SCENE 06 — the meta one. The narrator has to say the line about the narrator,
// and "an AI narration" turns out to be a tongue-twister. The take pitch-bends,
// the sync badge gives up.

let host: HTMLElement | null = null;

const BAR_COUNT = 42;

export default defineSegment({
	id: "bl-voiceover-sync",
	advances: [9.3],
	voiceover:
		"[BLOOPER] Your script generates an AI narration — the na-rra— the pace of the narr-a-tion — is that even a word anymore?",

	mount(el) {
		host = el;
		const scriptLines = [
			"## voiceover-sync",
			"Your script generates an AI narration.",
			"The pace of the narration drives the",
			"video timing.",
			"Edit a line and the video re-syncs.",
		];
		el.innerHTML = `
      ${frameOpen()}
      ${slate("SCENE 06 &middot; VOICEOVER", 6)}

      <div style="position:absolute; left:50%; top:41%; transform:translate(-50%,-50%); width:1560px; height:520px; display:flex; gap:22px;">
        <!-- left: the script -->
        <div style="flex:0 0 46%; background:#0b0f14; border:1px solid var(--color-border); border-radius:6px; padding:22px 26px; font-family:var(--font-mono);">
          <div style="font-size:16px; color:var(--color-muted); letter-spacing:0.1em; border-bottom:1px solid var(--color-border); padding-bottom:12px; margin-bottom:16px;">voiceover/script.md</div>
          ${scriptLines
						.map(
							(l, i) =>
								`<div data-ref="line-${i}" style="font-size:${i === 0 ? 20 : 26}px; line-height:1.5; padding:6px 12px; border-left:3px solid transparent; color:${i === 0 ? "var(--color-accent)" : "#c7d3de"};">${l}</div>`,
						)
						.join("")}
        </div>

        <!-- right: the voice meter -->
        <div style="flex:1; background:#0b0f14; border:1px solid var(--color-border); border-radius:6px; padding:22px 26px; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-family:var(--font-mono);">
            <span style="font-size:16px; color:var(--color-muted); letter-spacing:0.1em;">TAKE 06 · VOICE</span>
            <span data-ref="sync-badge" style="font-size:20px; font-weight:700; color:#7ddc7d; border:1px solid #7ddc7d; border-radius:4px; padding:4px 12px;">SYNCED ✓</span>
          </div>
          <div data-ref="wave" style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px; margin:20px 0;">
            ${Array.from({ length: BAR_COUNT })
							.map(
								() =>
									`<div data-ref="wbar" style="width:13px; height:24px; border-radius:3px; background:var(--cyan);"></div>`,
							)
							.join("")}
          </div>
          <div style="text-align:center; font-family:var(--font-mono);">
            <span data-ref="speed" style="font-size:40px; font-weight:700; color:var(--color-fg);">SPEED 1.0×</span>
          </div>
        </div>
      </div>

      ${statusStrip("VOICEOVER / IT STOPPED SOUNDING LIKE A WORD")}
      ${frameClose()}
    `;
	},

	async play(ctx) {
		const h = host as HTMLElement;
		const bars = Array.from(h.querySelectorAll('[data-ref="wbar"]')) as HTMLElement[];
		const speedLabel = h.querySelector('[data-ref="speed"]') as HTMLElement;
		const badge = h.querySelector('[data-ref="sync-badge"]') as HTMLElement;
		const line = (i: number) => h.querySelector(`[data-ref="line-${i}"]`) as HTMLElement;

		let speed = 1;
		let amp = 60;
		const highlight = (i: number) => {
			for (let k = 1; k < 5; k++) {
				const el = line(k);
				el.style.background = "transparent";
				el.style.borderLeftColor = "transparent";
				el.style.color = "#c7d3de";
			}
			const el = line(i);
			el.style.background = "rgba(255,136,0,0.14)";
			el.style.borderLeftColor = "var(--color-accent)";
			el.style.color = "var(--color-fg)";
		};

		// deterministic waveform, driven by ctx.clock()
		const tick = () => {
			if (ctx.signal.aborted) return;
			const t = ctx.clock() / 1000;
			bars.forEach((b, i) => {
				const v = Math.abs(Math.sin(t * 3 * speed + i * 0.5)) * amp;
				b.style.height = `${18 + v}px`;
			});
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);

		runHud(h, ctx);
		highlight(1);
		await ctx.hold(300);

		await ctx.hold(1500);

		// stumble one — slow it down
		speed = 0.45;
		amp = 92;
		speedLabel.textContent = "SPEED 0.5× 🐢";
		speedLabel.style.color = "var(--cyan)";
		await ctx.hold(1750);

		// stumble two — overcorrect into chipmunk
		highlight(2);
		speed = 2.6;
		amp = 44;
		speedLabel.textContent = "SPEED 2.0× 🐿️";
		speedLabel.style.color = "var(--color-accent)";
		await ctx.hold(1750);

		// gives up — desync
		speed = 1;
		amp = 22;
		speedLabel.textContent = "SPEED 1.0×";
		speedLabel.style.color = "var(--color-fg)";
		badge.textContent = "DESYNCED ✗";
		badge.style.color = "#ff6b6b";
		badge.style.borderColor = "#ff6b6b";
		badge.animate(
			[
				{ transform: "translateX(-4px)" },
				{ transform: "translateX(4px)" },
				{ transform: "translateX(0)" },
			],
			{ duration: 260 },
		);
		await ctx.hold(1900);

		await cutStamp(h, ctx, "CUT!", { sub: "HYDRATE. TAKE A BREATH.", holdMs: 1300 });
		await ctx.waitForNext();
	},

	unmount() {
		host = null;
	},
});
