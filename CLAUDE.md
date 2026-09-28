# Videowright

Videowright makes narrated explainer and demo videos from a coding agent. Segments are web
components written in HTML/CSS/JS; the dev server previews them, and the renderer exports a
deterministic MP4 frame by frame. This repo is the AnvilCortex fork of
[scosman/videowright](https://github.com/scosman/videowright).

## Layout

- `packages/lib`: the `videowright` npm package.
  - `src/`: the runtime (player, segments, timeline, transitions) and the CLI (`dev`, `render`).
  - `skill/`: the agent skill shipped in the package. `SKILL.md` routes to `references/`;
    `assets/styles/<slug>/` holds the built-in style packs; `scripts/` holds helper scripts such
    as `gemini.mjs` (review, ranking) and `load_env.sh`.
  - `test/`: vitest unit tests and Playwright end-to-end tests.
- `packages/create-videowright`: the installer (`npm create videowright`).
- `examples/videowright_demo`: the demo project, a workspace member.
- `specs/`: design notes for past features.
- `projects/`: local video projects that use this checkout (`file:../../packages/lib`).
  Git ignores it: it holds private product material.

## Commands

- `./checks.sh` runs lint (Biome), typecheck and tests in parallel. Run it before every commit.
- `npm run build --workspace=packages/lib` rebuilds `dist/`, which projects under `projects/` load.
- `npx videowright dev` (inside a project) serves every video in that project on one port.
- `npx videowright render <video>` exports an MP4; it needs an ffmpeg build with libx264.

## Conventions

- Biome formats and lints: tabs, double quotes, 100-column lines.
- The skill is agent-facing prose. Keep references short and plain, and update
  `test/unit/skill_files.test.ts` when a reference file is added or removed.
- Built-in style packs are copied into a project on install; the project's copy is then the source
  of truth. A pack is `STYLE.md`, `tokens.css`, `brand.md`, `reference/` and `sample/`, plus
  `kit/` and `sfx/` when it ships shared code or sounds (Intention does).
- API keys (ElevenLabs, Gemini) come from the environment or `.env`, never from the repo; `.env`
  may hold 1Password references that `load_env.sh` resolves.

## Workflow

- Jira project `SP` (SideProjects, dcli profile `anvil`; see `.dcli/config.yaml`). Branches,
  commits and PR titles carry the issue key, e.g. `SP-12-intention-kit` and
  `SP-12 Ship the Intention kit`.
- `origin` is AnvilCortex/videowright; `upstream` is scosman/videowright. PRs target
  `origin/main`.
