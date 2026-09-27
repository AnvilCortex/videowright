import { defineSegment } from "videowright";
import {
	cameraShake,
	cutStamp,
	frameClose,
	frameOpen,
	runHud,
	slate,
	statusStrip,
} from "../../components/blooper-kit";

// SCENE 03 — the "any web technology" demo reel, in which every technology
// betrays us on camera. The SVG tangles, the chart goes bankrupt, the 3D rolls
// off set, the rocket noses into the ground, and the real app throws.

let host: HTMLElement | null = null;

export default defineSegment({
	id: "bl-web-tech-gallery",
	advances: [11.6],
	voiceover:
		"[BLOOPER] That includes animated SVG, any charting library, advanced 3D like Three.js or Lot— …why is the rocket going DOWN.",

	mount(el) {
		host = el;
		el.innerHTML = `
      ${frameOpen()}
      ${slate("SCENE 03 &middot; WEB TECH", 4)}

      <div data-ref="stage" style="
        position: absolute; left: 50%; top: 41%; transform: translate(-50%, -50%);
        width: 1180px; height: 520px;
        background: var(--color-surface); border: 1px solid var(--color-border);
        border-radius: 4px; overflow: hidden;
        box-shadow: 0 24px 70px rgba(0,0,0,0.5);
      ">
        <div style="position: absolute; left: 26px; top: 20px; z-index: 6; display: flex; align-items: center; gap: 12px; font-family: var(--font-mono); font-size: 26px; letter-spacing: 0.1em; color: var(--color-accent);">
          <span style="width: 12px; height: 12px; border-radius: 50%; background: var(--color-accent); box-shadow: 0 0 12px var(--color-accent);"></span>
          <span data-ref="panel-label">SVG</span>
        </div>
        <div data-ref="body" style="position: absolute; inset: 0;"></div>
      </div>

      ${statusStrip("B-ROLL / EVERYTHING IS FINE")}
      ${frameClose()}
    `;
	},

	async play(ctx) {
		const h = host as HTMLElement;
		const body = h.querySelector('[data-ref="body"]') as HTMLElement;
		const label = h.querySelector('[data-ref="panel-label"]') as HTMLElement;
		const q = (ref: string) => body.querySelector(`[data-ref="${ref}"]`) as HTMLElement;
		const setPanel = (name: string, html: string) => {
			label.textContent = name;
			body.innerHTML = html;
		};
		runHud(h, ctx);
		await ctx.hold(300);

		// ---- Panel A: SVG orbits → tangle ------------------------------------
		setPanel(
			"SVG",
			`<svg width="520" height="520" viewBox="0 0 520 520" style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);">
        <g data-ref="orbits" style="transform-origin:260px 260px;">
          <circle cx="260" cy="260" r="70"  fill="none" stroke="var(--cyan)" stroke-width="1.5" stroke-dasharray="4 7"/>
          <circle cx="260" cy="260" r="120" fill="none" stroke="var(--cyan)" stroke-width="1.5" stroke-dasharray="4 7" opacity="0.8"/>
          <circle cx="260" cy="260" r="175" fill="none" stroke="var(--color-accent)" stroke-width="1.5" stroke-dasharray="3 9" opacity="0.7"/>
          <circle cx="260" cy="90"  r="9" fill="var(--color-accent)"/>
          <circle cx="380" cy="260" r="7" fill="var(--cyan)"/>
          <circle cx="260" cy="435" r="6" fill="var(--color-fg)"/>
        </g>
      </svg>
      <div data-ref="yarn" style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); font-size:120px; opacity:0;">🧶</div>`,
		);
		const orbits = q("orbits");
		orbits.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, fill: "backwards" });
		orbits.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(36deg)" }], {
			duration: 1500,
			easing: "linear",
			fill: "forwards",
		});
		await ctx.hold(1350);
		orbits.animate(
			[{ transform: "rotate(36deg) scale(1,1)" }, { transform: "rotate(760deg) scale(0.22, 1.9)" }],
			{ duration: 650, easing: "cubic-bezier(0.6,0,0.9,0.4)", fill: "forwards" },
		);
		q("yarn").animate(
			[
				{ opacity: 0, transform: "translate(-50%,-50%) scale(0.4)" },
				{ opacity: 1, transform: "translate(-50%,-50%) scale(1)" },
			],
			{ duration: 400, delay: 350, fill: "forwards" },
		);
		cameraShake(h, 6, 300);
		await ctx.hold(650);

		// ---- Panel B: chart goes bankrupt ------------------------------------
		setPanel(
			"ECharts",
			`<div style="position:absolute; left:50%; top:58%; transform:translate(-50%,-50%); display:flex; align-items:flex-end; gap:40px; height:300px;">
        ${[150, 210, 120, 250]
					.map(
						(hgt, i) =>
							`<div style="width:74px; height:${hgt}px; display:flex; align-items:flex-end;">
              <div data-ref="bar-${i}" style="width:100%; height:100%; background:${i === 2 ? "var(--color-accent)" : "var(--cyan)"}; transform:scaleY(0); transform-origin:bottom;"></div>
            </div>`,
					)
					.join("")}
      </div>
      <div data-ref="readout" style="position:absolute; left:50%; top:22%; transform:translate(-50%,-50%); text-align:center; font-family:var(--font-mono); opacity:0;">
        <div style="font-size:22px; letter-spacing:0.16em; color:var(--color-muted);">MRR · LIVE</div>
        <div style="font-size:44px; color:#ff6b6b; font-weight:700;">−$4,000,000,000 ▲</div>
        <div style="font-size:22px; color:#7ddc7d;">📈 nice</div>
      </div>`,
		);
		for (let i = 0; i < 4; i++) {
			q(`bar-${i}`).animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], {
				duration: 520,
				delay: i * 90,
				easing: "cubic-bezier(0.2,0.8,0.2,1)",
				fill: "forwards",
			});
		}
		await ctx.hold(1150);
		// the runaway bar overshoots the top of the frame, MRR goes negative
		q("bar-2").animate([{ transform: "scaleY(1)" }, { transform: "scaleY(3.6)" }], {
			duration: 620,
			easing: "cubic-bezier(0.7,0,0.9,0.5)",
			fill: "forwards",
		});
		q("readout").animate(
			[
				{ opacity: 0, transform: "translate(-50%,-50%) translateY(8px)" },
				{ opacity: 1, transform: "translate(-50%,-50%) translateY(0)" },
			],
			{ duration: 300, delay: 260, fill: "forwards" },
		);
		cameraShake(h, 5, 260);
		await ctx.hold(700);

		// ---- Panel C: 3D rolls away + rocket crashes -------------------------
		setPanel(
			"Three.js + Lottie",
			`<svg data-ref="sphere" width="360" height="360" viewBox="0 0 360 360" style="position:absolute; left:34%; top:50%; transform:translate(-50%,-50%);">
        <g style="transform-origin:180px 180px;">
          <circle cx="180" cy="180" r="150" fill="none" stroke="var(--cyan)" stroke-width="1.5"/>
          <ellipse cx="180" cy="180" rx="150" ry="52" fill="none" stroke="var(--cyan)" stroke-width="1.2" opacity="0.7"/>
          <ellipse cx="180" cy="180" rx="150" ry="105" fill="none" stroke="var(--cyan)" stroke-width="1.2" opacity="0.5"/>
          <ellipse cx="180" cy="180" rx="52" ry="150" fill="none" stroke="var(--color-accent)" stroke-width="1.2" opacity="0.7"/>
          <ellipse cx="180" cy="180" rx="105" ry="150" fill="none" stroke="var(--color-accent)" stroke-width="1.2" opacity="0.5"/>
        </g>
      </svg>
      <div data-ref="rocket" style="position:absolute; left:70%; bottom:8%; font-size:96px; transform-origin:50% 50%;">🚀</div>
      <div data-ref="boom" style="position:absolute; left:70%; bottom:2%; font-size:120px; opacity:0;">💥</div>`,
		);
		const sphere = q("sphere");
		sphere.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "backwards" });
		// gentle wobble, then it rolls off the right edge
		sphere.animate(
			[
				{ transform: "translate(-50%,-50%) rotate(-4deg)" },
				{ transform: "translate(-50%,-50%) rotate(4deg)" },
				{ transform: "translate(-50%,-50%) rotate(-4deg)" },
			],
			{ duration: 900, easing: "ease-in-out", fill: "forwards" },
		);
		const rocket = q("rocket");
		rocket.animate(
			[{ transform: "translateY(0) rotate(0)" }, { transform: "translateY(-120px) rotate(-6deg)" }],
			{ duration: 700, easing: "ease-out", fill: "forwards" },
		);
		await ctx.hold(1050);
		// the sphere rolls away…
		sphere.animate(
			[
				{ transform: "translate(-50%,-50%) rotate(0)" },
				{ transform: "translate(520px,-50%) rotate(900deg)" },
			],
			{ duration: 800, easing: "cubic-bezier(0.5,0,0.9,0.5)", fill: "forwards" },
		);
		// …and the rocket noses straight into the deck
		rocket.animate(
			[
				{ transform: "translateY(-120px) rotate(-6deg)" },
				{ transform: "translateY(120px) rotate(178deg)" },
			],
			{ duration: 620, easing: "cubic-bezier(0.7,0,1,0.6)", fill: "forwards" },
		);
		await ctx.hold(560);
		rocket.style.opacity = "0";
		q("boom").animate(
			[
				{ opacity: 0, transform: "scale(0.3)" },
				{ opacity: 1, transform: "scale(1.1)" },
			],
			{ duration: 260, fill: "forwards" },
		);
		cameraShake(h, 12, 380);
		await ctx.hold(560);

		// ---- Panel D: the real app throws ------------------------------------
		setPanel(
			"Your React components",
			`<div data-ref="dash" style="position:absolute; inset:26px 26px 26px 26px; display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; gap:16px;">
          ${["MRR", "USERS", "CHURN"]
						.map(
							(k) =>
								`<div style="flex:1; height:96px; background:#0f1720; border:1px solid var(--color-border); border-radius:4px; padding:14px 18px;">
                <div style="font-family:var(--font-mono); font-size:16px; color:var(--color-muted); letter-spacing:0.1em;">${k}</div>
                <div style="font-family:var(--font-display); font-size:36px; color:var(--color-fg); margin-top:8px;">—</div>
              </div>`,
						)
						.join("")}
        </div>
        <div style="flex:1; background:#0f1720; border:1px solid var(--color-border); border-radius:4px;"></div>
      </div>
      <div data-ref="crash" style="position:absolute; inset:0; background:rgba(38,10,10,0.94); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; opacity:0; font-family:var(--font-mono);">
        <div style="font-size:40px; color:#ff8a8a;">⚠ Uncaught ReferenceError</div>
        <div style="font-size:32px; color:#ffb3b3;">everything is not defined</div>
        <div style="font-size:19px; color:#b98a8a;">at ./segments/web-tech-gallery/index.ts:404:12</div>
      </div>`,
		);
		const dash = q("dash");
		dash.animate(
			[
				{ opacity: 0, transform: "translateY(10px)" },
				{ opacity: 1, transform: "translateY(0)" },
			],
			{ duration: 360, fill: "backwards" },
		);
		await ctx.hold(950);
		// flicker, then crash
		dash.animate([{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }, { opacity: 0.1 }], {
			duration: 260,
			fill: "forwards",
		});
		q("crash").animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: 200,
			delay: 200,
			fill: "forwards",
		});
		cameraShake(h, 8, 320);
		await ctx.hold(750);

		await cutStamp(h, ctx, "CUT!", { sub: "FIX THE ROCKET", holdMs: 1150 });
		await ctx.waitForNext();
	},

	unmount() {
		host = null;
	},
});
