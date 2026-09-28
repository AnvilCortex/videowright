// A file drawn as an ink outline with a folded corner, centred on (x, y).
import { svgEl } from "./index.js";

export function fileGlyph(
	svg: SVGElement,
	x: number,
	y: number,
	{ scale = 1, w = 108, h = 136 } = {},
) {
	const g = svgEl("g", svg);
	g.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
	const hw = w / 2;
	const hh = h / 2;
	const f = 30; // folded corner
	const stroke = {
		stroke: "var(--color-fg)",
		"stroke-width": 2.5,
		"stroke-linejoin": "round",
		fill: "none",
	};
	const outline = svgEl("path", g, {
		d: `M ${-hw} ${-hh} H ${hw - f} L ${hw} ${-hh + f} V ${hh} H ${-hw} Z`,
		...stroke,
	});
	const fold = svgEl("path", g, {
		d: `M ${hw - f} ${-hh} V ${-hh + f} H ${hw}`,
		...stroke,
	});
	fold.style.opacity = "0";
	return { group: g, outline, fold };
}
