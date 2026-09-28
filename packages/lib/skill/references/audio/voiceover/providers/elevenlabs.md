# ElevenLabs

## When this is loaded

The user picked **ElevenLabs v3** in Flow A step 1 (see [voiceover.md](../../voiceover.md#flow-a-ai-generation)). This reference covers the API-key flow (automated) and the portal flow (manual web UI). It also covers ElevenLabs Speech-to-Text (STT) for the retime step and for the manual voiceover flow (Flow B).

- **Model:** `eleven_v3` (ElevenLabs' most expressive model).
- **Voice:** from the [ElevenLabs voice catalog](../../voiceover.md#elevenlabs-voices). Default: **Asher**.
- **Limit:** 5,000 characters per request (~5 minutes of speech). See [Long scripts](#long-scripts).
- **Pauses:** v3 does not support SSML `<break>` tags. `retime.mjs text --pause-tag "[pause]"` puts a `[pause]` tag at each `[[pause]]` marker; the retime step then sets the exact length (see [retime.md](../retime.md)).

## Mode selection

Ask this after the user picks ElevenLabs:

> Two ways to generate the voiceover with ElevenLabs:
>
> 1. **API key (recommended for repeated use)** -- set up once in `.env`, then the agent generates the audio via curl. **Requires a paid ElevenLabs plan** (not available on the free tier). Note: granting the agent API access means it will spend your ElevenLabs credits, which costs real money.
> 2. **Portal (web UI, works with any plan)** -- the agent walks you through TTS in the ElevenLabs web portal, then STT to get word timings.
>
> API key is faster and reusable across projects. Portal needs no setup but takes more clicks per video.
>
> If you don't have an account: open https://elevenlabs.io and sign up first.

After the user picks, if they chose **API key**, immediately present the [ElevenLabs voice catalog](../../voiceover.md#elevenlabs-voices). Portal users pick a voice in the ElevenLabs UI. Then continue with style intake and script writing. When it is time for audio generation, dispatch into the sub-flow below.

---

## Flow 1: API Key

### Step 1: Credit / cost warning

> **Cost notice:** ElevenLabs charges about 1 credit per character for v3. A 60-second voiceover (~900 characters) costs about 900 credits, a small part of most paid plan quotas. Each regenerated take costs the same again.
>
> Check your plan's remaining quota at https://elevenlabs.io/app/subscription before generating.

### Step 2: Get the API key

Skip this step if `.env` already has `ELEVENLABS_API_KEY` (check with `grep -c '^ELEVENLABS_API_KEY=' .env` -- do not print the value).

Guide the user:

> **Creating your ElevenLabs API key:**
>
> 1. Go to https://elevenlabs.io/app/developers/api-keys (sign in if prompted).
> 2. Click **Create API Key**.
> 3. Give it a name (e.g., "videowright").
> 4. **Enable these permissions** on the key before creating it. The key creation UI has toggles for which features the key can access. Enable all of the following:
>    - **Text to Speech** -- required for generating voiceover audio.
>    - **Speech to Text** -- required for extracting word-level timing from audio.
>    - **Sound Effects** -- for SFX generation.
>    - **Music Generation** -- for background music generation.
>
>    If you don't see individual permission toggles, create the key with full access -- the default may already include all required permissions.
> 5. Click **Create** and copy the key.

**Storage rules -- do NOT paste the key into chat:**

> **Important:** Do not paste your API key into this chat -- it would be sent to the LLM provider.
>
> Instead:
> 1. Create a `.env` file at your project root (if it doesn't already exist).
> 2. Add this line: `ELEVENLABS_API_KEY=your-key-here`
>    - If you use 1Password, store a secret reference instead: `ELEVENLABS_API_KEY=op://vault/item/field`. It is resolved with `op read` each time a script runs, so the key never sits in the file.
> 3. Make sure `.env` is in your `.gitignore` (add it if not).

### Step 3: Write `generate.sh`

Write a script into the voiceover folder so the take can be regenerated. It sends the provider script text (each `[[pause]]` marker turned into a `[pause]` tag by `retime.mjs text`) and writes `raw.mp3`:

```bash
#!/usr/bin/env bash
# ElevenLabs v3 TTS. Run from the project root.
set -euo pipefail
. node_modules/videowright/skill/scripts/load_env.sh

VO_DIR="videos/<video>/audio/originals/voiceovers/<slug>"
VOICE_ID="tMvyQtpCVQ0DkixuYm6J"  # Asher
TEXT="$(node node_modules/videowright/skill/scripts/retime.mjs text "$VO_DIR/provider_script.md" \
  --pause-tag "[pause]")"
[ -n "$TEXT" ] || { echo "ERROR: no text from provider_script.md" >&2; exit 1; }

HTTP_CODE=$(curl -sS -w "%{http_code}" -o "$VO_DIR/raw.mp3" \
  -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg text "$TEXT" '{
    text: $text,
    model_id: "eleven_v3",
    voice_settings: { stability: 0.5 }
  }')")

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: ElevenLabs returned HTTP $HTTP_CODE" >&2; head -c 800 "$VO_DIR/raw.mp3" >&2; echo >&2
  rm -f "$VO_DIR/raw.mp3"; exit 1
fi
echo "Wrote $VO_DIR/raw.mp3 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VO_DIR/raw.mp3")s)"
```

Request notes:

- `stability` for v3: `0.0` = Creative (most expressive, less stable), `0.5` = Natural (default), `1.0` = Robust (steady, ignores most audio tags). `similarity_boost` and `style` do not apply to v3. For calm, unhurried narration, `0.5` held up across a whole film; the API also accepts `similarity_boost: 0.8` and `use_speaker_boost: true`, but stability is the setting that changes the read.
- Output formats can depend on the plan. `mp3_44100_128` and `pcm_24000` work on every paid plan; ask for others only if the user's plan allows them.
- Plans cap concurrent requests (three at once on some tiers). When generating several takes or paragraphs, queue the requests rather than firing them all at once; a 429 means wait and retry.
- Run with network access to `api.elevenlabs.io`.

Then continue to [retime.md](../retime.md). For STT, use OpenRouter if the user has `OPENROUTER_API_KEY`, else [ElevenLabs Scribe](#speech-to-text-api) with the same ElevenLabs key.

---

## Flow 2: Portal (Web UI)

### Step 1 -- Generate the audio (TTS)

Run `node node_modules/videowright/skill/scripts/retime.mjs text <provider_script.md> --pause-tag "[pause]"` and show the output to the user in a code block. That is the text to paste (each `[[pause]]` marker turned into a `[pause]` tag).

Guide the user:

> **Generating voiceover audio with ElevenLabs:**
>
> 1. Open https://elevenlabs.io/app and sign in.
> 2. Navigate to **Text to Speech** in the sidebar.
> 3. Select the **Eleven v3** model in the model dropdown.
> 4. Select a voice that matches your tone preferences. You can preview voices before generating.
> 5. Paste the text from the code block above into the text area.
> 6. Click **Generate**.
> 7. Listen to the preview. If the delivery needs changes, tell me and I will update the provider script.
> 8. **Download the audio file** and save it as `audio/originals/voiceovers/<slug>/raw.mp3`.

Do not ask the user to adjust pauses in the portal. The retime step sets them.

### Step 2 -- Word timings (STT)

The TTS portal does not export word timings. Get them from Speech-to-Text:

> **Getting word-level timing via Speech-to-Text:**
>
> 1. In the ElevenLabs portal, switch to **Speech to Text** in the sidebar.
> 2. Upload `audio/originals/voiceovers/<slug>/raw.mp3`.
> 3. Wait for transcription to complete.
> 4. **Export the result as JSON.** Look for an "Export" or "Download" option and select **JSON** format. **Do not use plain text export** -- plain text does not include per-word timing data.
> 5. Save the JSON file as `audio/originals/voiceovers/<slug>/raw_stt.json`.

Then continue to [retime.md](../retime.md), starting at the transcript check.

---

## Speech-to-Text (API)

Scribe v2 returns word timestamps. It uses the same `ELEVENLABS_API_KEY` (the key needs the **Speech to Text** permission):

```bash
. node_modules/videowright/skill/scripts/load_env.sh
VO_DIR="videos/<video>/audio/originals/voiceovers/<slug>"
curl -sS -X POST https://api.elevenlabs.io/v1/speech-to-text \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
  -F model_id=scribe_v2 \
  -F file=@"$VO_DIR/raw.mp3" \
  -F timestamps_granularity=word \
  -F language_code=en \
  -F tag_audio_events=false \
  -o "$VO_DIR/raw_stt.json"
```

The response has `words: [{text, start, end, type}]`, where `type` is `word` or `spacing`. `retime.mjs` reads this format directly.

## Speech-to-Text (portal, for Flow B)

Used when the user provides their own audio and does not use the API:

> **Transcribing audio with ElevenLabs Speech-to-Text:**
>
> 1. Open https://elevenlabs.io/app and sign in.
> 2. Navigate to **Speech to Text** in the sidebar.
> 3. Upload the audio file (mp3 or wav).
> 4. Wait for transcription to complete.
> 5. **Export as JSON.** Select the JSON export option -- plain text export does not include word timing data.
> 6. Save the JSON file in `audio/originals/voiceovers/<slug>/` as `timing.json`.

If an exported JSON uses a different shape, convert it to the canonical format below: word text, start, and end for each word.

## Timing JSON format (canonical)

```json
{
  "words": [
    { "word": "Welcome", "start": 0.0, "end": 0.45 },
    { "word": "to", "start": 0.47, "end": 0.55 }
  ]
}
```

- `word`: the spoken word
- `start` / `end`: seconds from the start of the audio file

## Audio tags (v3)

v3 supports inline audio tags in square brackets, e.g. `[excited]`, `[warmly]`, `[whispers]`, `[laughs]`, `[sighs]`. Use them sparingly, only where the tone must change, at the start of a sentence. The default is no tags. See [provider_script.md](../provider_script.md#emotion-and-tone).

## Long scripts

v3 accepts at most 5,000 characters per request. For longer scripts, split the provider script at a `[[pause]]` marker, generate one `raw_partN.mp3` per part with the same voice and settings, and join them into `raw.mp3` (see [Join clips end to end](../../ffmpeg_cookbook.md#join-clips-end-to-end)). Then run the retime step on the joined file.

## Troubleshooting

| Issue | Resolution |
|---|---|
| API returns 401 | Check that `ELEVENLABS_API_KEY` is set correctly in `.env` (or that its `op://` reference resolves) and the key is valid. |
| 401 `missing the permission user_read` | The key is scoped and cannot read the account (for example the subscription endpoint), while TTS and STT still work. Check quota in the web UI instead, or add the permission. |
| API returns 401/403 on STT only | The key does not have the **Speech to Text** permission. Edit the key or create a new one. |
| API returns 429 | Rate limited or over the plan's concurrent-request limit. Wait a moment and retry, send fewer requests at once, or check your plan's quota. |
| API returns 400 about text length | The text is over 5,000 characters. See [Long scripts](#long-scripts). |
| Delivery is flat or over-acted | Change `stability` (lower = more expressive, higher = steadier), or try another voice. |
| Transcript check fails | Regenerate (takes vary). If it fails 3 times, raise `stability` to `1.0`, remove audio tags, and tell the user. |
| TTS mispronounces a word | Add a phonetic spelling in the provider script and regenerate. |
| STT JSON export option not visible | Look for a download/export button after transcription completes. The option may be labeled "Export", "Download", or appear as a dropdown with format choices. Select JSON specifically. |
