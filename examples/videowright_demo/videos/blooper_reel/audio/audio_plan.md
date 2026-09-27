# Audio Plan — Videowright: The Bloopers

## Plan

VO-only, no SFX or music. The "narrator" is the joke, so the track is nine flubbed
scratch takes — one per segment.

Unusual build (vs. a normal single-file VO): each segment's line is generated as its
**own** ElevenLabs clip, then placed at the **start** of a per-segment window whose
length equals that segment's visual beat, and padded with trailing silence. Concatenating
the windows produces a track that stays locked to the video at every segment boundary
without any per-beat `waitForNext` wiring. This is why there is no single word-level
`timing.json`; sync is at segment granularity and is defined by the window lengths in
`originals/voiceovers/v1/windows.tsv`.

### Cue 1 — VO scratch takes (full file)
Source: `audio/originals/voiceovers/v1/` (assembled `audio.mp3`)
Slice: full file
Place at: 0.0
Volume: 100%
Fades: none

### Build

Handled end-to-end by `originals/voiceovers/v1/generate.sh` (per-line TTS → ffmpeg
window-pad → concat). The assembled file is copied to `tracks/v1/track.mp3`.

### Follow-ups (optional)
- Light SFX would suit the beats — a record-scratch on each "CUT!", a coffee-spill splat
  in `bl-install-cta`, a sad-trombone on the render failure. Would move this to a
  multi-source mix (VO + SFX) per the SFX/mix flow.
