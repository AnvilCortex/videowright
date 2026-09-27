// Blooper Kit — shared "gag reel" chrome used by every bl-* segment.
//
// The blooper reel's flubs are carried by the ElevenLabs voiceover track; on
// screen, each botched take is framed by a film-slate director HUD (SCENE /
// TAKE / running timecode + REC dot) and a bottom status strip, and ends with a
// rubber-stamp "CUT" slam. (No on-screen narrator subtitles — voice only.)
//
// Everything here is render-safe: WAAPI for eased motion, ctx.hold loops for
// stepped reveals, ctx.clock() for the deterministic running timecode.

// Minimal structural type for the bits of PlayerContext the kit touches. Kept
// local so the kit doesn't depend on a specific named export from the lib.
export interface KitCtx {
	hold(ms: number): Promise<void>;
	waitForNext(): Promise<void>;
	clock(): number;
	signal: AbortSignal;
	mode: "interactive" | "render";
}

export const CLAUDE_ORANGE = "#d97757";

// ---------------------------------------------------------------------------
// HTML fragments (dropped into a segment's mount() innerHTML)
// ---------------------------------------------------------------------------

/** Full-frame background: motion-engineering charcoal canvas + blueprint grid. */
export function frameOpen(): string {
	return `
    <div data-ref="bl-frame" style="
      position: relative; height: 100%;
      background: var(--color-bg);
      color: var(--color-fg);
      font-family: var(--font-body);
      overflow: hidden;
    ">
      <div style="
        position: absolute; inset: 0; pointer-events: none;
        background:
          linear-gradient(var(--grid-line) 1px, transparent 1px) 0 0 / 64px 64px,
          linear-gradient(90deg, var(--grid-line) 1px, transparent 1px) 0 0 / 64px 64px;
      "></div>`;
}

export function frameClose(): string {
	return "</div>";
}

/**
 * Director's slate HUD — a corner clapperboard chip (top-left) with the scene
 * label + a punchy TAKE counter, and a blinking REC dot + timecode (top-right).
 */
export function slate(scene: string, take: number | string): string {
	return `
    <!-- top-left clapperboard slate -->
    <div style="
      position: absolute; left: var(--safe-x); top: var(--safe-y);
      display: flex; align-items: stretch; gap: 0;
      font-family: var(--font-mono);
      border: 2px solid var(--color-fg);
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
      opacity: 0.92;
    ">
      <!-- clapper stripes -->
      <div style="
        width: 78px; align-self: stretch;
        background: repeating-linear-gradient(115deg, var(--color-fg) 0 14px, var(--color-bg) 14px 28px);
      "></div>
      <div style="padding: 12px 22px 12px 18px; background: rgba(19,28,37,0.9); display: flex; flex-direction: column; gap: 6px;">
        <div style="font-size: 15px; letter-spacing: 0.28em; color: var(--color-muted);">${scene}</div>
        <div style="font-size: 40px; font-weight: 700; letter-spacing: 0.04em; color: var(--color-accent); line-height: 1;">
          TAKE <span data-ref="take-num">${take}</span>
        </div>
      </div>
    </div>

    <!-- top-right REC + timecode -->
    <div style="
      position: absolute; right: var(--safe-x); top: var(--safe-y);
      display: flex; align-items: center; gap: 16px;
      font-family: var(--font-mono);
    ">
      <div data-ref="rec-dot" style="
        width: 20px; height: 20px; border-radius: 50%;
        background: #ff4d4d; box-shadow: 0 0 16px rgba(255,77,77,0.8);
      "></div>
      <span style="font-size: 22px; letter-spacing: 0.24em; color: #ff8a8a;">REC</span>
      <span data-ref="timecode" style="font-size: 28px; letter-spacing: 0.08em; color: var(--color-fg); min-width: 168px; text-align: right;">00:00:00</span>
    </div>`;
}

/** Blooper-flavored status strip along the bottom edge (echoes the demo HUD). */
export function statusStrip(label: string): string {
	return `
    <div style="
      position: absolute; left: var(--safe-x); right: var(--safe-x); bottom: 34px;
      display: flex; gap: 34px;
      font-family: var(--font-mono); font-size: 15px; letter-spacing: 0.12em;
      color: var(--color-muted);
    ">
      <span style="color: #ff8a8a;">&#9679; REC</span>
      <span>ISO 6400</span>
      <span>GATE OPEN</span>
      <span style="margin-left: auto;">${label}</span>
    </div>`;
}

// ---------------------------------------------------------------------------
// Behaviors (operate on the host element during play())
// ---------------------------------------------------------------------------

const q = (host: HTMLElement, ref: string) =>
	host.querySelector(`[data-ref="${ref}"]`) as HTMLElement | null;

/** Drive the REC dot blink + running SMPTE-ish timecode off the deterministic clock. */
export function runHud(host: HTMLElement, ctx: KitCtx): void {
	const dot = q(host, "rec-dot");
	const tc = q(host, "timecode");
	const tick = () => {
		if (ctx.signal.aborted) return;
		const ms = ctx.clock();
		if (tc) {
			const totalCs = Math.floor(ms / 10);
			const cs = totalCs % 100;
			const totalS = Math.floor(totalCs / 100);
			const s = totalS % 60;
			const m = Math.floor(totalS / 60);
			const p2 = (n: number) => String(n).padStart(2, "0");
			tc.textContent = `${p2(m)}:${p2(s)}:${p2(cs)}`;
		}
		if (dot) dot.style.opacity = Math.floor(ms / 500) % 2 === 0 ? "1" : "0.25";
		requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}

/** Update the TAKE counter with a quick pop. */
export function setTake(host: HTMLElement, take: number | string): void {
	const el = q(host, "take-num");
	if (!el) return;
	el.textContent = String(take);
	el.animate(
		[
			{ transform: "scale(1.9)", color: "#fff" },
			{ transform: "scale(1)", color: "var(--color-accent)" },
		],
		{ duration: 320, easing: "cubic-bezier(0.2,0.8,0.2,1)", fill: "backwards" },
	);
}

/** Type a string into an element character-by-character (stepped, render-safe). */
export async function typeInto(
	el: HTMLElement,
	text: string,
	ctx: KitCtx,
	perCharMs = 42,
): Promise<void> {
	for (let i = 0; i <= text.length; i++) {
		if (ctx.signal.aborted) return;
		el.textContent = text.slice(0, i);
		await ctx.hold(perCharMs);
	}
}

/** Quick comedic camera shake on the whole frame. */
export function cameraShake(host: HTMLElement, intensity = 10, ms = 380): void {
	const frame = q(host, "bl-frame") ?? host;
	const kf: Keyframe[] = [];
	const steps = 8;
	for (let i = 0; i <= steps; i++) {
		const decay = 1 - i / steps;
		const x = (i % 2 === 0 ? 1 : -1) * intensity * decay;
		const y = (i % 3 === 0 ? 1 : -1) * intensity * 0.6 * decay;
		const r = (i % 2 === 0 ? 1 : -1) * 0.5 * decay;
		kf.push({ transform: `translate(${x}px, ${y}px) rotate(${r}deg)` });
	}
	kf.push({ transform: "translate(0,0) rotate(0)" });
	frame.animate(kf, { duration: ms, easing: "linear" });
}

/**
 * Slam a big rubber-stamp verdict onto the frame ("CUT!", "NOPE", etc.),
 * with a shake. Resolves after it has held for `holdMs`.
 */
export async function cutStamp(
	host: HTMLElement,
	ctx: KitCtx,
	text = "CUT!",
	opts: { color?: string; holdMs?: number; sub?: string } = {},
): Promise<void> {
	const color = opts.color ?? "#ff4d4d";
	const holdMs = opts.holdMs ?? 1200;
	const stamp = document.createElement("div");
	stamp.setAttribute("data-ref", "cut-stamp");
	stamp.style.cssText = `
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -50%) rotate(-11deg);
    z-index: 40; pointer-events: none;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    padding: 26px 64px;
    border: 8px solid ${color}; border-radius: 10px;
    color: ${color};
    font-family: var(--font-display); font-weight: 800;
    letter-spacing: 0.06em; text-transform: uppercase;
    background: rgba(14,20,26,0.34);
    box-shadow: 0 0 60px rgba(0,0,0,0.5);
  `;
	stamp.innerHTML = `
    <span style="font-size: 150px; line-height: 0.9;">${text}</span>
    ${opts.sub ? `<span style="font-size: 34px; font-weight: 600; letter-spacing: 0.14em; color: var(--color-fg);">${opts.sub}</span>` : ""}
  `;
	const frame = q(host, "bl-frame") ?? host;
	frame.appendChild(stamp);

	cameraShake(host, 14, 420);
	stamp.animate(
		[
			{ transform: "translate(-50%, -50%) rotate(-11deg) scale(2.6)", opacity: 0 },
			{ transform: "translate(-50%, -50%) rotate(-11deg) scale(0.86)", opacity: 1, offset: 0.55 },
			{ transform: "translate(-50%, -50%) rotate(-11deg) scale(1)", opacity: 1 },
		],
		{ duration: 300, easing: "cubic-bezier(0.2,1.4,0.4,1)", fill: "forwards" },
	);
	await ctx.hold(holdMs);
}

/** Full-frame white "record scratch" flash — a hard cut punctuation. */
export function flashCut(host: HTMLElement): void {
	const frame = q(host, "bl-frame") ?? host;
	const flash = document.createElement("div");
	flash.style.cssText = `
    position: absolute; inset: 0; z-index: 50; pointer-events: none;
    background: #f4f7fb;`;
	frame.appendChild(flash);
	flash
		.animate([{ opacity: 0.9 }, { opacity: 0 }], {
			duration: 220,
			easing: "ease-out",
			fill: "forwards",
		})
		.finished.then(() => flash.remove())
		.catch(() => {});
}
