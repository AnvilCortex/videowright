# Provider Script

## When this is loaded

You have a confirmed script in PLAN.md and need to transform it into the text for TTS generation.

## What `provider_script.md` is

The `provider_script.md` file is the PLAN.md script prepared for TTS: segment headings removed, `[[pause]]` markers added, and pronunciation fixes applied. It lives at:

```
videos/<video>/audio/originals/voiceovers/<slug>/provider_script.md
```

Everything below the `---` line is the script. `retime.mjs text` turns the `[[pause]]` markers into the provider's pause tag to make the text sent to the TTS provider; `retime.mjs apply` uses the markers to set the pause lengths after generation (see [retime.md](retime.md)).

## The approach

Write **plain spoken text**. Let the TTS model choose intonation, emphasis, and the small pauses inside sentences -- current models (Gemini 3.8, ElevenLabs v3) do this well. Mark only the pauses that the video needs, with `[[pause Xs]]`. Each marker is sent to the model as a pause tag, so the model knows a pause is coming and makes one; the retime step then makes it exact. The audio is edited **only** at these markers, never between other words (see [retime.md](retime.md#rule-only-retime-a-pause-the-tts-was-told-to-make)).

**Do not write provider pause tags yourself** (`<break time="1s"/>`, `[pause]`, `<long pause>`, `<short pause>`). v3 does not support `<break>`, and in tests, Gemini pause tags on their own line or mid-sentence caused repeated phrases, tag names spoken aloud, and random noises. Instead, `retime.mjs text --pause-tag` adds the provider's pause tag at the end of the line before each `[[pause]]` marker (`[pause]` for v3, `<long pause>` for Gemini). In that position the tags tested clean in every take (8 of 8), and they give the model a natural gap to end the line, which the retime step then sets to the exact length.

## Generating the provider script

### Step 1: Read the confirmed script from PLAN.md

Extract the script sections in timeline order.

### Step 2: Apply delivery style through writing

Tone comes mostly from **how the text is written**:

| Technique | Effect on delivery | Example |
|---|---|---|
| **Exclamation marks** | More energy, slight pitch rise | "This changes everything!" |
| **Question marks** | Rising intonation | "Ready to get started?" |
| **Ellipsis** (`...`) | Short hesitation, trailing-off feel | "And then... something unexpected." |
| **Em-dash** (`--`) | Brief breath pause, interruption feel | "The result -- stunning." |
| **ALL CAPS** | Emphasis on the word (use sparingly) | "This is EXACTLY what we needed." |
| **Short punchy sentences** | Energetic, urgent pacing | "It's fast. It's reliable. It just works." |
| **Long flowing sentences** | Calm, measured delivery | "Over the next few minutes, we'll walk through each of the core features." |
| **Commas** | Short breaths inside a sentence | "Edit a line, and the video re-syncs." |

Write the way a person speaks: contractions, short sentences, commas where a speaker would breathe.

### Emotion and tone

Each provider has one extra control. Use it lightly:

- **Gemini:** one short style string for the whole take, sent in `speech_metadata.style` (never in the text). See [providers/gemini.md](providers/gemini.md#style-string). Record it in the header block.
- **ElevenLabs v3:** inline audio tags in square brackets, e.g. `[excited]`, `[warmly]`, `[whispers]`, at the start of a sentence where the tone must change. Default is none; at most a few per script. See [providers/elevenlabs.md](providers/elevenlabs.md#audio-tags-v3).

For an emotional arc (e.g., calm, then excited at the call to action), change the writing: longer sentences early, short sentences with exclamation marks at the end. For v3 you can also add one tag where the tone changes.

### Step 3: Add pause markers

Put a `[[pause Xs]]` marker on its own line, between paragraphs:

- **At every segment boundary.** Default 1.0-1.5s. The transition animation plays in this pause.
- **At every `[pause for animation]`** in the PLAN.md script. Size it to the animation (check the segment code).
- **Optionally before the first line**, for a lead-in silence while the first segment animates in.

| Pause | Length | Use for |
|---|---|---|
| Short beat | 0.5-0.8s | Between two ideas in one segment |
| Segment boundary | 1.0-1.5s | Default transition |
| Long | 2.0-3.0s | Major visual transition, a demo that plays without narration |
| Extended | 3.0s+ | Long animation sequence (any length works) |

Rules:

- Syntax: `[[pause 1.5s]]` (seconds; the `s` is optional).
- Put markers at sentence ends only. Mid-sentence, the model may not stop fully, and the retime step will refuse the take.
- Do not add markers between every sentence. Pauses the video does not need should come from the model.

### Step 4: Pronunciation and special terms

- **Spell out letters:** "A P I" (with spaces) for letter-by-letter pronunciation, if the model says it as a word.
- **Phonetic hint:** For unusual names, spell them the way they sound: "Istio" -> "is-tee-oh". For compound product names, a hyphen often helps ("Video-wright").
- **URLs:** Write as speech: "acme dot com" instead of "acme.com".
- **Numbers:** Write numbers as words ("one hundred twenty three") only if the model reads them oddly.

Record each pronunciation change in the header block, so the canonical spelling stays clear. The transcript check accepts spellings that sound like what the STT heard ("A P I" vs. "API"), so these changes do not cause check failures.

## Output format

```markdown
# Provider Script

> Provider: Gemini 3.8 Flash TTS (google/gemini-3.8-flash-tts)
> Voice: Charon
> Style: confident, warm tech explainer; conversational, natural pace
> Pronunciation: "S V G" spelled with spaces.

---

[[pause 0.8s]]

Welcome to Acme Product. Today we'll walk through the three features that set us apart.

[[pause 1.2s]]

First up: real-time collaboration! Your team can edit at the same time, with changes syncing instantly.

[[pause 2.0s]]

Next, the analytics dashboard. Track engagement, conversion, and retention -- in one view.

[[pause 2.0s]]

Finally, integrations. Connect the tools you already use... Slack, GitHub, Jira, and more.

[[pause 1.0s]]

Ready to get started? Visit acme dot com for a free trial. Thanks for watching.
```

### Key conventions in the output

- The header block (blockquote) is metadata for the user and the agent. It is not sent to the provider.
- Everything below the `---` is the script.
- `[[pause]]` markers are on their own lines, between paragraphs.
- No provider pause tags. Provider tone controls only as described in [Emotion and tone](#emotion-and-tone).

## Presenting to the user

After generating the provider script:

1. Show the full script with a brief explanation of the markers and any tone controls.
2. Write the file to `audio/originals/voiceovers/<slug>/provider_script.md`.
3. Proceed to audio generation with the chosen provider: [providers/gemini.md](providers/gemini.md) or [providers/elevenlabs.md](providers/elevenlabs.md).
