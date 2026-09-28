---
title: Intention
slug: intention
picker_description: 'Calm, typographic explainer film. Ink on paper, one gold accent for the answer, narration set as type.'
font_sources:
  - https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600&display=swap
  - https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap
mood: [calm, considered, typographic, physical, quietly confident]
good_for:
  - How a system works, or how something gets from A to B
  - Incident reviews and "what happened" films
  - Internal explainers for busy, non-specialist audiences
  - Proposals that need one clear picture of why it matters
  - A series of short narrated films that should feel like one family
bad_for:
  - Product demos that must show a real interface (use a style made from that interface)
  - Hype reels, sizzle videos, fast social cuts
  - Silent videos (the narration carries this style)
  - Dense dashboards where every number must be read
tags: [narrated, minimal, typographic, paper, light-mode, explainer]
references: ["Apple's WWDC 2013 'Intention' film", "Designed by Apple in California", Swiss typographic posters]
---

# Intention — STYLE.md

Agent-facing guide. Read this before writing the script or composing segments.

## Identity

Calm narration over minimal, typographic, physically motivated motion, in the manner of Apple's WWDC 2013 "Intention" film. Ink on warm paper. Dots, lines and rings stand for things; they gather, tangle, untangle and settle as the narration explains. The narration is also set as type. Colour is sparing and always stands for something: gold for the answer, and the product's own colours where the film shows what the product shows.

These are explainers, not pitch decks. They are made for someone busy who is not a specialist, unless the brief says otherwise. A film succeeds when that person can answer its question afterwards without having taken notes.

**Mood:** calm, considered, typographic, physical, quietly confident.

## When to use

- How a system works, or how something gets from one place to another
- What happened in an incident, and what changed afterwards
- Why a proposal matters
- Any narrated explainer that should feel crafted rather than presented

## When to avoid

- A demo that must show a real product interface: build a style from that interface instead
- Hype reels, sizzle videos, anything fast or loud
- Silent videos: without narration this style reads as empty

## Story

**One question per film, in the viewer's words** ("How does a request reach the right team?", "What happened on the 14th, and could it happen again?"). The title names it; the last line lands the answer. Anything that does not serve that answer is cut, however true. A second question is a second film.

Pick the shape that fits the question and keep its order:

- **How something works** (a system, a process, a scorecard): the familiar difficulty → the one idea that brings order → what it makes possible → one resolving image.
- **How something gets from A to B** (data into a system, a request through a pipeline): where it starts → each hand-off, in order, with what is checked or changed there → where it arrives and who sees it → what to do when it doesn't arrive. Show the thing travelling; one continuous path beats a sequence of diagrams.
- **What happened** (an incident review): the normal state → what the viewer would have seen (impact first, in plain terms and real times) → how it was noticed and handled → why it happened, separating the trigger from the underlying cause and the contributing factors → what has changed so it doesn't recur. Blameless: systems and decisions, never people; role words only ("the on-call engineer"). Times, durations and impact come from the incident record, exactly. End on the change, not the failure.
- **Why it matters** (a proposal, a gap): what people rely on today → what they can't see or do → what becomes possible → the picture of it working.

**Length:** 60–90 seconds, 150–220 spoken words. Longer material becomes a series.

**Facts are pulled, never typed.** Numbers, times and names come from a source or a document the user gave. When a figure is illustrative, the brief says so and it looks like a shape (a bar, a dot), not a believable number.

## Script: write for the ear

- Short sentences, concrete nouns, present tense. One idea per sentence.
- A term the audience may not know is shown before it is named, or not used.
- Numbers: speak rounded words ("over seventy", "about forty minutes"); show the exact figure on screen.
- People: role words, never names.
- Each paragraph is one beat of the story, 1–4 sentences, and ends at a `[[pause]]` marker in the provider script. Leave 1–3 s between paragraphs so the picture can breathe.
- For ElevenLabs v3, give each paragraph a delivery tag: `[calm, warm, unhurried]`, `[calm, thoughtful]`, `[calm, reassuring]`. At most one heightened tag in the film (`[with quiet wonder]`, `[softly]`), at its peak.

## What never goes on screen

Unless the user explicitly allows it for this film:

- Personal names, emails or photos; customer names and logos.
- Revenue, pricing, contract or salary figures.
- Security findings, vulnerabilities, credentials, account IDs, internal URLs and hostnames.
- Anything the source material marks as not for display.

## Layout principles

- **Negative space is the canvas.** This style overrides the fill-the-frame default: most scenes hold one idea in a field of paper. The *type* never shrinks to compensate. It stays at the floors below.
- **One focal thing per moment.** A dot, a ring, a line of type. Everything else recedes to muted ink or leaves.
- **Things are dots, lines and rings.** A system is a ring, a thing is a dot, a hand-off is a line. Clean bars suggest data; never placeholder blocks of fake text, which read as rendering errors.
- **Connectors land on things.** Every line, tracer and packet ends on something drawn at that moment, on its outline, not in empty space. Keep node geometry as data (`cx`, `cy`, `r`) and compute each connector's endpoints from it.
- **Centered compositions** for statements and the title; asymmetric only when a diagram needs the room (caption then sits `LEFT` or `BOTTOM`).

## Color application

- **Ink on paper for structure** (`--color-fg` on `--color-bg`). Muted ink (`--color-muted`) for what recedes; faint ink (`--color-faint`) for texture and hairlines.
- **Night for the "before" or a reveal** (`--color-night`, ink becomes `--color-night-fg`). Move to night and back with a slow cross-fade of the background, never a hard cut.
- **Gold (`--color-accent`) only for the value in the story:** the answer, the fix, what is gained. Also caption emphasis. Once or twice in a film.
- **Red (`--color-alert`) for what the product marks red,** and for failure and impact: a flag, a hit, an alert, a failed run. If the viewer will see it red in the product, show it red here. Never for emphasis.
- **Brand colours, strategically.** Where the film shows the product, use its semantic colours (flags, statuses, the brand accent on the brand itself) so the film matches what viewers will see. Add them to the project's tokens (for example `--color-brand`) and give each one meaning for the whole film.
- No decorative colour: nothing coloured that doesn't stand for something, no gradients, no drop shadows, no glass.

## Type rules

- **Source Sans 3** throughout. Weight 300 for the title and statements, 400 for captions and labels, 600 for tracked-caps headers.
- **Source Code Pro** only when the film shows a command or a file name.
- **Legibility floors** at 1080p, after any camera zoom (`tokens.css`): title 120px, statement 72px, heading 56px, caption 40px, label 30px, header 24px tracked caps. Reviews flag anything smaller as unreadable on a laptop.
- **Below the floor is noise.** Make it legible, or make it plainly texture (dots, bars); never tiny words.
- Sentence case. Tracked uppercase only for headers.

## Captions: narration set as type

- One phrase at a time, split at the narrator's pauses, under ~60 characters.
- The phrase fades in faint (20% ink); each word darkens to full ink as it is spoken. Gold words warm to the accent.
- Phrases never overlap: the previous one fades out before the next fades in. That holds across a change of scene too: a segment's first phrase waits out the transition, or it lands beside the outgoing phrase.
- Position: `BOTTOM` (y ≈ 990) over busy scenes, `LOW` (y ≈ 640) or `CENTER` over empty ones, `LEFT` when the scene sits right.
- Captions follow the spoken words exactly. Word lighting runs at the narrator's pace (about 380 ms per word) from the beat's `waitForNext()`.

## Continuity

- **Nothing pops in or out without motion.** Things grow from a point, draw on, travel in, fold or curl into the next shape. Anything that vanishes instantly reads as a jump cut.
- **A thing keeps its identity.** The dot that is a service in the chaos is the same dot in the diagram and in the ending. In Videowright, hand a shape from one segment to the next by ending the first segment with the shape exactly where the next one starts it, and join them with the `cut` transition. It reads as one continuous motion. For a real change of scene, dissolve: fade the incoming segment in over the outgoing one, which stays opaque. The built-in `fade` fades both at once, so mid-way the dark player shows through both papers and the frame dips toward black. The kit's `transitions/dissolve.ts` does this: it raises the incoming slot (the player alternates two stacked slots) and animates only its opacity, 600 ms.
- **Paper stays paper.** A soft vignette toward `--color-paper-edge` and faint static grain sit under every paper scene.

## Motion principles

- **Arrivals:** fast in, long settle (`--ease-out`, 600–1800 ms). No bounce, no overshoot, no elastic.
- **Purposeful moves:** `--ease-in-out`, 1.4–3.6 s.
- **Camera:** slow drifts (scale 1 → ~1.04, 5–9 s, `--ease-drift`) between purposeful moves. Lean in at the climax and hold there.
- **Pacing:** a beat lands 0.05–0.3 s before the word that names it. Gate it with `waitForNext()` so the voiceover timing moves it. The end card holds 4–5 s.
- **Stagger** many small things at `--stagger` (40 ms); a field of dots arrives as a wave, not all at once.

## Motion vocabulary

| Move | How |
|---|---|
| **Title reveal** | Letters close from wide tracking (≈ +10px → −1.5px) while the line rises ~8px and fades in; 0.9 s fade, 2.2 s tracking. |
| **Single dot** | The film's first "thing": scales from 0 at the center with a soft tick. |
| **Scatter / converge** | A cluster bursts into a field (`--ease-out`, staggered), or a field flies home to one ring. Positions from a seeded random generator, never `Math.random()`. |
| **Tangle → order** | Curved hairlines criss-cross between scattered dots; on the beat they fade as the dots settle into rows and straight rules draw on. |
| **Ring ↔ column curl** | A string of dots travels along a curve from a ring into a column (or back) without crossing: interpolate each dot's position through intermediate keyframes, not a straight line. |
| **Tracer / packet** | A small dot travels a connector path; the line draws just ahead of it. Slow enough to track: the eye must see where it starts. |
| **Right-angle routes** | Connectors may run straight or at right angles: an elbow (out along one axis, one turn, in along the other) or a step (out, across, in, like an org chart or a bracket), corners softly rounded (~14px). Several tracers on stepped routes at once trace nested squares; that pattern suits things travelling from many places to one (hits to a review queue, sources into a system). |
| **Tracer (erasing)** | A bright head runs a right-angle route; the line it leaves erases from behind once the head is past half-way, and the head lands with a small expanding ring. A failed run stops part-way, keeps its line and turns red. |
| **Highlight envelope** | The focal thing darkens to full ink (or gold) while everything else dims to muted, then releases. |
| **Night reveal** | Background cross-fades to `--color-night` over ~1.2 s; things keep their positions and switch to night ink. |

## Per-scene recipes

| Scene | Recipe |
|---|---|
| **Title** | One dot at center, then the title reveal (120px, 300) below it. Caption `LOW`. |
| **Section** | On night. A tracked-caps eyebrow (24px) and one statement (72px, 300); the key word warms to gold as spoken. |
| **Kinetic** | The narration as the picture: phrases at 72px, one at a time, words darkening as spoken. |
| **Bullet** | Dots curl from a ring into a column on a hairline; each item's label (30px+) arrives on its beat; earlier items recede to muted, and the last item, the answer, goes gold. |
| **Stat** | A large light numeral counts up (discrete steps), ringed by that many dots converging; the spoken number is rounded, the numeral exact. |
| **Feature** | A flow: three rings on one line, connectors landing on outlines, a packet travelling hop by hop; camera leans in on the last hop. |
| **Grid** | Tangle → order: scattered dots with crossing hairlines settle into a clean grid under tracked-caps column heads. |
| **UI showcase** | An abstract panel drawn in ink lines (window, sidebar, rows as clean bars); one row goes gold with a leader-lined label. Not a real product. |
| **Content** | A timeline hairline with time ticks; red marks the failure, gold marks the fix. Blameless caption. |
| **CTA** | End card: dots settle into a ring emblem with a long ease-out rotation; title (56px) and one line beneath. Holds 4–5 s. |

## Kit

`kit/` is the code this guide describes, so segments don't rebuild it. Install it once per project: copy `kit/components/intention/` to `components/intention/` and `kit/transitions/dissolve.ts` to `transitions/dissolve.ts`, skipping files that already exist. Register the transition in `videowright.config.ts`:

```ts
transitions: { dissolve: () => import("./transitions/dissolve.js") },
```

A change of scene is then `transition: { type: "dissolve", duration: 600 }` in the timeline. Segments import the kit from `../../components/intention/index.js`. All coordinates are the native 1920×1080 frame.

| Export | What it does |
|---|---|
| `createStage(host)` | Paper, vignette and grain, a camera (`camera`, `night`) and the caption (`caption.show(phrase)`). `svg` (drawing) and `layer` (type) share world coordinates under the camera. |
| `text`, `header` | A line of type anchored at a point (centred by default), hidden until `appear`; `header` is tracked caps at the header floor. |
| `appear`, `vanish`, `travel`, `fade`, `drawOn` | The arrivals and exits above, as WAAPI animations (render-safe). |
| `dot`, `group`, `svgEl`, `el`, `polar` | Drawing primitives. |
| `link(stage, a, b, route)` | A connector between two elements, measured every frame, so it stays attached while they move and fades with them. An end is an element or `{ node, side }`. `route` is `straight` (optional `bend`), `elbow` (`flip` exits vertically) or `step` (`mid`, `turn` or `turnIn`). |
| `trace(stage, a, b, opts)` | An erasing tracer along the same routes: `delay`, `duration`, `until` (below 1 stops part-way, for a failed run), `erase`. Returns `{ line, head }` to recolour. |
| `centre(stage, node)` | A node's centre in world coordinates, to place a label by the thing it labels. |
| `code(...)` | A few lines of code set as type, for the rare scene that needs them. |
| `fileGlyph` (`file.ts`) | A file outline with a folded corner. |

## Sound

The sound carries half of this style. A film without sound design feels unfinished.

**Narrator.** A calm, professional, middle-aged narrator, warm and unhurried. On ElevenLabs `eleven_v3`, use stability 0.5, similarity 0.8 and speaker boost. Keep one narrator across a series. Make 3–4 takes per paragraph, reject any take whose transcript differs from the script, and rank the rest blind (`scripts/gemini.mjs rank`).

**Music.** Solo felt piano and warm pads, no drums, in sections that follow the narration. Quieter and sparser for "what happened" films. Never name artists, bands or brands in prompts; the ElevenLabs music API rejects them. This `music_v1` composition plan worked; set each `duration_ms` from the voiceover timing (a section starts ~0.3–0.4 s before its paragraph):

```json
{
  "model_id": "music_v1",
  "composition_plan": {
    "positive_global_styles": ["solo felt piano", "intimate close-mic felt piano", "warm analog ambient pads", "minimalist", "cinematic", "contemplative", "hopeful", "62 bpm", "rubato", "no drums", "instrumental", "modern neoclassical", "premium brand film score", "soft tape warmth"],
    "negative_global_styles": ["vocals", "choir", "drums", "percussion", "beat", "EDM", "guitar", "brass", "epic trailer", "distortion"],
    "sections": [
      { "section_name": "Opening", "positive_local_styles": ["single sparse felt piano notes with long sustain", "lots of space and silence", "gentle curiosity", "very quiet"], "negative_local_styles": [], "duration_ms": 15000, "lines": [] },
      { "section_name": "Questions", "positive_local_styles": ["soft repeating low piano ostinato", "unresolved suspended chords", "slight quiet tension", "restrained", "still gentle"], "negative_local_styles": [], "duration_ms": 10000, "lines": [] },
      { "section_name": "Reveal", "positive_local_styles": ["warm pad blooms slowly", "tension resolves into a warm major chord", "sense of relief and clarity", "gentle rolling piano arpeggios begin"], "negative_local_styles": [], "duration_ms": 14000, "lines": [] },
      { "section_name": "Clarity", "positive_local_styles": ["flowing rolling piano arpeggios", "soft warm pulse", "steady gentle momentum", "optimistic", "organized", "soft sub bass enters"], "negative_local_styles": [], "duration_ms": 17000, "lines": [] },
      { "section_name": "Hush", "positive_local_styles": ["arrangement strips back to a few suspended piano notes", "held breath", "anticipation", "quiet wonder"], "negative_local_styles": [], "duration_ms": 7000, "lines": [] },
      { "section_name": "Swell", "positive_local_styles": ["emotional peak", "fuller four-note piano voicings", "wide warm pads", "soft sub bass", "uplifting and luminous but never loud"], "negative_local_styles": [], "duration_ms": 12000, "lines": [] },
      { "section_name": "Resolve", "positive_local_styles": ["settles back to sparse solo piano", "final gentle major chord rings out and fades naturally to silence"], "negative_local_styles": [], "duration_ms": 13000, "lines": [] }
    ]
  }
}
```

Generate several seeds, preview each under the narration, and rank them blind. Drop or merge sections the story does not have.

**Sound design.** Sparse and soft: ticks, whooshes, one bloom at the reveal, one alert for a failure, one impact at the climax. The palette below was generated with ElevenLabs sound generation (prompt influence 0.55) and chosen by ear and blind ranking. The files ship in `sfx/<sound>.mp3`: to use one, copy it to `audio/originals/sfx/<sound>/audio.mp3` with an `sfx.ts` (`source: "elevenlabs"`). The offset is dB relative to the SFX bed (see Mix):

| Sound | Prompt | Seconds | Use (offset) |
|---|---|---|---|
| `tick` | a single soft delicate wooden tick like a muted felt piano hammer, very short and clean, minimal interface sound, dry | 0.6 | first dot appearing (−4), search hits (−9), columns building (−7), emblem landing (−3) |
| `scatter` | soft airy whoosh as a cluster of tiny glassy particles disperses outward, delicate sparkle, gentle and cinematic, minimal | 2.2 | a cluster bursting into a field (−3) |
| `shimmer_soft` | quiet granular shimmer of thousands of tiny soft particles fading in, airy, delicate, like fine sand glittering, subtle; then ffmpeg `lowpass=f=7500,lowpass=f=7500,highpass=f=300` | 2.8 | thousands of small things appearing (−6); emblem glow (−9) |
| `alert` | muted soft low two-tone warning pulse, warm and subtle, not harsh, minimal modern interface alert | 1.4 | something goes down (−2 to −3) |
| `swell` | slow soft reverse air swell rising into silence, cinematic transition, airy and gentle | 1.6 | lead-in to a reveal, placed 1.3–1.5 s before it (−3 to −7) |
| `bloom` | deep soft cinematic sub bass bloom with a gentle airy shimmer tail, warm and reverent, not aggressive, no drums | 3.5 | title reveal (0); weight under an impact (−3) |
| `whoosh` | gentle smooth soft air whoosh transition, very subtle, clean, modern | 1.3 | camera moves and layout transitions (−4 to −9) |
| `connect` | delicate glassy chime cascade rising softly, subtle and elegant, minimal, bright but gentle | 2.0 | everything connecting (−5) |
| `rise` | soft warm rising shimmer swell, gentle, luminous, subtle | 1.6 | the gold value appearing (−6) |
| `ring` | soft muted smartphone vibration, two short gentle buzzes on a wooden desk, subtle | 1.2 | someone being called or paged (−2) |
| `click` | crisp tiny soft digital click, clean minimal interface tap, very short, dry | 0.5 | tiny interface taps; `tick` sits better under tracers |
| `break` | sudden sharp digital glitch snap with a deep soft sub-bass impact underneath, short, clean, cinematic, modern, no music | 1.6 | the climax impact (+3, layered with `bloom` at −3) |

Place each cue at the moment its attack should land, taken from the same voiceover timing as the beat.

**Mix.**

- −16 LUFS integrated, −1.5 dBTP.
- Music sits 5.5 LU under the narration in the gaps and ducks a further 9 dB under speech: ~0.25 s attack, ~0.9 s release, starting ~0.18 s before the first syllable.
- The SFX bed sits at narration loudness −10.5 dB; each cue then takes its offset from the table.
- Every sound has an attack fade (a few ms at least). Clicks come from hard starts.
- The music fades over the last ~1.2 s; the end card holds 4–5 s of it.

## What reviews have taught

1. Tiny text is the most common complaint. Enlarge it or remove it.
2. Placeholder blocks of text read as rendering errors; suggest data with clean bars and lines.
3. Anything that vanishes instantly reads as a jump cut.
4. The climax needs time and weight: slow the signal enough to track, lean in, give the impact low end.
5. Silence is not neutral; a film without sound design feels unfinished.
6. Clicks come from hard starts: every sound has an attack.
7. The reviewer cannot measure pixels or seconds; describe changes by how they look.
8. Findings are leads, not verdicts: timestamps drift by a second or two, and some "issues" are intended. Verify in stills before changing anything.

## Pitfalls

- **Don't decorate with colour.** Each colour stands for one thing across the film (gold the answer, red what is flagged or fails, a brand colour the product's own meaning); everything else is ink. Don't strip colour the product uses to mean something either: a flag shown in ink reads as nothing.
- **Don't fill the frame with UI or fake text.** Dots, lines, rings and a few real words.
- **Don't let a line end in empty space.** A connector joins two things, not two points: define it by the things it joins and measure them every frame (a `requestAnimationFrame` loop that reads both boxes and meets their outlines), so it stays attached while they move and fades when either end does. A line aimed at coordinates points at empty space the moment something moves or lands somewhere else. The renderer runs `requestAnimationFrame` after each frame's animations, as a browser does, so this is render-safe.
- **Don't cut to night.** Cross-fade the background.
- **Don't rush the climax.** It is the one moment that holds.
- **Don't use bounce, spring, elastic or linear drifts.** Every move eases.
- **Don't put words below the floors.** Make them bigger or make them texture.
- **Don't show names, customers, money or secrets** unless the user said so.
