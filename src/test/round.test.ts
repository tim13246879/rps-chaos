import { describe, expect, it } from "vitest";
import {
  COUNTDOWN_MS,
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
