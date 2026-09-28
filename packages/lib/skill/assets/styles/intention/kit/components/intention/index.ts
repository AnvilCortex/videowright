// The Intention film kit: a paper stage with a camera, narration set as type, and the drawing
// helpers every segment shares. Coordinates are the native 1920×1080 frame. A line that joins
// things is a `link` between those things, never between coordinates, so it lands on what it names
// even while that moves. Motion is WAAPI (render-safe); links follow by requestAnimationFrame, which
// the renderer runs after each frame's animations. Tokens come from styles/intention/tokens.css.

export const W = 1920;
export const H = 1080;
export const EASE = {
	out: "cubic-bezier(0.16, 1, 0.3, 1)",
	inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
	drift: "cubic-bezier(0.37, 0, 0.63, 1)",
	in: "cubic-bezier(0.7, 0, 0.84, 0)",
};

const SVG_NS = "http://www.w3.org/2000/svg";
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.1 0 0 0 0 0.1 0 0 0 0 0.1 0 0 0 0.55 0"/></filter><rect width="240" height="240" filter="url(#n)"/></svg>',
)}")`;

export interface View {
	readonly x: number;
	readonly y: number;
	readonly zoom: number;
}

export interface Stage {
	/** Screen space: the frame itself. */
	readonly root: HTMLElement;
	/** World space under the camera: `svg` for drawing, `layer` for type, same coordinates. */
	readonly world: HTMLElement;
	readonly svg: SVGSVGElement;
	readonly layer: HTMLElement;
	readonly caption: Caption;
	/** Move the camera so world point (x, y) sits at the frame centre at `zoom`. */
	camera(to: View, opts?: { duration?: number; delay?: number; easing?: string }): void;
	/** Fade the paper to night (or back) behind everything. */
	night(on: boolean, opts?: { duration?: number; delay?: number }): void;
}

const CENTER: View = { x: W / 2, y: H / 2, zoom: 1 };
const viewTransform = (v: View) =>
	`translate(${W / 2 - v.x * v.zoom}px, ${H / 2 - v.y * v.zoom}px) scale(${v.zoom})`;

/** Build the paper stage inside a segment's host. `view` is where the camera starts. */
export function createStage(host: HTMLElement, { view = CENTER, night = false } = {}): Stage {
	host.innerHTML = "";
	const root = el("div", host, {
		position: "absolute",
		inset: "0",
		overflow: "hidden",
		background: "var(--color-bg)",
		fontFamily: "var(--font-body)",
		color: "var(--color-fg)",
	});
	const nightLayer = el("div", root, {
		position: "absolute",
		inset: "0",
		background:
			"radial-gradient(ellipse at 50% 45%, var(--color-night) 55%, var(--color-night-edge) 100%)",
		opacity: night ? "1" : "0",
	});
	const world = el("div", root, {
		position: "absolute",
		left: "0",
		top: "0",
		width: `${W}px`,
		height: `${H}px`,
		transformOrigin: "0 0",
		transform: viewTransform(view),
	});
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
	svg.setAttribute("width", String(W));
	svg.setAttribute("height", String(H));
	Object.assign(svg.style, {
		position: "absolute",
		left: "0",
		top: "0",
		overflow: "visible",
	});
	world.append(svg);
	const layer = el("div", world, { position: "absolute", inset: "0" });
	// Soft vignette and paper grain sit above the world, below the captions.
	el("div", root, {
		position: "absolute",
		inset: "0",
		pointerEvents: "none",
		background:
			"radial-gradient(ellipse at 50% 46%, transparent 58%, color-mix(in srgb, var(--color-paper-edge) 70%, transparent) 100%)",
	});
	el("div", root, {
		position: "absolute",
		inset: "0",
		pointerEvents: "none",
		backgroundImage: GRAIN,
		opacity: "0.06",
		mixBlendMode: "multiply",
	});
	const caption = createCaption(root);

	let current = view;
	return {
		root,
		world,
		svg,
		layer,
		caption,
		camera(to, { duration = 2400, delay = 0, easing = EASE.inOut } = {}) {
			world.animate([{ transform: viewTransform(current) }, { transform: viewTransform(to) }], {
				duration,
				delay,
				easing,
				fill: "both",
			});
			current = to;
		},
		night(on, { duration = 1400, delay = 0 } = {}) {
			nightLayer.animate([{ opacity: on ? 0 : 1 }, { opacity: on ? 1 : 0 }], {
				duration,
				delay,
				easing: EASE.inOut,
				fill: "both",
			});
			caption.setNight(on);
		},
	};
}

export interface Caption {
	/** Replace the current phrase: the old one fades out, the new one's words darken in turn. */
	show(text: string, opts?: { gold?: readonly string[]; y?: number; size?: number }): void;
	hide(): void;
	setNight(on: boolean): void;
}

/** Narration set as type: one phrase at a time, never two on screen, gold words for the answer. */
function createCaption(root: HTMLElement): Caption {
	const box = el("div", root, {
		position: "absolute",
		inset: "0",
		pointerEvents: "none",
	});
	let phrase: HTMLElement | null = null;
	let shown = false;
	let ink = "var(--color-fg)";
	const hide = () => {
		if (!phrase) return;
		phrase.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: 240,
			easing: EASE.inOut,
			fill: "forwards",
		});
		phrase = null;
	};
	return {
		show(text, { gold = [], y = 968, size = 40 } = {}) {
			// Phrases never overlap: a new phrase waits for the old one to fade, and a segment's first
			// phrase waits out the dissolve into the segment.
			const wait = phrase ? 240 : shown ? 0 : 420;
			shown = true;
			hide();
			phrase = el("div", box, {
				position: "absolute",
				left: "0",
				right: "0",
				top: `${y}px`,
				transform: "translateY(-50%)",
				textAlign: "center",
				fontSize: `${size}px`,
				fontWeight: "400",
				letterSpacing: "0.005em",
				color: ink,
			});
			const words = text.split(" ");
			words.forEach((word, i) => {
				const span = el("span", phrase as HTMLElement, { opacity: "0" });
				span.textContent = i < words.length - 1 ? `${word} ` : word;
				const bare = word.replace(/[^\w'-]/g, "");
				if (gold.includes(bare)) span.style.color = "var(--color-accent)";
				span.animate(
					[
						{ opacity: 0, transform: "translateY(3px)" },
						{ opacity: 0.22, transform: "translateY(2px)", offset: 0.2 },
						{ opacity: 1, transform: "translateY(0)" },
					],
					{
						duration: 520,
						delay: wait + 120 + i * 70,
						easing: EASE.out,
						fill: "forwards",
					},
				);
				span.style.display = "inline-block";
				span.style.whiteSpace = "pre";
			});
		},
		hide,
		setNight(on) {
			ink = on ? "var(--color-night-fg)" : "var(--color-fg)";
			if (phrase) phrase.style.color = ink;
		},
	};
}

/** A styled element appended to `parent`. */
export function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	parent: HTMLElement,
	style: Partial<CSSStyleDeclaration> = {},
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	Object.assign(node.style, style);
	parent.append(node);
	return node;
}

/** An SVG element appended to `parent`. */
export function svgEl<K extends keyof SVGElementTagNameMap>(
	tag: K,
	parent: SVGElement,
	attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
	const node = document.createElementNS(SVG_NS, tag);
	for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
	parent.append(node);
	return node;
}

export interface TextOpts {
	size?: number;
	weight?: number;
	color?: string;
	font?: "display" | "body" | "mono";
	align?: "center" | "left" | "right";
	tracking?: string;
	upper?: boolean;
	opacity?: number;
}

/** A line of type anchored at (x, y): centred by default, or at its left/right edge. */
export function text(layer: HTMLElement, str: string, x: number, y: number, o: TextOpts = {}) {
	const align = o.align ?? "center";
	const shift = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
	const node = el("div", layer, {
		position: "absolute",
		left: `${x}px`,
		top: `${y}px`,
		transform: `translate(${shift}, -50%)`,
		whiteSpace: "pre",
		fontFamily: `var(--font-${o.font ?? "body"})`,
		fontSize: `${o.size ?? 30}px`,
		fontWeight: String(o.weight ?? 400),
		color: o.color ?? "var(--color-fg)",
		letterSpacing: o.tracking ?? "0",
		textTransform: o.upper ? "uppercase" : "none",
		opacity: String(o.opacity ?? 0),
	});
	node.textContent = str;
	return node;
}

/** Tracked caps header, never below the style's header floor. */
export const header = (layer: HTMLElement, str: string, x: number, y: number, o: TextOpts = {}) =>
	text(layer, str, x, y, {
		size: 24,
		weight: 600,
		tracking: "var(--tracking-header)",
		upper: true,
		color: "var(--color-muted)",
		...o,
	});

/** Fade (and rise) something in. Nothing appears without motion. */
export function appear(
	node: Element,
	{
		delay = 0,
		duration = 700,
		rise = 10,
		to = 1,
	}: { delay?: number; duration?: number; rise?: number; to?: number } = {},
) {
	return node.animate(
		[
			{ opacity: 0, translate: `0 ${rise}px` },
			{ opacity: to, translate: "0 0" },
		],
		{ duration, delay, easing: EASE.out, fill: "both" },
	);
}

/** Fade something out, drifting slightly. */
export function vanish(node: Element, { delay = 0, duration = 500, from = 1 } = {}) {
	return node.animate(
		[
			{ opacity: from, translate: "0 0" },
			{ opacity: 0, translate: "0 -6px" },
		],
		{ duration, delay, easing: EASE.inOut, fill: "forwards" },
	);
}

const at = (p: [number, number], scale = 1) => `translate(${p[0]}px, ${p[1]}px) scale(${scale})`;

/**
 * Move a placed element (a `dot` or `group`) between two points, optionally scaling it. Positions
 * live in `transform`; `appear`/`vanish` use `translate`/`opacity`, so the two compose.
 */
export function travel(
	node: Element,
	from: [number, number],
	to: [number, number],
	{ delay = 0, duration = 1600, easing = EASE.inOut, scale = [1, 1] as [number, number] } = {},
) {
	return node.animate([{ transform: at(from, scale[0]) }, { transform: at(to, scale[1]) }], {
		duration,
		delay,
		easing,
		fill: "both",
	});
}

/** Fade opacity only (for things whose position is animated elsewhere). */
export function fade(node: Element, from: number, to: number, { delay = 0, duration = 600 } = {}) {
	return node.animate([{ opacity: from }, { opacity: to }], {
		duration,
		delay,
		easing: EASE.inOut,
		fill: "both",
	});
}

/** A dot centred on its own origin and placed with `transform`, so `travel` can move it. */
export function dot(svg: SVGElement, x: number, y: number, r = 7, fill = "var(--color-fg)") {
	const c = svgEl("circle", svg, { cx: 0, cy: 0, r, fill });
	c.style.transform = at([x, y]);
	return c;
}

/** An SVG group placed at (x, y) with `transform`, for things drawn around their own origin. */
export function group(svg: SVGElement, x: number, y: number) {
	const g = svgEl("g", svg);
	g.style.transform = at([x, y]);
	return g;
}

/** Stroke a path on over time (a line, arc or outline drawing itself). */
export function drawOn(
	path: SVGGeometryElement,
	{ delay = 0, duration = 900, easing = EASE.inOut, reverse = false } = {},
) {
	// A `pathLength` (as on a `link`, whose length changes as it follows) sets the dash units.
	const len = Number(path.getAttribute("pathLength")) || path.getTotalLength();
	path.style.strokeDasharray = `${len} ${len}`;
	const frames = [{ strokeDashoffset: len }, { strokeDashoffset: 0 }];
	return path.animate(reverse ? frames.reverse() : frames, {
		duration,
		delay,
		easing,
		fill: "both",
	});
}

/** Where a link meets a thing. `auto` takes the sides that face each other; `center` aims at the
 * centre and stops at the outline. */
export type Side = "auto" | "center" | "left" | "right" | "top" | "bottom";
/** One end of a link: a thing on the stage, and optionally which side of it the line meets. */
export type End = Element | { readonly node: Element; readonly side?: Side };

interface Box {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}
type Pt = [number, number];

/** A thing's box in world coordinates, as it is drawn this frame (motion, camera and all). */
function measure(s: Stage, node: Element): Box | null {
	const r = node.getBoundingClientRect();
	const world = s.world.getBoundingClientRect();
	if (!world.width || (!r.width && !r.height)) return null;
	const k = W / world.width;
	return {
		x: (r.left - world.left) * k,
		y: (r.top - world.top) * k,
		w: r.width * k,
		h: r.height * k,
	};
}

const mid = (b: Box): Pt => [b.x + b.w / 2, b.y + b.h / 2];
const sidePoint = (b: Box, side: Side): Pt =>
	side === "left"
		? [b.x, b.y + b.h / 2]
		: side === "right"
			? [b.x + b.w, b.y + b.h / 2]
			: side === "top"
				? [b.x + b.w / 2, b.y]
				: side === "bottom"
					? [b.x + b.w / 2, b.y + b.h]
					: mid(b);

const NORMAL: Partial<Record<Side, Pt>> = {
	left: [-1, 0],
	right: [1, 0],
	top: [0, -1],
	bottom: [0, 1],
};

/** Where the ray from the box's centre toward `to` leaves the box. */
function outline(b: Box, to: Pt): Pt {
	const [cx, cy] = mid(b);
	const dx = to[0] - cx;
	const dy = to[1] - cy;
	const t = Math.min(
		dx ? b.w / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY,
		dy ? b.h / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY,
	);
	return Number.isFinite(t) ? [cx + dx * t, cy + dy * t] : [cx, cy];
}

/** The sides of `a` and `b` that face each other, across the wider gap between them. */
function facing(a: Box, b: Box): [Side, Side] {
	const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
	const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
	if (gapX >= gapY) return b.x > a.x ? ["right", "left"] : ["left", "right"];
	return b.y > a.y ? ["bottom", "top"] : ["top", "bottom"];
}

/** The two points a link runs between, before its gaps. */
function ends(a: Box, sa: Side, b: Box, sb: Side): [Pt, Pt] {
	if (sa === "center" || sb === "center") {
		const ta = sidePoint(a, sa);
		const tb = sidePoint(b, sb);
		return [sa === "center" ? outline(a, tb) : ta, sb === "center" ? outline(b, ta) : tb];
	}
	let pa = sidePoint(a, sa);
	let pb = sidePoint(b, sb);
	// Facing sides that overlap across the line run straight, through the middle of the overlap.
	const across = (s: Side) => (s === "left" || s === "right" ? "x" : "y");
	if (across(sa) === across(sb)) {
		const [lo, hi] =
			across(sa) === "x"
				? [Math.max(a.y, b.y), Math.min(a.y + a.h, b.y + b.h)]
				: [Math.max(a.x, b.x), Math.min(a.x + a.w, b.x + b.w)];
		if (hi > lo) {
			const m = (lo + hi) / 2;
			pa = across(sa) === "x" ? [pa[0], m] : [m, pa[1]];
			pb = across(sa) === "x" ? [pb[0], m] : [m, pb[1]];
		}
	}
	return [pa, pb];
}

/** How a line runs: `straight`; `elbow`, out along one axis with one turn and in along the other; or
 * `step`, out, across and in, like an org chart or a bracket. Right-angle corners are rounded. */
export type Route = "straight" | "elbow" | "step";

export interface RouteOpts {
	/** Space between each end and its thing's outline. */
	readonly gap?: number;
	readonly route?: Route;
	/** `step`: where the crossing sits, as a fraction of the way from a to b… */
	readonly mid?: number;
	/** …or as px out from a (overrides `mid`; lines from one thing that share it share a trunk)… */
	readonly turn?: number;
	/** …or as px out from b (lines into one thing that share it merge into one trunk). */
	readonly turnIn?: number;
	/** `elbow`: leave a vertically and enter b from the side, instead of the reverse. */
	readonly flip?: boolean;
	/** Corner radius of right-angle routes. */
	readonly radius?: number;
	/** `straight`: curve it, px to the right of the a→b direction. */
	readonly bend?: number;
}

const endOf = (e: End): [Element, Side] =>
	e instanceof Element ? [e, "auto"] : [e.node, e.side ?? "auto"];
const horizontal = (side: Side) => side === "left" || side === "right";
const push = (pt: Pt, side: Side, gap: number): Pt => {
	const [nx, ny] = NORMAL[side] ?? [0, 0];
	return [pt[0] + nx * gap, pt[1] + ny * gap];
};

/** Replace each interior corner of a right-angle polyline with a short quadratic arc. */
function roundCorners(pts: Pt[], r: number): Pt[] {
	const out: Pt[] = [pts[0]];
	for (let i = 1; i < pts.length - 1; i++) {
		const [p, v, q] = [pts[i - 1], pts[i], pts[i + 1]];
		const l1 = Math.hypot(v[0] - p[0], v[1] - p[1]);
		const l2 = Math.hypot(q[0] - v[0], q[1] - v[1]);
		const rr = Math.min(r, l1 / 2, l2 / 2);
		if (rr < 0.5) {
			out.push(v);
			continue;
		}
		const a: Pt = [v[0] + ((p[0] - v[0]) / l1) * rr, v[1] + ((p[1] - v[1]) / l1) * rr];
		const b: Pt = [v[0] + ((q[0] - v[0]) / l2) * rr, v[1] + ((q[1] - v[1]) / l2) * rr];
		for (let k = 0; k <= 6; k++) {
			const u = k / 6;
			const m = 1 - u;
			out.push([
				m * m * a[0] + 2 * m * u * v[0] + u * u * b[0],
				m * m * a[1] + 2 * m * u * v[1] + u * u * b[1],
			]);
		}
	}
	out.push(pts[pts.length - 1]);
	return out;
}

/** The polyline a line follows between two boxes, gaps applied, corners rounded. */
function routeBetween(a: Box, sa: Side, b: Box, sb: Side, o: RouteOpts): Pt[] {
	const { gap = 14, route = "straight", mid: m = 0.5, turn, turnIn, flip = false, radius = 14 } = o;
	const [fa, fb] = facing(a, b);
	if (route === "straight") {
		const ra = sa === "auto" ? fa : sa;
		const rb = sb === "auto" ? fb : sb;
		const [p, q] = ends(a, ra, b, rb);
		const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
		const u: Pt = [(q[0] - p[0]) / len, (q[1] - p[1]) / len];
		// Each end stands `gap` off its outline: straight out from a side, or back along the line.
		const p0: Pt = ra === "center" ? [p[0] + u[0] * gap, p[1] + u[1] * gap] : push(p, ra, gap);
		const p1: Pt = rb === "center" ? [q[0] - u[0] * gap, q[1] - u[1] * gap] : push(q, rb, gap);
		return [p0, p1];
	}
	const [ca, cb] = [mid(a), mid(b)];
	if (route === "elbow") {
		// One turn: out of a along one axis, into b along the other.
		const ra: Side =
			sa !== "auto" && sa !== "center"
				? sa
				: flip
					? cb[1] > ca[1]
						? "bottom"
						: "top"
					: cb[0] > ca[0]
						? "right"
						: "left";
		const rb: Side =
			sb !== "auto" && sb !== "center"
				? sb
				: horizontal(ra)
					? ca[1] < cb[1]
						? "top"
						: "bottom"
					: ca[0] < cb[0]
						? "left"
						: "right";
		const p0 = push(sidePoint(a, ra), ra, gap);
		const p1 = push(sidePoint(b, rb), rb, gap);
		const corner: Pt = horizontal(ra) ? [p1[0], p0[1]] : [p0[0], p1[1]];
		return roundCorners([p0, corner, p1], radius);
	}
	// Step: out, across, in.
	const ra: Side = sa !== "auto" && sa !== "center" ? sa : fa;
	const rb: Side = sb !== "auto" && sb !== "center" ? sb : fb;
	const p0 = push(sidePoint(a, ra), ra, gap);
	const p1 = push(sidePoint(b, rb), rb, gap);
	const [nx, ny] = NORMAL[ra] ?? [0, 0];
	const [mx, my] = NORMAL[rb] ?? [0, 0];
	const along = (i: 0 | 1, n: number, nIn: number) =>
		turnIn !== undefined
			? p1[i] + nIn * turnIn
			: turn !== undefined
				? p0[i] + n * turn
				: p0[i] + (p1[i] - p0[i]) * m;
	if (horizontal(ra)) {
		const x = along(0, nx, mx);
		return roundCorners([p0, [x, p0[1]], [x, p1[1]], p1], radius);
	}
	const y = along(1, ny, my);
	return roundCorners([p0, [p0[0], y], [p1[0], y], p1], radius);
}

const toPath = (pts: Pt[]) => `M ${pts.map(([x, y]) => `${x} ${y}`).join(" L ")}`;

/** The point a fraction `k` of the way along a polyline. */
function pointAt(pts: Pt[], k: number): Pt {
	const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
	let left = Math.max(0, Math.min(1, k)) * lens.reduce((sum, l) => sum + l, 0);
	for (const [i, l] of lens.entries()) {
		if (left <= l && l > 0) {
			const u = left / l;
			return [
				pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u,
				pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u,
			];
		}
		left -= l;
	}
	return pts[pts.length - 1];
}

/** Run `update` every frame while `node` is on the stage. */
function follow(node: Element, update: () => void) {
	const tick = () => {
		if (!node.isConnected) return;
		update();
		requestAnimationFrame(tick);
	};
	update();
	requestAnimationFrame(tick);
}

/** A thing's centre in world coordinates, where it is drawn now. */
export function centre(s: Stage, node: Element): Pt {
	const b = measure(s, node);
	return b ? mid(b) : [W / 2, H / 2];
}

/**
 * A line between two things, never two points. Every frame it measures both things where they are
 * drawn and meets their outlines, so it stays attached while they move and can't point at a spot
 * something has left. It fades with its ends: if either end is invisible, so is the line. Runs
 * straight, or at right angles (`route`). Draw it on with `drawOn`.
 */
export function link(
	s: Stage,
	a: End,
	b: End,
	{
		stroke = "var(--color-fg)",
		width = 2,
		...route
	}: RouteOpts & { stroke?: string; width?: number } = {},
): SVGPathElement {
	const [na, sa] = endOf(a);
	const [nb, sb] = endOf(b);
	// The wrapper carries the ends' visibility; the path's own opacity stays free for `fade`.
	const wrap = svgEl("g", s.svg);
	const path = svgEl("path", wrap, {
		stroke,
		"stroke-width": width,
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		fill: "none",
		pathLength: 1,
	});
	const shown = (node: Element) => Number(getComputedStyle(node).opacity);
	follow(path, () => {
		const ba = measure(s, na);
		const bb = measure(s, nb);
		if (!ba || !bb) {
			wrap.style.opacity = "0";
			return;
		}
		const pts = routeBetween(ba, sa, bb, sb, route);
		const bend = route.route === "straight" || !route.route ? (route.bend ?? 0) : 0;
		if (bend && pts.length === 2) {
			const [[x0, y0], [x1, y1]] = pts;
			const len = Math.hypot(x1 - x0, y1 - y0) || 1;
			const c: Pt = [
				(x0 + x1) / 2 - ((y1 - y0) / len) * bend,
				(y0 + y1) / 2 + ((x1 - x0) / len) * bend,
			];
			path.setAttribute("d", `M ${x0} ${y0} Q ${c[0]} ${c[1]} ${x1} ${y1}`);
		} else path.setAttribute("d", toPath(pts));
		wrap.style.opacity = String(Math.min(shown(na), shown(nb)));
	});
	return path;
}

/** A 0→1 clock driven by WAAPI, so it pauses, seeks and renders with everything else. */
function clock(parent: SVGElement, delay: number, duration: number, easing: string) {
	const c = svgEl("g", parent);
	c.animate([{ opacity: 0 }, { opacity: 1 }], { delay, duration, easing, fill: "both" });
	return () => Number(getComputedStyle(c).opacity);
}

/**
 * A tracer: a bright head runs from one thing to another along a route measured live, like a link.
 * The line it leaves erases from behind once the head is past half-way, and the head lands with a
 * small expanding ring. `until` < 1 stops it part-way (a failed run); with `erase: false` its line
 * stays. Returns the line and head, so a failure can turn them red.
 */
export function trace(
	s: Stage,
	a: End,
	b: End,
	{
		delay = 0,
		duration = 1400,
		stroke = "var(--color-fg)",
		width = 2,
		until = 1,
		erase = true,
		...route
	}: RouteOpts & {
		delay?: number;
		duration?: number;
		stroke?: string;
		width?: number;
		until?: number;
		erase?: boolean;
	} = {},
): { line: SVGPathElement; head: SVGCircleElement } {
	const [na, sa] = endOf(a);
	const [nb, sb] = endOf(b);
	const wrap = svgEl("g", s.svg);
	const line = svgEl("path", wrap, {
		stroke,
		"stroke-width": width,
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		fill: "none",
		pathLength: 1,
	});
	const head = svgEl("circle", wrap, { r: 4.5, fill: stroke });
	const ring = svgEl("circle", wrap, { fill: "none", stroke, "stroke-width": 1.5 });
	const run = clock(wrap, delay, duration, EASE.inOut);
	const tail = erase ? clock(wrap, delay + duration * 0.55, duration * 0.9, EASE.inOut) : () => 0;
	const landing = clock(wrap, delay + duration, 600, EASE.out);
	follow(line, () => {
		const ba = measure(s, na);
		const bb = measure(s, nb);
		if (!ba || !bb) return;
		const pts = routeBetween(ba, sa, bb, sb, route);
		line.setAttribute("d", toPath(pts));
		const k1 = run() * until;
		const k0 = Math.min(tail(), k1);
		line.style.strokeDasharray = `${k1 - k0} 2`;
		line.style.strokeDashoffset = String(-k0);
		const [hx, hy] = pointAt(pts, k1);
		head.setAttribute("transform", `translate(${hx} ${hy})`);
		head.style.opacity = String(k1 > 0 ? 1 - tail() : 0);
		const e = until >= 1 ? landing() : 0;
		ring.setAttribute("transform", `translate(${hx} ${hy})`);
		ring.setAttribute("r", String(4 + e * 10));
		ring.style.opacity = String(e > 0 && e < 1 ? 1 - e : 0);
	});
	return { line, head };
}

export interface CodeLine {
	readonly node: HTMLElement;
	/** Warm this line to the accent (the part the narration names). */
	mark(opts?: { delay?: number }): void;
	/** Return a marked line to ink. */
	unmark(opts?: { delay?: number }): void;
}

/**
 * Monospace lines set left-aligned from (x, y). Tokens in `‹…›` render muted: placeholders the
 * viewer fills in. Each line starts hidden; reveal with `appear`.
 */
export function code(
	layer: HTMLElement,
	lines: readonly string[],
	x: number,
	y: number,
	{ size = 30, leading = 1.55 } = {},
): CodeLine[] {
	return lines.map((line, i) => {
		const node = el("div", layer, {
			position: "absolute",
			left: `${x}px`,
			top: `${y + i * size * leading}px`,
			transform: "translateY(-50%)",
			fontFamily: "var(--font-mono)",
			fontSize: `${size}px`,
			whiteSpace: "pre",
			color: "var(--color-fg)",
			opacity: "0",
			padding: "2px 10px",
			marginLeft: "-10px",
			borderRadius: "4px",
		});
		node.innerHTML = line
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/‹([^›]*)›/g, '<span style="color: var(--color-muted)">$1</span>');
		const tint = (on: boolean, delay = 0) =>
			node.animate(
				[
					{
						backgroundColor: on
							? "transparent"
							: "color-mix(in srgb, var(--color-accent) 18%, transparent)",
					},
					{
						backgroundColor: on
							? "color-mix(in srgb, var(--color-accent) 18%, transparent)"
							: "transparent",
					},
				],
				{ duration: 600, delay, easing: EASE.out, fill: "forwards" },
			);
		return {
			node,
			mark: ({ delay = 0 } = {}) => tint(true, delay),
			unmark: ({ delay = 0 } = {}) => tint(false, delay),
		};
	});
}

/** Polar point around (cx, cy). Angle in degrees, 0 at twelve o'clock, clockwise. */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
	const a = ((deg - 90) * Math.PI) / 180;
	return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
