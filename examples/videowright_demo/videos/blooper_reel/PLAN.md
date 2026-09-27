# Plan: Videowright — The Bloopers

## Purpose
- Audience: developers who've seen (or will see) the `videowright_demo` explainer. This is the "DVD bonus features" companion piece.
- Takeaway: same beats as the real explainer, but it's a blooper reel of *making* it — the narrator keeps flubbing the (single, unpronounceable) product name and every demo breaks live on camera. It should be genuinely funny, and land a wink at the end: the good take actually shipped.
- Constraints / hard guidelines:
  - Lives as a new video **inside** the existing `examples/videowright_demo` project — it shares that project's `segments/`, `styles/`, config, and `node_modules`.
  - Reuse the demo's visual language (motion-engineering: charcoal canvas, blueprint grid, amber accent, cyan, JetBrains Mono) so each blooper reads as "that beat, going wrong."
  - Keep the original demo intact as the reference "good take" (`videos/demo_video`). The blooper is a new video alongside it.

## Style
- Active style: motion-engineering (project default).
- Notes: A film-set "director's HUD" overlay (clapperboard slate with SCENE / TAKE, a blinking REC dot + running timecode, a raw-dailies status strip) frames every take. Shared in `components/blooper-kit.ts`.

## Audio intent
- Voiceover: **yes** — ElevenLabs (Asher, `eleven_multilingual_v2`), track `v1`. Added after the initial caption-only build.
- Sound effects: no (candidate follow-up: record-scratch on each CUT, coffee-spill splat, sad-trombone on the render fail — see `audio/audio_plan.md`).
- Background music: no
- Mode: **VO only (voice, no subtitles).** The joke is the *narrator*, carried by the VO track. Each segment's line was generated as its own clip and placed at the start of a per-segment window (= the segment's visual beat), padded with silence, so audio and video stay locked at every boundary without per-beat `waitForNext` wiring. `default_audio_track` → `audio/tracks/v1/track.ts`. (The on-screen lower-third "scratch take" captions were removed at the user's request — voice only. Diegetic gag text stays: terminal output, the glitching title, error states, the CUT stamps, and the slate/REC HUD.)
- Pacing implications: because there's no audio, timing is intrinsic to each gag (a flub has to *land* at a set pace). Internal beats use `ctx.hold()`; each segment ends on a single `ctx.waitForNext()` (one `advances` entry) that fires the jump-cut to the next take. If a real VO is ever added, the flub beats would become `waitForNext()` points driven by a Timing.
- Transitions: hard jump-cuts between segments (no fade) — reads like spliced dailies. Each segment opens on its own slate and ends on a "CUT!" rubber-stamp slam + camera shake.

## Segment outline

Durations are the single `advances` value per segment (seconds); total ≈ 82s.

1. `bl-cold-open` (10.4s) — SCENE 01. Claude Code terminal. The agent confidently builds the wrong thing ("compiling your video about video games…", "Rendering 4,000 frames of Mario…", "✗ that's not the brief"), then the narrator can't get the first line out (sneezes). CUT — "BACK TO ONE".
2. `bl-title-card` (9.8s) — SCENE 02, the centerpiece. The title glitches through every wrong spelling — Video-Wright → VideoRite → Videowridge → Wideovright → Video Wright Bros. → **Videowright** — while the TAKE counter climbs 7→12. Ends on a green "PRINT!" (the keeper).
3. `bl-web-tech-gallery` (11.6s) — SCENE 03. The "any web tech" reel where everything betrays us: the SVG orbits tangle (🧶), the chart goes bankrupt (−$4,000,000,000 ▲), the 3D sphere rolls off set, the rocket noses into the deck (💥), and the real app throws ("everything is not defined"). CUT — "FIX THE ROCKET".
4. `bl-interactive-dev` (9.6s) — SCENE 04. Split screen. The agent "applies tasteful design" and hot-reloads the title card into Comic Sans, a rainbow gradient, "VideoWrong™", and a cat. HMR badge reads "🔥 HOT MESS". CUT — "REVERT. REVERT. REVERT."
5. `bl-pixel-perfect-export` (9.8s) — SCENE 05. The render bar climbs to frame 4439/4440, stalls at 99%, and dies ("Error: out of vibes"). The retry counts straight past the end (4441/4440…). CUT — "WE DON'T TALK ABOUT FRAME 4439".
6. `bl-voiceover-sync` (7.2s) — SCENE 06, meta. The narrator has to say the line *about* the narrator; "an AI narration" is a tongue-twister. The take pitch-bends (0.5× 🐢 → 2.0× 🐿️), the sync badge flips to "DESYNCED ✗". CUT — "HYDRATE. TAKE A BREATH."
7. `bl-any-coding-agent` (7.4s) — SCENE 07. The compatibility cards load wrong: a 404 broken-image, a mystery duck 🦆 on the Codex card, and the opencode card falls over. "SUPPORTED ✓" → "SUPPOSED?". CUT — "SOMEONE CALL DESIGN".
8. `bl-install-cta` (10.2s) — SCENE 08. A typo spiral: `videowrite` ✗, `video-wright` ✗, `intall` ✗, finally `videowright` ✓ — and then the coffee tips over across the frame. CUT — "GET PAPER TOWELS".
9. `bl-gag-reel-outro` (8.4s) — SCENE 09. "That's a wrap." A clapper snaps shut; the tally counts up (TAKES 47 · USABLE 1 · "VIDEOWRIGHT" MISPRONOUNCED 12 · COFFEES LOST 3 · ROCKETS CRASHED 1); a wink: "The good take actually shipped → examples/videowright_demo." Long final hold.

## Script

See `voiceover_script/script.md` — the narrator's flubbed "scratch takes," shown as on-screen captions. Each segment's `voiceover:` field carries a `[BLOOPER]` copy of its line.

---

## Log

### 2026-07-17 — Initial scaffold (blooper reel)
- Added shared `components/blooper-kit.ts`: film-slate director HUD (SCENE / TAKE counter), blinking REC dot + deterministic running timecode (driven by `ctx.clock()`), lower-third "scratch take" narrator caption bar, `flub()` multi-state caption player, `typeInto()`, `cameraShake()`, and a slam-in `cutStamp()` rubber stamp. All render-safe (WAAPI + `ctx.hold` loops + `ctx.clock()`).
- Built 9 new `bl-*` segments (see outline). Original demo segments (`cold-open`, `title-card`, …) and the `demo_video`/`demo_editorial_mono`/`demo_risograph` videos are left untouched as the reference "good take."
- Timeline `videos/blooper_reel/timeline.ts`: 9 segments, motion-engineering tokens import, no audio track (caption-driven), hard jump-cuts between takes. It's the newest `timeline.ts`, so `npx videowright dev` picks it up by default.
- Ran render-safety CR on each segment: single trailing `waitForNext()` per segment (one `advances` entry), all intra-beat timing via `ctx.hold()`/WAAPI, waveform + HUD loops read `ctx.clock()` and bail on `ctx.signal.aborted`.
- Verified: clean `tsc --noEmit`; booted the dev server and drove all 9 segments headlessly (Playwright) with zero console/page errors; captured a frame at each gag's peak to confirm layout and comedic landing.

### 2026-07-17 — Relocated into videowright_demo + layout fixes
- The reel was first scaffolded as a standalone project copy at `examples/blooper_reel`; per correction it belongs as a video *inside* `examples/videowright_demo`. Moved `videos/blooper_reel/`, the nine `bl-*` segments, and `components/blooper-kit.ts` into `examples/videowright_demo/`, then removed the `examples/blooper_reel/` copy. Relative import paths (`../../styles/…`, `../../components/blooper-kit`) are unchanged because the project layout is identical.
- Fixed two layout collisions found in the screenshot review: the `bl-gag-reel-outro` wink line no longer overlaps the stats tally (stats moved up + compacted, wink re-anchored to 73%); the `bl-interactive-dev` split-screen was lowered so its terminal window clears the director slate.

### 2026-07-17 — Added ElevenLabs voiceover (track v1)
- Turned the caption-only reel into a spoken one. Generated 9 flubbed "scratch takes" (voice Asher, `eleven_multilingual_v2`) via `audio/originals/voiceovers/v1/generate.sh`, run from repo root against the repo-root `.env` key.
- **Sync approach:** each line is its own clip, placed at the start of a per-segment window equal to that segment's visual beat and padded with trailing silence (`windows.tsv`), then concatenated. `perSegment` = the window lengths, which sum exactly to the 87.751s track — so the track drives the video and every segment boundary stays locked, with no per-beat `waitForNext` re-wiring.
- Two lines ran longer than their beat: `bl-voiceover-sync` (8.96s vs 7.2s) — stretched that segment's caption holds to ~9.3s so captions track the audio; `bl-gag-reel-outro` (9.29s vs 8.4s) — its window (9.638s) just holds the final wink frame a beat longer.
- Wired `default_audio_track` → `audio/tracks/v1/track.ts` in `timeline.ts`. Authored `voiceover.ts`, `track.ts`, `audio_plan.md`, `plan_snapshot.md`.
- Verified: clean `tsc`; a full `videowright render` (low-fps smoke) completed with **no advance-coherence warnings**, and the output MP4 carries a synced AAC stream (video 87.75s / audio 87.75s). VO delivery quality wasn't auditioned (no playback here).

### 2026-07-18 — Removed on-screen subtitles (voice only)
- Per request, stripped the lower-third narrator caption system: removed `captionBar()` from every segment's mount, deleted all `setCaption()` calls, and replaced `bl-cold-open`'s multi-state `flub()` with an equal-length `ctx.hold(3650)` so timing (and thus audio sync) is unchanged. Removed the now-unused `captionBar`/`setCaption`/`flub`/`strike`/`dir`/`hot` helpers from `blooper-kit.ts` and their imports.
- Kept: the VO track, the diegetic gag text (terminal, glitching title, error states), CUT stamps, and the slate/REC/status HUD. Clean `tsc`; re-shot several segments to confirm no captions and intact layout.
