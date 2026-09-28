# Gemini TTS

## When this is loaded

The user picked **Gemini 3.8 Flash TTS** in Flow A step 1 (see [voiceover.md](../../voiceover.md#flow-a-ai-generation)). This reference covers the two ways to reach the model and the TTS request:

- **Google AI Studio key** (`GEMINI_API_KEY`) -- direct to the Gemini API, through `gemini.mjs tts` (ships with the skill).
- **OpenRouter key** (`OPENROUTER_API_KEY`) -- one key covers both TTS and the speech-to-text (STT) pass in [retime.md](../retime.md).

Facts that apply to both:

- **Model:** `gemini-3.8-flash-tts` direct, `google/gemini-3.8-flash-tts` on OpenRouter (Google's current TTS model; replaces `gemini-3.1-flash-tts-preview`).
- **Voice:** from the [Gemini voice catalog](../../voiceover.md#gemini-voices). Default: **Charon**.
- **Cost:** about $0.01-0.02 per minute of audio. STT adds less than $0.001 per minute on OpenRouter. Current prices: https://ai.google.dev/pricing and https://openrouter.ai/google/gemini-3.8-flash-tts
- **No word timestamps.** Gemini returns audio only. The retime step gets word timings from STT.
- **STT needs a second provider with a Gemini key.** Videowright's retime step does not use Gemini for STT. With only `GEMINI_API_KEY`, the retime step needs `OPENROUTER_API_KEY`, `ELEVENLABS_API_KEY` (Scribe), or the ElevenLabs portal (see [retime.md](../retime.md#step-1-stt)). Tell the user before generating if none of these is available.

## Step 1: Get the API key

Check which keys `.env` already has (key names only -- `grep -cE '^(GEMINI|OPENROUTER)_API_KEY=' .env`; do not print values). Use the key that exists; if both do, prefer OpenRouter (it also covers STT). If neither exists, ask which the user wants and guide them.

**Google AI Studio key:**

> **Creating your Gemini API key:**
>
> 1. Go to https://aistudio.google.com/apikey (sign in with a Google account).
> 2. Click **Create API key** and pick or create a Google Cloud project.
> 3. Free-tier limits are low; for regular use, enable billing on that project and set a budget alert in the Cloud console as a spending cap.
> 4. Copy the key.

**OpenRouter key:**

> **Creating your OpenRouter API key:**
>
> 1. Go to https://openrouter.ai/settings/keys (sign in or create an account).
> 2. Add credits at https://openrouter.ai/settings/credits if your balance is zero. $5 covers hundreds of voiceover takes.
> 3. Click **Create API Key** and name it (e.g., "videowright").
> 4. **Set a credit limit** on the key (for example, $5). This caps what the agent can spend with the key.
> 5. Copy the key.

**Storage rules -- do NOT paste the key into chat:**

> **Important:** Do not paste your API key into this chat -- it would be sent to the LLM provider.
>
> Instead:
> 1. Create a `.env` file at your project root (if it doesn't already exist).
> 2. Add this line: `GEMINI_API_KEY=your-key-here` (or `OPENROUTER_API_KEY=your-key-here`)
>    - If you use 1Password, store a secret reference instead: `GEMINI_API_KEY=op://vault/item/field`. It is resolved with `op read` each time a script runs, so the key never sits in the file.
> 3. Make sure `.env` is in your `.gitignore` (add it if not).

Before the first generation, tell the user that the agent will spend credits on their account (a few cents per take).

## Step 2: Write `generate.sh`

Write a script into the voiceover folder so the take can be regenerated. It sends the provider script text (each `[[pause]]` marker turned into a `<long pause>` tag by `retime.mjs text`) and writes `raw.mp3`. Use the template for the user's key.

### Google AI Studio key

```bash
#!/usr/bin/env bash
# Gemini 3.8 Flash TTS via the Gemini API. Run from the project root.
set -euo pipefail
. node_modules/videowright/skill/scripts/load_env.sh

VO_DIR="videos/<video>/audio/originals/voiceovers/<slug>"
VOICE="Charon"
STYLE="confident, warm tech explainer; conversational, natural pace"

node node_modules/videowright/skill/scripts/retime.mjs text "$VO_DIR/provider_script.md" \
  --pause-tag "<long pause>" \
  | node node_modules/videowright/skill/scripts/gemini.mjs tts - \
    --voice "$VOICE" --style "$STYLE" --out "$VO_DIR/raw.mp3"
echo "Wrote $VO_DIR/raw.mp3 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VO_DIR/raw.mp3")s)"
```

Request notes:

- `gemini.mjs tts` calls the Interactions API (`POST /v1beta/interactions`, model `gemini-3.8-flash-tts`). The style goes in a `speech_metadata` annotation on the text, so it directs delivery and is never spoken.
- The API returns 24 kHz mono 16-bit WAV. The script writes it as-is for a `.wav` output and encodes it with ffmpeg for `.mp3`.
- The key is sent in a header and never printed. Errors print the API's message and exit non-zero.
- Run with network access to `generativelanguage.googleapis.com`.

### OpenRouter key

```bash
#!/usr/bin/env bash
# Gemini 3.8 Flash TTS via OpenRouter. Run from the project root.
set -euo pipefail
. node_modules/videowright/skill/scripts/load_env.sh

VO_DIR="videos/<video>/audio/originals/voiceovers/<slug>"
VOICE="Charon"
STYLE="confident, warm tech explainer; conversational, natural pace"
RAW="$(mktemp "${TMPDIR:-/tmp}/gemini_tts.XXXXXX")"

TEXT="$(node node_modules/videowright/skill/scripts/retime.mjs text "$VO_DIR/provider_script.md" \
  --pause-tag "<long pause>")"
[ -n "$TEXT" ] || { echo "ERROR: no text from provider_script.md" >&2; exit 1; }

HTTP_CODE=$(curl -sS -w "%{http_code}" -o "$RAW" https://openrouter.ai/api/v1/audio/speech \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg text "$TEXT" --arg voice "$VOICE" --arg style "$STYLE" '{
    model: "google/gemini-3.8-flash-tts",
    input: $text,
    voice: $voice,
    response_format: "pcm",
    provider: { options: { "google-ai-studio": { speech_metadata: { style: $style } } } }
  }')")

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: OpenRouter returned HTTP $HTTP_CODE" >&2; head -c 800 "$RAW" >&2; echo >&2
  rm -f "$RAW"; exit 1
fi

# OpenRouter returns raw 16-bit PCM, 24 kHz, mono. Accept a WAV header too, in case it is added.
if [ "$(head -c 4 "$RAW")" = "RIFF" ]; then
  ffmpeg -loglevel error -y -i "$RAW" -c:a libmp3lame -b:a 192k "$VO_DIR/raw.mp3"
else
  ffmpeg -loglevel error -y -f s16le -ar 24000 -ac 1 -i "$RAW" -c:a libmp3lame -b:a 192k "$VO_DIR/raw.mp3"
fi
rm -f "$RAW"
echo "Wrote $VO_DIR/raw.mp3 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VO_DIR/raw.mp3")s)"
```

Request notes:

- `response_format` must be `"pcm"`. Gemini on OpenRouter rejects `"mp3"` with HTTP 400.
- The style goes in `provider.options["google-ai-studio"].speech_metadata.style`. **Never put directions in `input`** -- Gemini 3.8 reads `input` word for word, so directions are spoken aloud.
- Run with network access to `openrouter.ai`.

Then continue to [retime.md](../retime.md).

## Style string

Keep the style (`--style` direct, `speech_metadata.style` on OpenRouter) short: one line of tone and pace. Long "director's notes" make the voice drift. Build it from the style intake answers (see [style_intake.md](../style_intake.md)):

| Intake answer | Style string |
|---|---|
| Default / conversational and warm | `confident, warm tech explainer; conversational, natural pace` |
| Enthusiastic | `upbeat and energetic, bright product-launch delivery` |
| Calm / serious | `calm, measured and authoritative; unhurried pace` |
| Playful | `playful and friendly, light and casual` |

One request has one style. For a tone change within the video (e.g., build to excited at the end), write the change into the text itself (see [provider_script.md](../provider_script.md)).

## Inline tags

Gemini supports inline vocal tags in angle brackets, e.g. `<breath>`, `<chuckle>`, `<sigh>`, `<short pause>`, `<long pause>`. **Do not write them into the provider script.** In tests, pause tags on their own line or mid-sentence caused repeated phrases, spoken tag names ("short pause"), and random noises in 6 of 9 voices. The same `<long pause>` tag at the end of a line (added by `--pause-tag` at each `[[pause]]` marker) was clean in 5 of 5 voices. Use `[[pause]]` markers for pauses (see [provider_script.md](../provider_script.md)). Use a vocal tag only if the user asks for that sound, and always run the transcript check after.

## Long scripts

For scripts over about 5,000 characters (~5 minutes), split the provider script at a `[[pause]]` marker, generate one `raw_partN.mp3` per part with the same voice and style, and join them into `raw.mp3` (see [Join clips end to end](../../ffmpeg_cookbook.md#join-clips-end-to-end)). Then run the retime step on the joined file. The marker at the join sets the pause length there.

## Troubleshooting

| Issue | Resolution |
|---|---|
| HTTP 401 / 403 | The key is missing or wrong in `.env` (`GEMINI_API_KEY` or `OPENROUTER_API_KEY`), or its `op://` reference did not resolve. |
| HTTP 402 | OpenRouter: the account or key is out of credits, or the key's credit limit is reached. Add credits or raise the limit at https://openrouter.ai/settings/keys. |
| HTTP 429 on the Gemini API | Quota or rate limit. `gemini.mjs` retries a few times; if it still fails, check billing and quota for the key's Cloud project. |
| HTTP 400 `only supports response_format="pcm"` | Set `response_format` to `"pcm"`. |
| Audio sounds like noise or chipmunks | OpenRouter: the PCM was decoded with the wrong format. Use `-f s16le -ar 24000 -ac 1`. |
| Directions are spoken aloud | Move them from the text into the style (`--style` direct, `speech_metadata.style` on OpenRouter). |
| Transcript check fails | Regenerate (takes vary). Remove any inline tags. If it fails 3 times, try another voice and tell the user. |
| Mispronounced word | Add a phonetic spelling in the provider script (see [provider_script.md](../provider_script.md#step-4-pronunciation-and-special-terms)). |
