// Dissolve: the incoming segment fades in over the outgoing one, which stays opaque underneath.
// The built-in `fade` fades both at once, so mid-way the dark player shows through both papers and
// the frame dips; here the paper never darkens. The player alternates two stacked slots, so the
// incoming one is raised first.
import type { Transition } from "videowright";

const dissolve: Transition = async (outgoing, incoming, ctx) => {
	outgoing.style.zIndex = "0";
	incoming.style.zIndex = "1";
	await incoming.animate([{ opacity: 0 }, { opacity: 1 }], {
		duration: ctx.duration ?? 600,
		easing: "cubic-bezier(0.37, 0, 0.63, 1)",
		fill: "forwards",
	}).finished;
};

export default dissolve;
