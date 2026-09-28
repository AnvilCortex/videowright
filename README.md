
# Videowright 
### Create a video with a prompt

Videowright creates demo videos, explainer videos, and product walkthroughs from your coding agent. Just describe what you want and it generates your video (including audio). Iterate in chat until it's perfect.

## Demo - Sound on!

<video src="https://github.com/user-attachments/assets/ba106686-3ff5-4d57-8fbb-141ad40c8c86" width="600" controls></video>

Or check out the [blooper reel](https://github.com/user-attachments/assets/a1c86e90-8e15-491e-9b05-4e35cf2faa37), directed by my son!

## Overview

- **Video from prompt** -- generate an animated video, simply from a prompt
- **AI voice-overs** -- generate narration from a script, then auto-sync video timing to the audio
- **Sound Effects and Music** -- source and mix many audio sources
- **Generated images** -- illustrations, backgrounds and thumbnails with Nano Banana 2
- **Automated review** -- Gemini watches the render and reports what to fix before you share it
- **Seven built-in visual styles** -- or create your own from a brand guide or description
- **Pixel-perfect MP4 export** -- deterministic frame-by-frame rendering, no dropped frames
- **Hot-reloading dev server** -- iterate in chat, see changes instantly
- **Works in any major coding agent** -- Claude Code, Codex, opencode, etc

## Install

Paste this into your coding agent (Claude Code, Codex, or opencode):

```
Install Videowright using these instructions:
https://github.com/scosman/videowright/raw/refs/heads/main/packages/lib/skill/install/INSTALL.md
```

The agent reads the install prompt and walks you through setup.

## How Does Videowright Work?

You describe the video you want. The agent writes video segments -- self-contained web-components that each render one beat of the video. You preview in the dev server (`npx videowright dev`), give feedback in chat, and the agent iterates. Videowright will generate an AI voiceover, and sync the video to match. When you're happy, export with `npx videowright render`.

## Styles

Pick one of seven built-in styles, or create your own from a brand guide, reference URL, or short description. The newest, **Intention**, is a calm, typographic explainer-film style: ink on paper, one gold accent for the answer, narration set as type.

<img width="953" height="549" alt="Built-in style packs" src="https://github.com/user-attachments/assets/3aaeecc2-7ca4-4c5a-8ed2-9adc4e226b2d" />

### Style Demo

Two demo videos: the same prompt, different styles.

<table><tr>
<td width="45%">

https://github.com/user-attachments/assets/1960c3e8-a3f2-4028-91ab-afbc79a53fca

</td>
<td width="45%">
  
https://github.com/user-attachments/assets/d2454377-9f02-4b1c-af9a-e59c9a0c8912

</td>
</tr></table>

## AI Voice-Overs

Videowright supports a full voiceover pipeline: write a narration script, generate audio with text-to-speech, get precise word-level timestamps via speech-to-text, then auto-align every video beat to your narration.

The workflow:

1. **Write the script.** Draft voiceover copy organized by segment in your video's PLAN.md (or ask videowright to).
2. **Generate audio.** Record your own audio, or use AI text-to-speech. Gemini 3.8 Flash TTS (with a Google AI Studio or OpenRouter key) and ElevenLabs v3 are supported out of the box. Make a few takes and let Videowright rank them blind.
3. **Get timestamps.** Run the audio through speech-to-text to get per-word timing data. This tells Videowright exactly when each line is spoken.
4. **Sync.** The agent computes a timing object that maps each segment's advances to the audio timestamps. Video beats land on the narration automatically.

When you change the audio -- re-record a line, change pacing, swap voices -- the agent re-syncs video timing to match. Segments don't need code changes; only the timing data updates.

## Audio Mixing, Sound Effects and Music

Videowright can mix audio tracks, fading in music, timing sound effects, remixing voice-overs, and more.

The agent can source sound effects and music. Both free downloads from Openverse, or AI generated sounds with ElevenLabs.

## Images

Videowright can generate stills for a video with Nano Banana 2 (Gemini 3.1 Flash Image): textures, backgrounds, illustrations, posters and thumbnails, matched to your style. Text, charts and UI are drawn in the DOM, where they stay sharp and animatable.

## Review

With a Gemini API key, Videowright renders a finished video and has Gemini watch and listen to the whole thing against the brief and script. The review lists defects with timestamps (tiny text, late beats, clicks, anything that looks like a slide), and the agent verifies each one in frames, fixes the real ones, and reviews again until it scores 8/10.

## API keys

Keys live in `.env`, as plain values or 1Password secret references (`ELEVENLABS_API_KEY=op://vault/item/field`). References are resolved with `op read` when a script runs, so keys never sit in the project. Never paste a key into chat.

## Editing

Just chat with videowright about edits you want to make, and it does the rest. It can be stylistic, content, order or pacing.

## CLI

Two CLI commands:

- **`npx videowright dev`** -- Dev server with a homepage listing all videos in the project. Click a video to open the player with hot reload. Hide the HUD for a clean screen-recording surface.
- **`npx videowright render [slug]`** -- Deterministic frame-by-frame MP4 export via Playwright + ffmpeg. Pixel-perfect output.

## Multi-Video Projects

A videowright project can contain many videos. Build up your style over time, maintaning consistency in your brand. Reuse segments across videos (intros, outros, transitions, CTAs).

## Development

Run all checks (lint, typecheck, tests) locally:

```bash
./checks.sh
```

Install the pre-commit hook (once per clone). This will replace any existing pre-commit hook:

```bash
ln -sf ../../checks.sh .git/hooks/pre-commit
```

## Sponsor: Kiln AI

This project was initially made for the [Kiln AI](https://kiln.tech) [launch video](https://www.youtube.com/watch?v=Lt3S8joFO0I)! You can read our write up on the process [on our blog](https://kiln.tech/blog/we_made_our_launch_video_in_claude_code).

[<img width="660" height="377" alt="kiln_launch_thumb" src="https://github.com/user-attachments/assets/a79bb277-52c6-45e9-9631-0713a1d8f16b" />](https://www.youtube.com/watch?v=Lt3S8joFO0I)


## License

[MIT](LICENSE)

