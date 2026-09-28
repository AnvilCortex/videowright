# Intention — Brand

Human-readable rationale for the token values in `tokens.css`. Read together.

---

## Color

**`--color-bg` `#E9E7E4` (paper).** A warm, slightly grey paper. White reads as "screen"; this reads as a printed page and keeps a long film easy on the eye. A soft vignette toward **`--color-paper-edge` `#D2CFCB`** and faint static grain finish it.

**`--color-fg` `#1D1D1F` (ink).** Near-black, never pure black. All structure: type, dots, lines, rings.

**`--color-muted`** and **`--color-faint`** are the same ink at 45% and 14%. Muted is structure that recedes (dimmed items, secondary labels). Faint is texture: hairlines, grids, caption words not yet spoken.

**`--color-accent` `#CC921F` (gold).** The value in the story: the answer, the fix, what is gained. Also emphasis inside captions. A film uses it once or twice; the eye learns that gold means "this is the point". **`--color-accent-soft` `#DEB04A`** is gold on night and for glows.

**`--color-alert` `#EE312E` (red).** Failure and impact only. Never emphasis.

**`--color-night` `#141416`** with **`--color-night-fg` `#F2F1EF`**. The "before" or a reveal. A scene moves to night and back by cross-fading the background; the things on it keep their places.

## Typography

**Source Sans 3** is a clean humanist sans with a real Light (300) weight. Light at large sizes gives the quiet, open statements this style is built on; Regular (400) carries captions and labels; Semibold (600) tracked caps marks headers.

**Source Code Pro** appears only when a film shows a command or a file name.

The type scale is a set of floors, not suggestions: title 120, statement 72, heading 56, caption 40, label 30, header 24 (px at 1080p). Earlier films set labels at 16–18px and every review flagged them.

## Line and dot

**`--line` 2px** for connectors, rings and outlines; **`--line-hair` 1px** for texture. **`--dot` 14px** is one "thing". Thicker lines read as diagrams; thinner lines disappear in compression.

## Motion

Arrivals ease out fast and settle long (`--ease-out`); purposeful moves ease in and out (`--ease-in-out`); the camera drifts on a sine (`--ease-drift`). Nothing bounces. Nothing moves linearly. The camera never stops completely between moves: a 5–9 s drift keeps a held frame alive.

## Sound

The narration, a felt-piano score and a small palette of soft sounds are part of the identity. See `STYLE.md` → Sound for the narrator settings, the music plan, the sound palette and the mix targets.
