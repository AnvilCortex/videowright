# Review

## When this is loaded

You were routed here from the intent dispatch table because the user wants a quality check on a video ("review it", "QC pass", "is it ready?"), or you are about to hand a finished render to the user, or you need to choose between alternatives (voiceover takes, music candidates, images).

The review is an independent pass: Gemini watches and listens to the whole render against the brief and the script, and reports defects with timestamps. It catches what is easy to miss after hours inside a segment -- text too small on a laptop, a beat that lands late, a click in the mix, a frame that reads as a slide.

It needs `GEMINI_API_KEY` in `.env` (see [images.md](images.md#prerequisites) for the key). Without one, skip the automated pass and ask the user to watch the render with the checklist below in mind.

## Run a pass

1. **Render.** Review what the viewer will get, with audio:

   ```bash
   npx videowright render <slug> --output videos/<video>/exports/review.mp4
   ```

   For a long video, a smaller proxy uploads faster and reviews just as well:

   ```bash
   ffmpeg -loglevel error -y -i videos/<video>/exports/review.mp4 \
     -vf "scale=1920:-2,fps=30" -c:v libx264 -crf 23 -c:a aac -b:a 128k \
     videos/<video>/exports/review_proxy.mp4
   ```

2. **Ask.** Pass the brief (PLAN.md holds purpose, audience and style) and the narration script:

   ```bash
   . node_modules/videowright/skill/scripts/load_env.sh
   mkdir -p videos/<video>/reviews
   node node_modules/videowright/skill/scripts/gemini.mjs review videos/<video>/exports/review.mp4 \
     --brief @videos/<video>/PLAN.md \
     --script videos/<video>/voiceover_script/script.md \
     --changes "<what changed since the last pass, described by how it looks>" \
     --out videos/<video>/reviews/review_<n>.md
   ```

   Number the reviews `review_1.md`, `review_2.md`, ... Omit `--changes` on the first pass and `--script` for a video without narration. Videos over 15 MB go through the Gemini Files API automatically.

The reviewer checks legibility at 1080p on a laptop, visual sync with the narration, connectors that point at nothing, things that pop in or out, motion quality, audio (clicks, masking, levels, pronunciation), clarity for the audience, and anything that looks like a slide deck. It lists each defect with a timestamp range and a severity (must-fix / should-fix / nitpick), then scores the video out of 10.

## Describe changes by how they look

The reviewer cannot measure pixels or seconds. "The zoom into the diagram is slower and smoother" is judged; "the zoom now takes 2.4 s" is called unmet. Write `--changes` in the viewer's terms.

## Verify before fixing

Each finding is a lead, not a verdict:

1. **Find it in frames.** Timestamps drift by a second or two, so grab frames around each one:

   ```bash
   for t in 71 72 73; do
     ffmpeg -loglevel error -y -ss "$t" -i videos/<video>/exports/review.mp4 -frames:v 1 "/tmp/review_$t.png"
   done
   ```

   Look at the frames (and listen to the section for audio findings). In the dev server, the URL hash jumps straight to a segment and beat (see [dev_server.md](dev_server.md#url-hash-navigation)).
2. **Decide whether it is real, and whether it matters for this audience.** Some "issues" are intended; a misread value is not a defect.
3. **Fix the real ones**, then run another pass with `--changes`.

Findings that recur across passes and survive verification are almost always real.

## Done

A video is ready to hand over at **8/10 or better, with no must-fix or should-fix left that you agree with.** First passes are often harsh; two or three rounds is normal. Log each pass in PLAN.md (score, what was fixed, what was deliberately left and why), and tell the user the last score and anything left.

## What reviews have taught

1. **Tiny text is the most common complaint.** Enlarge it or remove it. If it is only texture, make it plainly texture (dots, bars), never tiny words.
2. **Placeholder blocks of text read as rendering errors.** Suggest data with clean bars and lines instead.
3. **Anything that vanishes instantly reads as a jump cut.** Every element leaves with motion.
4. **The climax needs time and weight.** Slow it enough for the eye to track, lean in, and give its sound some low end.
5. **Silence is not neutral.** A narrated video with no music or sound design feels unfinished.
6. **Clicks come from hard starts.** Every sound needs an attack (a few milliseconds of fade-in).
7. **The reviewer cannot measure.** Describe changes by how they look.
8. **Findings are leads.** Verify in frames before changing anything.

## Rank candidates

When there are several takes of the same thing -- voiceover takes, music seeds, SFX variants, image options -- rank them blind instead of picking the first:

```bash
. node_modules/videowright/skill/scripts/load_env.sh
node node_modules/videowright/skill/scripts/gemini.mjs rank \
  "<what good sounds like, in plain words>" cand_1.mp3 cand_2.mp3 cand_3.mp3 \
  [--ref reference.mp3] [--passes 4]
```

Each pass hears the candidates in a different shuffled order, labelled A, B, C, and alternates between two models so one model's taste does not decide alone. The output lists every pass's scores and notes, then the mean per candidate. `--ref` adds a reference for the target style (not scored).

- **Criteria are the brief.** "Warm, intimate, unhurried narration; natural pauses; no rushed lists" beats "which is best".
- **Rank music against the narration,** not on its own: mix each candidate under the voiceover first (see [audio/ffmpeg_cookbook.md](audio/ffmpeg_cookbook.md#vo--music-with-ducking)) and rank the mixes.
- **Rank only candidates that pass their checks** (for voiceover, `retime.mjs check`).
- **Close scores are a tie.** Listen, or ask the user. The ranking narrows the field; it does not replace an ear.

Record the winner and why in PLAN.md (or the asset's `generate.sh` comments).
