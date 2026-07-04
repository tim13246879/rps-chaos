# Architecture

## Data flow

```
getUserMedia (useHandVision.ts)
  -> HandLandmarker.detectForVideo   [MediaPipe, per animation frame, throttled by FPS]
  -> extractFrameFeatures            [landmarks.ts: raw landmarks -> FrameFeatures]
  -> classifySequence                [classifier.ts: last ~6 FrameFeatures -> PredictionResult]
  -> App.tsx round state             [round.ts: lock rules decide if/when to freeze the prediction]
  -> CameraPanel / PredictionPanel   [render live + locked state]
```

- `useHandVision.ts` is the only module that touches browser APIs (`getUserMedia`, `requestAnimationFrame`, the MediaPipe `HandLandmarker`). It owns the render loop, adaptive throttling based on measured FPS, and drawing the landmark overlay on the canvas.
- `landmarks.ts` converts 21 raw hand landmarks into `FrameFeatures`: per-finger extension (0-1, how straight/extended each finger is), per-finger angle, a thumb-specific heuristic, "scissors spread" (index-to-middle tip distance), and average finger velocity (for detecting an opening/closing motion).
- `classifier.ts` turns features into scores for rock/paper/scissors/unknown. `scoreFromFeatures` scores a single frame using `DEFAULT_WEIGHTS` from `src/config/weights.ts`; `classifySequence` weights the last few frames (recent frames weighted higher, window size from `DEFAULT_WEIGHTS`) and also tracks how many consecutive frames agree on the top move (`stableFrames`).
- `round.ts` is a separate concern from scoring: given a `PredictionResult`, should the app commit to it as *the* answer for this round? `shouldLockPrediction` consumes the lock thresholds from `DEFAULT_WEIGHTS` in `src/config/weights.ts`.

## Why the pure/impure split matters

Everything in `vision/landmarks.ts`, `vision/classifier.ts`, and `game/*.ts` is a pure function: given the same input, same output, no browser APIs. `useHandVision.ts` is the only place that's coupled to the camera and MediaPipe. This is why `src/test/*.test.ts` can fully cover gesture scoring and round timing using synthetic `FrameFeatures`/`PredictionResult` objects, without mocking `getUserMedia` or loading the MediaPipe model in tests. Keep new detection or timing logic in this shape.

## Round state machine

`round.ts`'s `getRoundClock` derives a phase from elapsed time since the round started:

```
idle --(Start round)--> countdown (0-3000ms, labeled 3/2/1)
     --> shoot (3000-3100ms: PREDICTION_WINDOW_END_MS, the reveal instant)
     --> result (everything after)
```

The "prediction window" (`PREDICTION_WINDOW_START_MS` to `PREDICTION_WINDOW_END_MS`, ~350ms before to ~100ms after the SHOOT mark) is when `App.tsx` actively looks for a lockable prediction. If nothing clears the lock thresholds by `PREDICTION_WINDOW_END_MS`, it falls back to the best prediction seen so far (`pickBetterPrediction`) and marks it as a low-confidence/fallback lock rather than leaving the round unresolved.

## How to extend

- **New gesture**: add scoring logic to `scoreFromFeatures` in `classifier.ts`, extend the `Move` union in `types.ts`, update `getCounterMove` in `moves.ts`, add test cases in `classifier.test.ts`.
- **Retune detection/timing**: adjust `DEFAULT_WEIGHTS` in `src/config/weights.ts` and see `docs/operations.md#tuning-the-gesture-classifier`.
- **Collect labeled ground-truth samples**: use the dev-only **labeling mode** in the UI to record `LabeledSample`s and export them as JSON — see `docs/operations.md#labeling-gesture-samples`.
- **New UI element**: add a presentational component under `src/components/`, wire props from `App.tsx` — components should stay presentational (data in via props) like `CameraPanel`/`PredictionPanel`/`MoveGlyph`.
