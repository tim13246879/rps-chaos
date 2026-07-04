# AGENTS.md

Instructions for any coding agent (Claude Code, Codex, Devin, etc.) working in this repo. This is the source of truth — tool-specific files (e.g. `CLAUDE.md`) just point here.

## Project summary

RPS Oracle is a browser-based rock-paper-scissors "oracle": it watches your webcam during a 3-2-1-SHOOT countdown, predicts which gesture you're about to throw, and displays the winning counter move before you finish revealing it. No server, no trained ML model — hand-tracking comes from MediaPipe Tasks Vision, and gesture recognition is a hand-tuned heuristic scorer over finger-extension features.

## Commands

```bash
npm install
npm run dev     # vite dev server on http://127.0.0.1:5173/, needs camera permission
npm test        # vitest run
npm run build   # tsc --noEmit && vite build
```

There is no lint script and no linter config in this repo — don't add one unless asked.

## Architecture

```
src/
  vision/
    landmarks.ts     # raw MediaPipe landmarks -> FrameFeatures (pure)
    classifier.ts     # FrameFeatures -> PredictionResult (pure, hand-tuned heuristics)
    useHandVision.ts   # the only browser-coupled module: getUserMedia, HandLandmarker,
                       # render loop, FPS-based throttling
  game/
    round.ts          # round-timing state machine (idle/countdown/shoot/result) + the
                       # "should we lock this prediction" thresholds (pure)
    moves.ts           # counter-move lookup + display formatting (pure)
  components/
    CameraPanel.tsx    # video + landmark overlay + live confidence/margin readout
    PredictionPanel.tsx # controls, countdown, locked counter move, round history
    MoveGlyph.tsx
  types.ts             # shared contracts (Move, FrameFeatures, PredictionResult, ...)
  App.tsx              # orchestrates round state, wires vision snapshot to the panels
  test/                # vitest specs, one per pure module above
```

The load-bearing design decision: **all gesture-scoring and timing logic is pure functions in `vision/` and `game/`, isolated from the one stateful hook that touches the camera.** That's what makes `npm test` able to cover gesture detection and round timing without mocking `getUserMedia` or MediaPipe. Keep new logic in this shape — if you're adding detection or timing behavior, it should be a pure function with a unit test, not inline in `useHandVision.ts` or `App.tsx`.

Key tunable constants live in `src/game/round.ts` (`LOCK_CONFIDENCE`, `LOCK_MARGIN`, `LOCK_STABLE_FRAMES`, `COUNTDOWN_MS`, prediction window) and as inline weights in `src/vision/classifier.ts`'s `scoreFromFeatures`.

See [`docs/architecture.md`](docs/architecture.md) for the full data-flow walkthrough.

## Conventions

- Functional components + hooks only; no classes.
- Named exports for utilities; `App` is the only default export.
- Double-quoted strings, semicolons, `strict` TypeScript — match existing style in the file you're editing.
- No comments unless they explain a non-obvious constant, threshold, or workaround. Well-named functions cover the "what."
- Don't add abstractions, config options, or error handling for cases that can't occur in a browser-only, single-user demo app — this is a hackathon codebase, keep it lean.

## Testing

- Vitest specs live in `src/test/`, one file per pure module (`classifier.test.ts`, `round.test.ts`, `moves.test.ts`).
- Test the pure functions in `vision/` and `game/`; don't try to unit test `useHandVision.ts` itself (browser APIs, not worth mocking here).
- When you change a scoring weight or a lock threshold, add or update a test case alongside it — see the `tune-gesture-classifier` skill.

## Verification

`npm test` and `npm run build` catch logic and type regressions, but they can't prove gesture detection or camera behavior actually works — that only happens in a real browser with a real webcam. **Do not run `npm run dev` yourself** — the agent doesn't have a real browser/webcam to drive it with, so the dev server is the user's to own. For any change touching `vision/`, `game/round.ts`, or the components, ask the user to run `npm run dev` and walk through the flow themselves: enable camera → calibrate → start a round → confirm the right counter move locks in. See [`docs/operations.md`](docs/operations.md#running-the-app).

## Branches and worktrees

Feature work happens on a branch in its own `git worktree` (sibling directory to the main checkout), not directly on `main`. Once a branch's PR is merged, delete both the worktree and the branch — `git worktree remove <path>` then `git branch -d <branch>` (add `git push origin --delete <branch>` if it was pushed). Don't leave merged worktrees/branches lying around; check `git worktree list` and prune anything tied to a merged PR before starting new work.

## Docs and tool-specific wrappers

The substance lives in plain markdown so any agent gets it, regardless of whether it has a "skills" concept:

- [`docs/architecture.md`](docs/architecture.md) — full data-flow and state-machine walkthrough.
- [`docs/operations.md`](docs/operations.md) — running the app, tuning the gesture classifier, and a pre-demo checklist.

Claude Code additionally gets these as invokable skills (`.claude/skills/run-rps-oracle/`, `.claude/skills/tune-gesture-classifier/`, `.claude/skills/demo-checklist/`) that just point back at `docs/operations.md` — that's Claude-Code-specific plumbing, not a second copy of the content. If you're Codex or another AGENTS.md-reading agent without a skills mechanism, just read the two docs above directly.

There's also `.claude/skills/devin-handoff/` — how to scope a task and hand it off to Devin (Cognition's AI engineer) via CLI/web session instead of implementing it directly. That one's inherently Claude-Code/session-specific (it's about *this* conversation's workflow, not the app), so it isn't mirrored into `docs/`.
