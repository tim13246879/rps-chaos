import { describe, expect, it } from "vitest";
import {
  BLUR_AMPLITUDE_PX,
  BLUR_MAX_PX,
  BLUR_PERIOD_MS,
  driftAt,
  effectiveMultiplier,
  HUE_AMPLITUDE_DEG,
  HUE_PERIOD_MS,
  nextChaosLevel,
  SCALE_AMPLITUDE,
  SCALE_MAX_DELTA,
  SCALE_PERIOD_MS,
  WARMTH_AMPLITUDE,
  WARMTH_MAX,
} from "../chaos/drift";

describe("driftAt", () => {
  it("is deterministic for the same inputs", () => {
    expect(driftAt(123_456, 10)).toEqual(driftAt(123_456, 10));
  });

  it("produces zero drift when the multiplier is off", () => {
    for (const elapsedMs of [0, 60_000, 10_000_000]) {
      expect(driftAt(elapsedMs, 0)).toEqual({ hueDeg: 0, warmth: 0, blurPx: 0, scale: 1 });
    }
  });

  it("starts at zero drift when the epoch resets", () => {
    for (const multiplier of [1, 10, 100]) {
      const { hueDeg, warmth, blurPx, scale } = driftAt(0, multiplier);
      expect(hueDeg).toBeCloseTo(0, 6);
      expect(warmth).toBeCloseTo(0, 6);
      expect(blurPx).toBeCloseTo(0, 6);
      expect(scale).toBeCloseTo(1, 6);
    }
  });

  it("scales hue amplitude with the multiplier and clamps at 180", () => {
    for (const [multiplier, expected] of [
      [1, HUE_AMPLITUDE_DEG],
      [10, HUE_AMPLITUDE_DEG * 10],
      [100, 180],
    ]) {
      const quarterPeriod = HUE_PERIOD_MS / (4 * multiplier);
      expect(driftAt(quarterPeriod, multiplier).hueDeg).toBeCloseTo(expected, 4);
    }
  });

  it("stays within the subtle bounds at 1x", () => {
    for (let elapsedMs = 0; elapsedMs <= 600_000; elapsedMs += 5_000) {
      const { hueDeg, warmth, blurPx, scale } = driftAt(elapsedMs, 1);
      expect(Math.abs(hueDeg)).toBeLessThanOrEqual(HUE_AMPLITUDE_DEG);
      expect(warmth).toBeGreaterThanOrEqual(0);
      expect(warmth).toBeLessThanOrEqual(WARMTH_AMPLITUDE);
      expect(blurPx).toBeGreaterThanOrEqual(0);
      expect(blurPx).toBeLessThanOrEqual(BLUR_AMPLITUDE_PX);
      expect(scale).toBeGreaterThanOrEqual(1);
      expect(scale).toBeLessThanOrEqual(1 + SCALE_AMPLITUDE);
    }
  });

  it("clamps warmth, blur, and scale at 100x", () => {
    for (let elapsedMs = 0; elapsedMs <= 20_000; elapsedMs += 250) {
      const { warmth, blurPx, scale } = driftAt(elapsedMs, 100);
      expect(warmth).toBeGreaterThanOrEqual(0);
      expect(warmth).toBeLessThanOrEqual(WARMTH_MAX);
      expect(blurPx).toBeGreaterThanOrEqual(0);
      expect(blurPx).toBeLessThanOrEqual(BLUR_MAX_PX);
      expect(scale).toBeGreaterThanOrEqual(1);
      expect(scale).toBeLessThanOrEqual(1 + SCALE_MAX_DELTA);
    }
  });

  it("peaks blur and scale at the half period", () => {
    const blurPeak = driftAt(BLUR_PERIOD_MS / 2, 1).blurPx;
    expect(blurPeak).toBeCloseTo(BLUR_AMPLITUDE_PX, 4);
    const scalePeak = driftAt(SCALE_PERIOD_MS / 2, 1).scale;
    expect(scalePeak).toBeCloseTo(1 + SCALE_AMPLITUDE, 4);
  });

  it("oscillates back to zero after a full period", () => {
    for (const multiplier of [1, 10, 100]) {
      expect(driftAt(HUE_PERIOD_MS / multiplier, multiplier).hueDeg).toBeCloseTo(0, 4);
    }
  });
});

describe("nextChaosLevel", () => {
  it("cycles 1 -> 10 -> 100 -> 0 -> 1", () => {
    expect(nextChaosLevel(1)).toBe(10);
    expect(nextChaosLevel(10)).toBe(100);
    expect(nextChaosLevel(100)).toBe(0);
    expect(nextChaosLevel(0)).toBe(1);
  });

  it("falls back to 1x for unrecognized levels", () => {
    expect(nextChaosLevel(42)).toBe(1);
  });
});

describe("effectiveMultiplier", () => {
  it("caps the multiplier at 1x when reduced motion is preferred", () => {
    expect(effectiveMultiplier(100, true)).toBe(1);
    expect(effectiveMultiplier(0, true)).toBe(0);
  });

  it("passes the level through otherwise", () => {
    expect(effectiveMultiplier(100, false)).toBe(100);
  });
});
