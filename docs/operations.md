# Operations

Tool-agnostic procedures for running, tuning, and demoing RPS Chaos. Any agent (Claude Code, Codex, a human) should follow these directly; Claude Code additionally exposes them as skills under `.claude/skills/` that point back here.

## Running the app

`npm test` and `npm run build` verify logic and types, but the only way to confirm gesture detection or camera behavior actually works is to run it in a real browser with a real webcam. Coding agents don't have either, so **the user runs `npm run dev`, not the agent** — an agent that reaches this section should stop and ask the user to run the server and walk through the steps below themselves.

1. Install deps if `node_modules/` is missing: `npm install`.
2. Start the dev server: `npm run dev`. It binds to `http://127.0.0.1:5173/` (not `0.0.0.0`).
3. Open that URL in a real browser (not a headless/no-camera environment). The MediaPipe wasm runtime and hand-landmarker model are self-hosted under `public/mediapipe/` (copied from `node_modules` by the `postinstall` script), so the first load works offline once `npm install` has run.
4. Click **"Load model + camera"** and grant the camera permission prompt. The same button becomes **"Stop camera"** once live, and **"Start camera"** after stopping — it toggles rather than being a one-way switch.
5. Click **Calibrate** with your hand out of frame or in a neutral position — this clears the rolling feature history so stale frames don't bias the first prediction.
6. Click **Start round** and show a hand: watch the 3-2-1-SHOOT countdown, then check that:
   - The "Your likely move" and confidence/margin readout in the camera panel update live.
   - A counter move locks in around the SHOOT mark (labeled "Clean lock" or "Fallback lock" with a timestamp).
   - The locked counter move actually beats the move you threw.
7. Use **Practice mode** to loop rounds quickly without needing to reset between demos.

When verifying a change: for `src/vision/` or `src/game/round.ts` edits, re-run this flow with a few different gestures (rock, paper, scissors, and an ambiguous/transitional hand shape). For `src/components/` edits, confirm the UI still reflects live state (FPS, confidence, history list) correctly.

## Tuning the gesture classifier

Detection is a hand-tuned heuristic scorer, not a trained model — there's no training data to fix, only weights and thresholds in two files.

- `src/vision/landmarks.ts` — turns raw MediaPipe landmarks into `FrameFeatures` (per-finger extension 0-1, per-finger angle, scissors spread, average finger velocity). Only touch this if a *feature itself* is unreliable — changes here affect every downstream score.
- `src/vision/classifier.ts` — `scoreFromFeatures` computes rock/paper/scissors/unknown scores from those features using hand-picked weights and `closeness()` targets. `classifySequence` weights the last few frames and requires a confidence/margin floor (`0.36` / `0.04`) before returning anything other than `"unknown"`.
- `src/game/round.ts` — separate from scoring: `LOCK_CONFIDENCE` (0.62), `LOCK_MARGIN` (0.12), and `LOCK_STABLE_FRAMES` (2) decide whether a prediction is trustworthy enough to lock in as the round's answer. `shouldLockPrediction` and `isLowConfidenceLock` are the gate.

Workflow:

1. Reproduce the problem first (see "Running the app" above) — watch the live confidence/margin readout to tell whether it's a *scoring* problem (wrong move gets the highest score) or a *timing* problem (right move scores highest but locks too early/late/not at all).
2. Scoring problem: adjust weights/targets in `scoreFromFeatures`. These are all 0-1 range and interact — raising one move's score changes the normalized scores of the others via `normalizeScores`.
3. Timing/lock problem: adjust the constants in `round.ts` rather than the classifier — "the model thinks it's a rock" and "we're confident enough to commit to rock" are different questions.
4. Add or update a case in `src/test/classifier.test.ts` (scoring changes) or `src/test/round.test.ts` (lock-threshold changes) that encodes the specific behavior you fixed. These construct synthetic `FrameFeatures`/`PredictionResult` objects, so they're a fast feedback loop without a camera.
5. Run `npm test`, then re-verify live — synthetic fixtures can't fully substitute for a real hand in front of a real camera.

Common pitfalls: don't chase a single bad frame — `classifySequence` already weights a short history and requires `LOCK_STABLE_FRAMES` consecutive agreement before `round.ts` will lock. Confidence and margin are different signals: confidence is "how much this move dominates," margin is "how far ahead of the runner-up." A low-margin high-confidence read usually means two moves are being confused with each other, not that the whole read is noisy.

## Demo checklist

Run through this before any live showing — most "it doesn't work" moments are environmental, not a code bug.

1. **Background and lighting**: plain background behind the hand, even lighting, no strong backlight.
2. **One hand, fully in frame**: only one hand visible, kept inside the camera frame for the whole countdown.
3. **Camera permission already granted**: click "Load model + camera" and get past the browser permission prompt *before* you're in front of people — the model also needs a moment to fetch from its CDN on first load.
4. **Calibrate right before the first real round**: hit Calibrate with your hand relaxed/out of frame.
5. **Dry-run in Practice mode** first so you're not debugging live — it doesn't pollute the round history shown to onlookers.
6. **Watch the confidence/margin readout**: if it's consistently low right before you plan to demo a move, recalibrate or fix lighting rather than trusting a shaky lock.
7. **Know the fallback behavior**: if nothing locks cleanly by the end of the countdown, the app shows a "Fallback lock" using the best guess seen so far — that's expected, not a bug.

If detection is consistently wrong rather than just environmentally flaky, that's a tuning problem — see "Tuning the gesture classifier" above.
