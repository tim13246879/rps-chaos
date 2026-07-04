import { describe, expect, it } from "vitest";
import {
  COUNTDOWN_MS,
  COUNTDOWN_OVERLAY_END_MS,
  getCountdownOverlay,
  getRoundClock,
  getRoundLabel,
  getRoundPhase,
  pickBetterPrediction,
  shouldLockPrediction,
} from "../game/round";
import type { PredictionResult } from "../types";

function prediction(confidence: number, margin: number, stableFrames: number): PredictionResult {
  return {
    move: "rock",
    confidence,
    margin,
    stableFrames,
    scores: {
      rock: confidence,
      paper: 0.2,
      scissors: 0.1,
      unknown: 0.1,
    },
  };
}

describe("round clock", () => {
  it("counts 3-2-1 then shoot", () => {
    expect(getRoundLabel(0)).toBe("3");
    expect(getRoundLabel(1100)).toBe("2");
    expect(getRoundLabel(2100)).toBe("1");
    expect(getRoundLabel(COUNTDOWN_MS)).toBe("SHOOT");
  });

  it("marks the prediction window around reveal", () => {
    const clock = getRoundClock(1000, 1000 + COUNTDOWN_MS - 100);

    expect(clock.isPredictionWindow).toBe(true);
    expect(getRoundPhase(COUNTDOWN_MS + 50)).toBe("shoot");
  });
});

describe("countdown overlay", () => {
  it("is hidden until a round starts", () => {
    expect(getCountdownOverlay(null, 1000).visible).toBe(false);
  });

  it("counts 3-2-1 then SHOOT with a stable step per value", () => {
    expect(getCountdownOverlay(0, 0)).toMatchObject({ visible: true, value: "3", step: 0, isShoot: false });
    expect(getCountdownOverlay(0, 1100)).toMatchObject({ value: "2", step: 1, isShoot: false });
    expect(getCountdownOverlay(0, 2100)).toMatchObject({ value: "1", step: 2, isShoot: false });
    expect(getCountdownOverlay(0, COUNTDOWN_MS)).toMatchObject({ value: "SHOOT", step: 3, isShoot: true });
  });

  it("hides after the shoot hold window", () => {
    expect(getCountdownOverlay(0, COUNTDOWN_OVERLAY_END_MS - 1).visible).toBe(true);
    expect(getCountdownOverlay(0, COUNTDOWN_OVERLAY_END_MS).visible).toBe(false);
  });
});

describe("lock logic", () => {
  it("requires confidence margin and stability", () => {
    expect(shouldLockPrediction(prediction(0.62, 0.12, 2))).toBe(true);
    expect(shouldLockPrediction(prediction(0.61, 0.12, 2))).toBe(false);
    expect(shouldLockPrediction(prediction(0.7, 0.11, 2))).toBe(false);
    expect(shouldLockPrediction(prediction(0.7, 0.2, 1))).toBe(false);
  });

  it("keeps the strongest late prediction", () => {
    const weak = prediction(0.5, 0.09, 1);
    const strong = prediction(0.7, 0.2, 2);

    expect(pickBetterPrediction(null, weak)).toBe(weak);
    expect(pickBetterPrediction(weak, strong)).toBe(strong);
    expect(pickBetterPrediction(strong, weak)).toBe(strong);
  });
});
