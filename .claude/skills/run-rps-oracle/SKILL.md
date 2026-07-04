---
name: run-rps-oracle
description: Launch and exercise the RPS Oracle app (webcam rock-paper-scissors gesture predictor) in a real browser. Use whenever asked to run, start, demo, or manually verify this project, or to confirm a change to vision/game/component code actually works end to end.
---

# Run RPS Oracle

Full walkthrough lives in [`docs/operations.md`](../../../docs/operations.md#running-the-app) — read the "Running the app" section and follow it exactly (dev server URL, camera permission, calibrate, start round, what to check).

That doc is written to be tool-agnostic (it's also what Codex and other agents follow via `AGENTS.md`), so keep it as the single source of truth — update it there rather than duplicating steps here if the flow changes.

If detection itself seems wrong (not just the run process), switch to the `tune-gesture-classifier` skill instead of guessing at fixes live.
