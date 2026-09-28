# Images

## When this is loaded

You were routed here from the intent dispatch table because the user wants a generated image: an illustration, texture, background, poster or thumbnail. Images are generated with **Nano Banana 2** (`gemini-3.1-flash-image`) through `gemini.mjs image`, which ships with the skill.

## When to use a generated image

Generated images suit things that are hard to draw in the DOM and do not need to be exact:

- **Textures and backgrounds** -- paper grain, a soft gradient field, an abstract landscape behind a title.
- **Illustrations** -- a single hero image for a concept ("a lighthouse in fog" for reliability).
- **Posters and thumbnails** -- the still that represents the video on YouTube, a wiki or a chat unfurl.
- **Reference art** -- a mood image to agree a look with the user before building it in code.

Do **not** use them for:

- **Text, numbers, labels or UI.** Generated lettering is unreliable and cannot be edited. Draw text, charts, diagrams and interface mockups in the DOM, where they stay sharp, animatable and correct.
- **Anything that must move.** A generated image is a still. Animate DOM or SVG elements on top of it, or pan and scale the image itself (WAAPI on `transform`).
- **Facts.** An image is an illustration, not evidence. Real screenshots, logos and product UI come from the user.

Every generated image carries Google's invisible SynthID watermark.

## Prerequisites

- `GEMINI_API_KEY` (a Google AI Studio key) in `.env` at the project root, as a plain value or a 1Password reference (`op://vault/item/field`). If the user does not have one, guide them through creating it: see [audio/voiceover/providers/gemini.md](audio/voiceover/providers/gemini.md) (Step 1, Google AI Studio key). Never ask for the key in chat.
- `ffmpeg` on `PATH` (already required by Videowright). The API returns JPEG; `gemini.mjs` converts it when the output file ends in `.png`.

## Cost notice

> **Cost notice:** each image is billed to the Google Cloud project behind the key (a few cents at 1K, more at 2K and 4K). Regenerating costs the same again. Current prices: https://ai.google.dev/pricing

## File layout

Images are shared across videos, like segments. Each image has its own folder at the project root:

```
images/
  paper-grain/
    image.png          # the generated image (immutable after approval)
    prompt.md          # the exact prompt, and why the image exists
    generate.sh        # regenerates it
  launch-poster/
    image.jpg
    prompt.md
    generate.sh
    ref-1.png          # reference images passed with --ref, if any
```

Use `kebab-case` slugs named by what the image shows, not where it is used.

## The command

```bash
node node_modules/videowright/skill/scripts/gemini.mjs image <prompt | @prompt.md> --out <file.png|.jpg> \
  [--ref <image>]... [--aspect 16:9] [--size 1K|2K|4K] [--model gemini-3.1-flash-image]
```

| Option | Default | Notes |
|---|---|---|
| prompt | required | The text itself, or `@path` to read it from a file. Keep the prompt in `prompt.md` and pass `@images/<slug>/prompt.md`. |
| `--out` | required | `.jpg` keeps the API's JPEG as-is; `.png` converts through ffmpeg. |
| `--ref` | none | A reference image; repeat for more (Gemini 3 image models take up to about 14). Use for style consistency across a set, or to edit an existing image. |
| `--aspect` | `16:9` | `1:1`, `3:2`, `2:3`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`. |
| `--size` | `2K` | `1K`, `2K` or `4K`, with an uppercase K (lowercase is rejected). Use `2K` for full-frame backgrounds at 1080p, `1K` for drafts and small elements, `4K` only when the image is zoomed. |

## `generate.sh` template

Write this to `images/<slug>/generate.sh`:

```bash
#!/usr/bin/env bash
# Nano Banana 2 image: <slug>. Run from the project root.
set -euo pipefail
. node_modules/videowright/skill/scripts/load_env.sh

node node_modules/videowright/skill/scripts/gemini.mjs image @images/<slug>/prompt.md \
  --out images/<slug>/image.png --aspect 16:9 --size 2K
```

## Writing the prompt

Describe the picture the way a photographer or illustrator would brief it:

- **Subject, then setting, then treatment.** "A single brass key on a linen tablecloth, soft window light from the left, shallow depth of field, muted warm palette."
- **Match the video's style.** Read the active `styles/<slug>/STYLE.md` and put its palette, texture and mood into the prompt ("ink on warm off-white paper, vast negative space, soft grain"). Name the colours in words; hex codes are followed loosely.
- **Leave room for the DOM.** Say where the empty space is if text or diagrams will sit on top ("subject in the right third, calm empty area on the left").
- **Say what to leave out.** "No text, no letters, no logos, no people" prevents most unwanted detail.
- **One image, one idea.** A crowded prompt gives a crowded picture.

For a **set** of images (a thumbnail series, one illustration per section), generate the first, approve it, then pass it as `--ref` for the rest with "match the style, palette and lighting of the reference image".

To **edit** an image, pass it as `--ref` and describe only the change ("same scene, but at dusk").

## Using an image in a segment

Segments import the file through Vite, which serves it in the dev server and in `render`:

```ts
import grain from '../../images/paper-grain/image.png';

let host: HTMLElement | null = null;

export default defineSegment({
  id: 'title-on-grain',
  advances: [3.0],
  async mount(el) {
    host = el;
    const img = new Image();
    img.src = grain;
    await img.decode(); // ready before the first frame it appears in
    img.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; object-fit:cover;';
    el.append(img);
  },
  // ...
});
```

TypeScript needs a declaration for image imports. If the project has no `env.d.ts`, create one at the project root, and add `"env.d.ts"` to `include` in `tsconfig.json`:

```ts
declare module '*.png' { const src: string; export default src; }
declare module '*.jpg' { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }
```

A background that moves (a slow drift or zoom) should be animated with WAAPI on `transform`, so it stays render-safe.

## Approval UX

After an image is generated (file in place, `prompt.md` and `generate.sh` written), present it for approval:

1. **Show it.** Print a clickable absolute `file://` link to the image, and view it yourself to check it matches the prompt (no stray text, right composition, style fits).
2. **Prompt with exactly two options:**

   > 1. **Approve** -- lock this image for use in segments.
   > 2. **Discard and request changes** -- delete this image and try again.

3. **On Approve:** the image is locked. Do not overwrite `image.png`; a new version is a new slug (`paper-grain-v2`).
4. **On Discard:** delete the folder (`rm -rf images/<slug>/`), ask what should change, adjust the prompt, and generate again.

An image used by a segment in a rendered video must not be deleted. If the user asks, list the segments that import it.

## Troubleshooting

| Issue | Resolution |
|---|---|
| `GEMINI_API_KEY is not set` | Add the key to `.env` and run through `generate.sh` (it sources `load_env.sh`). |
| HTTP 400 about `image_size` | Use an uppercase K: `1K`, `2K`, `4K`. |
| HTTP 400 about the aspect ratio | Use one of the ratios in the table above. |
| HTTP 429 | Quota or rate limit. `gemini.mjs` retries a few times; if it still fails, check billing and quota for the key's Cloud project. |
| `ffmpeg failed` | Install ffmpeg, or write a `.jpg` instead of a `.png`. |
| Text or letters appear in the image | Add "no text, no letters, no logos" to the prompt, and draw any text in the DOM instead. |
| A set of images does not match | Pass the approved first image with `--ref` and ask to match its style, palette and lighting. |
