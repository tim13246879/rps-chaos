import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS } from "../config/weights";
import { shouldLockPrediction } from "../game/round";
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

describe("weights config", () => {
  it("exposes default lock thresholds", () => {
    expect(DEFAULT_WEIGHTS.lock).toEqual({
      confidence: 0.62,
      margin: 0.12,
      stableFrames: 2,
    });
  });

  it("allows shouldLockPrediction to be retuned via custom weights", () => {
    const borderline = prediction(0.6, 0.1, 2);
    const looseWeights = {
      ...DEFAULT_WEIGHTS,
      lock: { confidence: 0.55, margin: 0.08, stableFrames: 2 },
    };

    expect(shouldLockPrediction(borderline)).toBe(false);
    expect(shouldLockPrediction(borderline, looseWeights)).toBe(true);
  });
});
