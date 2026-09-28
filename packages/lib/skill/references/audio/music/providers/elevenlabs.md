# ElevenLabs Music Generation

## When this is loaded

The user chose ElevenLabs to generate background music. This reference covers the Music API endpoint, prompt-writing tips, composition plans that follow the narration, and the `generate.sh` template.

## Prerequisites

- `ELEVENLABS_API_KEY` set in `.env` at the project root, as a plain value or a 1Password reference (`op://vault/item/field`). The key must have **Music Generation** permission enabled.
- If the user does not have an API key, guide them through setup: see [../../voiceover/providers/elevenlabs.md](../../voiceover/providers/elevenlabs.md) (Step 2: Get the API key). The same key works for TTS, STT, SFX, and Music.

## Cost notice

> **Cost notice:** ElevenLabs charges credits for music generation. Longer tracks cost more credits. A 60-second track typically costs 2,000-5,000 credits depending on complexity. Check your remaining quota at https://elevenlabs.io/app/subscription before generating.

## API endpoint

**Endpoint:** `POST https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192`

The body takes **either** a plain prompt **or** a composition plan, never both.

**Prompt** (quick, one mood for the whole track):

```json
{
  "model_id": "music_v1",
  "prompt": "<prompt describing the desired music>",
  "music_length_ms": 60000,
  "force_instrumental": true
}
```

**Composition plan** (sections that follow the narration; see [Composition plans](#composition-plans)):

```json
{
  "model_id": "music_v1",
  "seed": 3,
  "composition_plan": {
    "positive_global_styles": ["solo felt piano", "warm ambient pads", "62 bpm", "no drums", "instrumental"],
    "negative_global_styles": ["vocals", "drums", "percussion", "EDM"],
    "sections": [
      { "section_name": "Opening", "positive_local_styles": ["sparse single piano notes", "very quiet"], "negative_local_styles": [], "duration_ms": 14500, "lines": [] },
      { "section_name": "Reveal", "positive_local_styles": ["warm pad blooms", "resolves to a major chord"], "negative_local_styles": [], "duration_ms": 21000, "lines": [] }
    ]
  }
}
```

| Field | Required | Description |
|---|---|---|
| `model_id` | No | `music_v1` (default), `music_v2`, or `music_v2_5`. `music_v1` with a composition plan has been the most controllable for scoring a narrated video. v2 models take a different plan shape (`chunks`); see the ElevenLabs API reference. |
| `prompt` | One of | Natural-language description of the music. See prompt-writing tips below. |
| `music_length_ms` | No | Prompt mode only. 3,000-600,000 ms. If omitted, the model picks a length. Recommended: specify to match your video length. |
| `force_instrumental` | No | Prompt mode only. `true` guarantees no vocals. |
| `composition_plan` | One of | Global styles plus `sections`, each with `section_name`, `positive_local_styles`, `negative_local_styles`, `duration_ms` (3,000-120,000 ms) and `lines` (`[]` for instrumental). |
| `seed` | No | Composition-plan mode only. The same seed tends to give a similar track; change it to get alternatives. |

**Response:** The API returns raw audio bytes (mp3) directly in the response body.

**Never name artists, bands, songs or brands** in a prompt or style list ("in the style of ..."). The API rejects them as copyright risks (HTTP 422 or 400). Describe the sound instead: instruments, tempo, texture, mood.

## `generate.sh` template

Write this script to `videos/<video>/audio/originals/music/<slug>/generate.sh` for reproducibility, with the body as `request.json` beside it:

```bash
#!/bin/bash
# Generated Music: <name>
# Mode: <prompt | composition plan>, model music_v1, seed <seed>

set -euo pipefail

# Load the API key from .env (resolves op:// references). Run from the project root.
. node_modules/videowright/skill/scripts/load_env.sh

if [ -z "${ELEVENLABS_API_KEY:-}" ]; then
  echo "Error: ELEVENLABS_API_KEY not set. Add it to .env" >&2
  exit 1
fi

SLUG="<slug>"
OUTPUT_DIR="videos/<video>/audio/originals/music/${SLUG}"
mkdir -p "${OUTPUT_DIR}"

HTTP_CODE=$(curl -sS -w "%{http_code}" -o "${OUTPUT_DIR}/audio.mp3" \
  -X POST "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
  -H "Content-Type: application/json" \
  --data @"${OUTPUT_DIR}/request.json")

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: ElevenLabs returned HTTP $HTTP_CODE" >&2; head -c 800 "${OUTPUT_DIR}/audio.mp3" >&2; echo >&2
  rm -f "${OUTPUT_DIR}/audio.mp3"; exit 1
fi
echo "Music saved to ${OUTPUT_DIR}/audio.mp3"
```

Make the script executable: `chmod +x generate.sh`.

**Important:** Run `generate.sh` from the **project root** (the directory containing `.env` and `node_modules/`) so that relative paths resolve correctly.

## Composition plans

For a narrated video, score to the narration rather than to a single mood:

1. **Sections follow the script.** One section per story beat (opening, problem, reveal, resolution). Each section after the first starts about 0.3 s before the paragraph it scores, using the voiceover's `timing.json`; the last one runs to the end of the video. Durations are `duration_ms` per section.
2. **Global styles hold the palette** (instruments, tempo, texture, "no drums", "instrumental"); local styles move the energy ("sparse single notes", "pad blooms", "arrangement strips back", "final chord rings out").
3. **Generate several seeds** (3-6 candidates, one `<slug>_s<seed>` folder each), then compare them **against the narration**: mix each under the voiceover (see [../../ffmpeg_cookbook.md](../../ffmpeg_cookbook.md#vo--music-with-ducking)) and rank the previews blind with `gemini.mjs rank` (see [review.md](../../../review.md#rank-candidates)), or ask the user to listen. Keep the winner; delete the rest before use.
4. **Offset if needed.** If the first notes should land after the opening, place the cue a second or two late in the audio plan rather than regenerating.

Plans may cap concurrent requests (three at once on some tiers). Generate seeds one after another, or at most a few at a time.

## Prompt-writing tips

Music generation prompts benefit from structure. Include these dimensions:

### Specify genre and instruments
- Good: "Ambient electronic with soft piano chords and warm synth pads"
- Bad: "Background music"

### Describe mood and energy arc
- Good: "Starts minimal and hopeful, builds gradually, reaches an optimistic peak at 30s, then settles into a gentle outro"
- Bad: "Happy music"

### Mention tempo and rhythm
- Good: "Moderate tempo around 90-100 BPM, light percussion, no heavy drums"
- Bad: "Not too fast"

### Describe the use case
- Good: "Background music for a product demo video. Needs to sit behind voiceover without competing. Should feel professional and modern."
- Bad: "Music for a video"

### Useful descriptors for product/demo videos

| Dimension | Good choices |
|---|---|
| Genre | ambient, corporate, indie electronic, lo-fi, minimal, cinematic |
| Instruments | piano, synth pads, soft guitar, muted percussion, strings, bells |
| Mood | professional, optimistic, calm, confident, innovative, warm |
| Energy | low-energy, mid-energy, building, steady, dynamic |
| Avoid | aggressive drums, heavy bass drops, distorted guitars, vocals |

### Duration guidance

Match the music duration to your video:
- Request slightly longer than needed (add 5-10s buffer). You can slice in the audio plan.
- For videos with intro + content + outro: request the full duration so you get a natural arc.
- For looping backgrounds: request at least one full musical phrase (usually 16-32s at standard tempos) so the loop point sounds clean.

## Post-generation workflow

After the curl command succeeds:

1. **Verify the file exists and is non-empty:**
   ```bash
   ls -la videos/<video>/audio/originals/music/<slug>/audio.mp3
   ```

2. **Measure duration via ffprobe:**
   ```bash
   ffprobe -v error -show_entries format=duration \
     -of default=noprint_wrappers=1:nokey=1 \
     videos/<video>/audio/originals/music/<slug>/audio.mp3
   ```

3. **Ask the user to listen and describe the track.** Before writing metadata, ask the user to play the track and report:
   - BPM (can often be inferred from the prompt's requested tempo; otherwise ask the user to estimate)
   - Key (if discernible)
   - Structure (where sections change, where the energy peaks)
   - Any notable moments (beat drops, transitions, loop points)

4. **Write `music.ts`** with rich metadata (see [../music.md](../music.md) for the shape). Set `source: "elevenlabs"`. Include all observed musical details in the `notes` field.

5. **Trigger the approval UX** (see [../music.md](../music.md) -- Approval UX section).

## Iteration on discard

If the user discards and requests changes:

1. Delete the folder: `rm -rf videos/<video>/audio/originals/music/<slug>/`
2. Ask what should change about the music.
3. Adjust the prompt based on feedback. Common adjustments:
   - "Too energetic" -- add "calm", "minimal", "ambient", reduce tempo
   - "Too boring" -- add "building", "dynamic", increase tempo, add percussion
   - "Wrong mood" -- change mood descriptors entirely
   - "Too short" -- increase `music_length_ms` (or the section `duration_ms` values)
   - "Instruments are wrong" -- specify desired instruments, explicitly exclude unwanted ones ("no drums", "no vocals")
   - "Needs a stronger ending" -- describe the outro in the prompt ("resolves to a clear final chord")
4. Re-run with the updated prompt. Write a new `generate.sh` reflecting the new parameters.

## Troubleshooting

| Issue | Resolution |
|---|---|
| 401 Unauthorized | Check `ELEVENLABS_API_KEY` in `.env` (or that its `op://` reference resolves). Ensure the key has Music Generation permission. |
| 422 Unprocessable Entity | Prompt may be problematic. Keep prompts 20-500 characters. Avoid special characters. |
| Empty or 0-byte response | API may have failed silently. Retry. If persistent, try a shorter duration or different prompt. |
| Generated music does not match prompt | Be more specific about instruments, tempo and mood; move the arc into a composition plan with one section per beat; try other seeds. |
| 422 or 400 naming an artist, band or brand | Styles and prompts must not name artists, bands, songs or brands. Describe the sound instead. |
| Music has vocals/singing | Add "instrumental only, no vocals, no singing" to the prompt. |
| Rate limited (429) | Wait and retry, and send fewer requests at once (plans cap concurrency). Check quota at https://elevenlabs.io/app/subscription. |
| Track is shorter than requested | The API may cap duration. Try requesting in smaller segments or accept the shorter track. |
