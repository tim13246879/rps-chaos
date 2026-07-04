---
name: tune-gesture-classifier
description: Adjust rock/paper/scissors gesture detection or round-lock timing in RPS Chaos — use when a gesture is misclassified, a prediction locks too early/late/unreliably, or confidence/margin thresholds need retuning. Covers src/vision/classifier.ts and src/game/round.ts.
---

# Tune the gesture classifier

Full workflow lives in [`docs/operations.md`](../../../docs/operations.md#tuning-the-gesture-classifier) — read the "Tuning the gesture classifier" section: which file owns which knob (`landmarks.ts` vs `classifier.ts` vs `round.ts`), the reproduce → adjust → add a test case → `npm test` → re-verify live loop, and common pitfalls (single bad frames, confidence vs. margin).

That doc is tool-agnostic (also followed by Codex and other agents via `AGENTS.md`) — update it there rather than duplicating content here.

Use the `run-rps-chaos` skill to reproduce and re-verify live.
