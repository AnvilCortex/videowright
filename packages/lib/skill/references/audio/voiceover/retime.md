# Retime

## When this is loaded

A TTS take is saved as `raw.mp3` in the voiceover folder (Flow A step 5). This step turns it into the final `audio.mp3` and `timing.json`:

1. **STT** -- get word timestamps for `raw.mp3`.
2. **Check** -- compare the transcript to the script. Regenerate takes that drop, repeat, or invent words.
3. **Apply** -- set every `[[pause]]` to its exact length and shift the word timings to match.

## Why

Expressive TTS models (Gemini 3.8, ElevenLabs v3) give natural intonation and pacing, but they do not give exact pause lengths, and a take can sometimes skip or repeat a phrase. The TTS model paces the speech; this step makes the pauses exact and catches bad takes. Exact pauses give the animation the time it needs at each segment boundary.

## Rule: only retime a pause the TTS was told to make

Edit the audio only at a `[[pause]]` marker where a provider pause tag was sent to the TTS, and only inside a real silence. Never cut between two words that the model spoke close together: the voice can still be trailing off and there is no pure-silence point, so the edit sounds obviously re-cut. The tag also tells the model a pause is coming, so it ends the line with the right cadence.

The tool enforces this:

- `text` adds the pause tag at every marker between two lines, and fails without `--pause-tag`.
- `apply` edits only inside a detected silence of at least 0.4s at each marker. If the take did not pause there, it stops -- regenerate the take. It never cuts at a gap between words that has no real silence.
- Lead-in and tail markers only add or trim silence at the file edges. They need no tag.

Do not work around a refused pause by editing the audio another way. Regenerate the take, or move the marker to a sentence end.

## The tool

`retime.mjs` ships with the skill. It needs Node and ffmpeg (both already required by Videowright) and has no other dependencies:

```bash
# A function (not a variable) so it works in both bash and zsh.
retime() { node node_modules/videowright/skill/scripts/retime.mjs "$@"; }

retime text  <provider_script.md> --pause-tag <tag>     # TTS text: markers -> provider pause tag
retime check <provider_script.md> <stt.json>            # transcript check; exit 1 = bad take
retime apply <provider_script.md> <raw_audio> <stt.json> <out_audio> <out_timing.json>
```

It reads OpenRouter/OpenAI `verbose_json`, ElevenLabs Scribe JSON, and the canonical timing format.

`--pause-tag` is `[pause]` for ElevenLabs v3 and `<long pause>` for Gemini. Each marker between two lines becomes the tag at the end of the line, then a paragraph break (never a tag at the start or end of the script):

```
...with a single prompt. [pause]

Videowright turns a coding agent into a video team...
```

Keep the tag at the end of the line. In tests, Gemini tags on their own line caused repeated phrases and spoken tag names; at the end of the line they were clean in every take.

## Step 1: STT

Pick the STT provider from the keys in `.env` (check key names only -- do not print values):

- **`OPENROUTER_API_KEY`** (preferred; costs less than $0.001 per minute):

  ```bash
  . node_modules/videowright/skill/scripts/load_env.sh
  VO_DIR="videos/<video>/audio/originals/voiceovers/<slug>"
  curl -sS https://openrouter.ai/api/v1/audio/transcriptions \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    -F file=@"$VO_DIR/raw.mp3" \
    -F model=openai/whisper-large-v3-turbo \
    -F language=en \
    -F response_format=verbose_json \
    -F 'timestamp_granularities[]=word' \
    -o "$VO_DIR/raw_stt.json"
  ```

- **`ELEVENLABS_API_KEY` only:** use Scribe v2 (see [providers/elevenlabs.md](providers/elevenlabs.md#speech-to-text-api)), output to `raw_stt.json`.
- **Portal users:** the user exports STT JSON from the ElevenLabs portal as `raw_stt.json` (see [providers/elevenlabs.md](providers/elevenlabs.md#step-2----word-timings-stt)).

`GEMINI_API_KEY` alone is not enough here: the Gemini API has no word-timestamp STT. A take generated with a Gemini key still needs one of the options above.

Add these STT calls to `generate.sh` after the TTS call, so one run makes a complete take.

## Step 2: Check

```bash
retime check "$VO_DIR/provider_script.md" "$VO_DIR/raw_stt.json"
```

The tool lists every difference between the script and what the STT heard:

- **`ok`** lines are small differences, usually STT spelling ("Videowright" heard as "video write", "3D" as "three D"). These are normal.
- **`PROBLEM`** lines are 2+ words dropped, added, or replaced. The take skipped a phrase, repeated a phrase, spoke a tag aloud, or added noise words. The command exits 1.

On `FAIL`: regenerate the take (run `generate.sh` again; each take is different). After 3 failed takes, stop and show the user the `PROBLEM` lines. Suggest another voice, removing inline tags, or rewording the line.

Also read the `ok` lines. If a product name or term is heard differently in every take, the TTS may be mispronouncing it. Mention it to the user and offer a phonetic spelling.

### Several takes

When delivery matters (a launch film, a calm narrated explainer), make 2-4 takes instead of one: run the TTS call once per take into `raw_1.mp3`, `raw_2.mp3`, ... with an STT file each (`raw_1_stt.json`, ...), and `check` each. Rank the takes that pass with a blind comparison (see [review.md](../../review.md#rank-candidates)), for example:

```bash
node node_modules/videowright/skill/scripts/gemini.mjs rank \
  "Which read sounds most natural, calm and unhurried, with pauses that fit the meaning?" \
  "$VO_DIR"/raw_[0-9].mp3 --passes 4
```

Copy the winner and its STT to `raw.mp3` and `raw_stt.json`, note the choice in `generate.sh` or PLAN.md, and continue with `apply`. Ranking needs `GEMINI_API_KEY`; without it, ask the user to listen.

## Step 3: Apply

```bash
retime apply "$VO_DIR/provider_script.md" "$VO_DIR/raw.mp3" "$VO_DIR/raw_stt.json" \
  "$VO_DIR/audio.mp3" "$VO_DIR/timing.json"
```

For each `[[pause Xs]]` marker, the tool finds the real silence at that point in the audio and makes it exactly X seconds: it inserts silence at the middle of the pause, or removes silence from the middle of a long one (keeping the natural edges and any breath). A marker before the first word sets the lead-in silence; a marker after the last word sets the tail. It prints each pause before and after:

```
pause (start): 0.21s -> 1.00s
pause after "...with a single prompt": 0.51s -> 0.70s
pause after "...using any web technologies": 0.43s -> 1.20s
Wrote .../audio.mp3 (66.55s) and .../timing.json
```

`timing.json` has the STT words with times shifted to match `audio.mp3` (tested accuracy: median 7 ms). There is no need to run STT again.

Keep `raw.mp3` and `raw_stt.json` in the folder: they let the user change pause lengths later with no new TTS take. Edit the markers in `provider_script.md` and run `apply` again.

## Output

```
audio/originals/voiceovers/<slug>/
  provider_script.md       # script with [[pause]] markers
  generate.sh              # TTS + STT (API flows)
  raw.mp3                  # TTS take, pauses as generated
  raw_stt.json             # STT word timings for raw.mp3
  audio.mp3                # retimed audio (referenced by voiceover.ts)
  timing.json              # word timings for audio.mp3
```

Proceed to the sync algorithm: [sync_algorithm.md](sync_algorithm.md).

## Troubleshooting

| Issue | Resolution |
|---|---|
| `cannot find the neighbouring words in the STT` | The words around that marker are missing from the transcript. Run `check` -- the take probably dropped them. Regenerate. |
| `transcript check failed` | See Step 2. `--allow-mismatch` retimes anyway; use it only when the user accepts the take. |
| `ffmpeg failed` / `ffprobe` not found | Install ffmpeg (see [export.md](../../export.md)). |
| `the take has no natural pause here` | The model did not pause at that marker. Regenerate the take. If it repeats, check that `generate.sh` passes `--pause-tag` and that the marker is at a sentence end. Do not force it with manual ffmpeg edits. |
| `pause markers between lines need --pause-tag` | Add `--pause-tag "[pause]"` (ElevenLabs v3) or `--pause-tag "<long pause>"` (Gemini) to the `text` command. |
