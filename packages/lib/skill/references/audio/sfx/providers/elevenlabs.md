# ElevenLabs SFX Generation

## When this is loaded

The user chose ElevenLabs to generate a sound effect. This reference covers the Sound Generation API endpoint, prompt-writing tips, and the `generate.sh` template.

## Prerequisites

- `ELEVENLABS_API_KEY` set in `.env` at the project root, as a plain value or a 1Password reference (`op://vault/item/field`). The key must have **Sound Effects** permission enabled.
- If the user does not have an API key, guide them through setup: see [../../voiceover/providers/elevenlabs.md](../../voiceover/providers/elevenlabs.md) (Step 2: Get the API key). The same key works for TTS, STT, SFX, and Music.

## Cost notice

> **Cost notice:** ElevenLabs charges credits for sound generation. A single SFX generation typically costs 100-500 credits depending on duration. Check your remaining quota at https://elevenlabs.io/app/subscription before generating.

## API endpoint

**Endpoint:** `POST https://api.elevenlabs.io/v1/sound-generation`

**Request body:**

```json
{
  "text": "<prompt describing the desired sound>",
  "duration_seconds": 4.0,
  "prompt_influence": 0.3
}
```

| Field | Required | Description |
|---|---|---|
| `text` | Yes | Natural-language description of the sound to generate. See prompt-writing tips below. |
| `duration_seconds` | No | Target duration in seconds. If omitted, the API chooses. Recommended: specify for predictable results. |
| `prompt_influence` | No | 0.0-1.0. Higher values follow the prompt more literally; lower values give the model more creative freedom. Default 0.3 is a good starting point. |

**Response:** The API returns raw audio bytes (mp3) directly in the response body (not JSON-wrapped).

## `generate.sh` template

Write this script to `videos/<video>/audio/originals/sfx/<slug>/generate.sh` for reproducibility:

```bash
#!/bin/bash
# Generated SFX: <name>
# Prompt: <the exact prompt used>
# Duration: <duration_seconds>s
# Prompt influence: <prompt_influence>

set -euo pipefail

# Load the API key from .env (resolves op:// references). Run from the project root.
. node_modules/videowright/skill/scripts/load_env.sh

if [ -z "${ELEVENLABS_API_KEY:-}" ]; then
  echo "Error: ELEVENLABS_API_KEY not set. Add it to .env" >&2
  exit 1
fi

SLUG="<slug>"
OUTPUT_DIR="videos/<video>/audio/originals/sfx/${SLUG}"
mkdir -p "${OUTPUT_DIR}"

curl -X POST "https://api.elevenlabs.io/v1/sound-generation" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "<prompt>",
    "duration_seconds": <duration>,
    "prompt_influence": <influence>
  }' \
  --output "${OUTPUT_DIR}/audio.mp3"

echo "SFX saved to ${OUTPUT_DIR}/audio.mp3"
```

Make the script executable: `chmod +x generate.sh`.

**Important:** Run `generate.sh` from the **project root** (the directory containing `.env` and `node_modules/`) so that relative paths resolve correctly.

## Prompt-writing tips

Good prompts produce better SFX. Follow these guidelines:

### Be specific about the sound source
- Good: "Mechanical keyboard with cherry blue switches, fast typing, rhythmic"
- Bad: "Typing sound"

### Describe the acoustic character
- Good: "Soft whoosh, low frequency, left-to-right pan feel, smooth"
- Bad: "Whoosh"

### Mention duration behavior
- Good: "Short door slam, single impact, no reverb tail, 0.5 seconds"
- Bad: "Door closing"

### Specify what to avoid
- Good: "Gentle notification chime, no harshness, no echo, clean single tone"
- Bad: "Notification sound"

### Useful descriptors

| Category | Example descriptors |
|---|---|
| Character | crisp, warm, metallic, soft, punchy, hollow, bright, dark |
| Dynamics | sudden, gradual, steady, pulsing, fading |
| Environment | close-mic, room reverb, outdoor, studio-dry |
| Duration hints | brief, sustained, one-shot, looping |

## Post-generation workflow

After the curl command succeeds:

1. **Verify the file exists and is non-empty:**
   ```bash
   ls -la videos/<video>/audio/originals/sfx/<slug>/audio.mp3
   ```

2. **Measure duration via ffprobe:**
   ```bash
   ffprobe -v error -show_entries format=duration \
     -of default=noprint_wrappers=1:nokey=1 \
     videos/<video>/audio/originals/sfx/<slug>/audio.mp3
   ```

3. **Check the attack.** A sound that starts at full level clicks in the mix. If the first few milliseconds are not near silence, give the cue a short fade-in (5-20 ms) in the audio plan (see [Fade in / fade out](../../ffmpeg_cookbook.md#fade-in--fade-out)). Every cue needs an attack; clicks come from hard starts.

4. **Write `sfx.ts`** with the metadata (see [../sfx.md](../sfx.md) for the shape). Set `source: "elevenlabs"`.

5. **Trigger the approval UX** (see [../sfx.md](../sfx.md) -- Approval UX section).

## Iteration on discard

If the user discards and requests changes:

1. Delete the folder: `rm -rf videos/<video>/audio/originals/sfx/<slug>/`
2. Ask what should change about the sound.
3. Adjust the prompt based on feedback. Common adjustments:
   - "Too harsh" -- add "soft", "gentle", remove "punchy"
   - "Too long" -- reduce `duration_seconds`
   - "Wrong type of sound" -- rewrite the source description
   - "Too quiet/loud" -- this is a mix concern, not a generation concern. The audio file itself should be at a reasonable level; volume is controlled in the audio plan cue.
4. Re-run with the updated prompt. Write a new `generate.sh` reflecting the new parameters.

## Troubleshooting

| Issue | Resolution |
|---|---|
| 401 Unauthorized | Check `ELEVENLABS_API_KEY` in `.env` (or that its `op://` reference resolves). Ensure the key has Sound Effects permission. |
| 422 Unprocessable Entity | Prompt may be too short or too long. Keep prompts 10-200 characters. |
| Empty or 0-byte response | API may have failed silently. Retry. If persistent, try a different prompt. |
| Generated sound does not match prompt | Increase `prompt_influence` (try 0.5-0.7). Rephrase the prompt to be more specific. |
| Rate limited (429) | Wait and retry, and send fewer requests at once (plans cap concurrency). Check quota at https://elevenlabs.io/app/subscription. |
