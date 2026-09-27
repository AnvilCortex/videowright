# Style Intake

## When this is loaded

You are preparing to generate a voiceover and need to understand the user's tone and pacing preferences before creating the provider script.

## Purpose

Style intake captures preferences that the agent **directly uses** when writing the provider script: tone, emotional arc, and reference style. Voice selection (which voice to use, gender, accent, speaking rate) is handled separately -- from the provider's voice catalog in [voiceover.md](../voiceover.md#provider-choice), or visually in the portal UI for ElevenLabs portal users.

## Questions to ask

Ask these questions before generating the provider script. Group them into a single message -- do not ask one at a time. Skip any question whose answer is already clear from the user's input.

1. **Tone.** What overall tone should the narration have?
   - Examples: conversational, professional, enthusiastic, calm, authoritative, playful, serious, warm
   - If the user is unsure, default to "conversational and warm" -- it works for most explainer videos.

2. **Emotional arc.** Should the tone shift across the video? For example:
   - Start serious, build to excited
   - Maintain a steady calm throughout
   - Start warm, shift to urgent for the call to action
   - If the user has no preference, a steady tone is fine.

3. **Reference** (optional). Is there a narrator or video style they want to emulate?
   - "Like a TED talk", "like a product launch keynote", "like a podcast host"

## How answers map to provider script

Tone is conveyed mostly through punctuation, sentence structure, and word choice. Each provider adds one light control: a style string for Gemini, and optional audio tags for ElevenLabs v3.

| Preference | Provider script effect |
|---|---|
| Tone: enthusiastic | Exclamation marks, short punchy sentences, emphatic word choice. Gemini style: "upbeat and energetic". |
| Tone: calm/serious | Longer sentences, measured pacing. Gemini style: "calm, measured and authoritative". |
| Tone: warm | Natural conversational phrasing -- the default. Gemini style: "confident, warm tech explainer". |
| Emotional arc | Vary sentence structure and punctuation across sections of the script. ElevenLabs v3: optionally one audio tag where the tone changes. |

See [provider_script.md](provider_script.md#emotion-and-tone) for the full writing toolkit and provider controls.

## What NOT to ask

Voice attributes (gender, accent, age, speaking rate) are **not** part of style intake. They are chosen at voice-selection time:

- **Gemini and ElevenLabs API users** pick from the provider's curated voice catalog (see [voiceover.md](../voiceover.md#provider-choice)).
- **ElevenLabs portal users** select a voice visually in the ElevenLabs web UI.

If the user volunteers voice preferences during style intake, acknowledge them and note that they will be applied during voice selection.

## When to skip style intake

- The user has explicitly described the voice style they want in their initial request.
- The user is iterating on an existing voiceover and the style is already established.
- The user is using the manual flow (Flow B) -- they already have the audio.

In these cases, proceed directly to the next step without asking style questions.
