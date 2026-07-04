import { describe, expect, it } from "vitest";
import type { FrameFeatures } from "../types";
import { classifySequence, scoreFromFeatures } from "../vision/classifier";

function features(
  extensions: Partial<FrameFeatures["fingerExtensions"]>,
  overrides: Partial<FrameFeatures> = {},
): FrameFeatures {
  return {
    timestamp: overrides.timestamp ?? 0,
    palmSize: 1,
    palmCenter: { x: 0.5, y: 0.5 },
    fingerExtensions: {
      thumb: 0.5,
      index: extensions.index ?? 0,
      middle: extensions.middle ?? 0,
      ring: extensions.ring ?? 0,
      pinky: extensions.pinky ?? 0,
    },
    fingerAngles: {
      index: 90,
      middle: 90,
      ring: 90,
      pinky: 90,
    },
    averageFingerVelocity: overrides.averageFingerVelocity ?? 0,
    scissorsSpread: overrides.scissorsSpread ?? 0.08,
    handPresent: true,
  };
}

describe("classifier", () => {
  it("scores a closed fist as rock", () => {
    const prediction = classifySequence([
      features({ index: 0.05, middle: 0.08, ring: 0.06, pinky: 0.04 }),
      features({ index: 0.06, middle: 0.08, ring: 0.06, pinky: 0.04 }, { timestamp: 33 }),
    ]);

    expect(prediction.move).toBe("rock");
    expect(prediction.confidence).toBeGreaterThan(0.55);
  });

  it("scores an open hand as paper", () => {
    const prediction = classifySequence([
      features({ index: 0.92, middle: 0.94, ring: 0.85, pinky: 0.8 }),
      features({ index: 0.9, middle: 0.93, ring: 0.86, pinky: 0.82 }, { timestamp: 33 }),
    ]);

    expect(prediction.move).toBe("paper");
    expect(prediction.confidence).toBeGreaterThan(0.5);
  });

  it("scores two extended fingers as scissors", () => {
    const prediction = classifySequence([
      features(
        { index: 0.9, middle: 0.87, ring: 0.08, pinky: 0.08 },
        { scissorsSpread: 0.38 },
      ),
      features(
        { index: 0.88, middle: 0.9, ring: 0.09, pinky: 0.06 },
        { timestamp: 33, scissorsSpread: 0.4 },
      ),
    ]);

    expect(prediction.move).toBe("scissors");
    expect(prediction.confidence).toBeGreaterThan(0.5);
  });

  it("adds a small velocity boost without overriding the visible shape", () => {
    const closed = scoreFromFeatures(
      features(
        { index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.05 },
        { averageFingerVelocity: 2.1 },
      ),
    );

    expect(closed.rock).toBeGreaterThan(closed.paper);
  });
});
