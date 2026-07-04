import { describe, expect, it } from "vitest";
import {
  driftAt,
  effectiveMultiplier,
  HUE_AMPLITUDE_DEG,
  HUE_PERIOD_MS,
  nextChaosLevel,
  WARMTH_AMPLITUDE,
  WARMTH_MAX,
} from "../chaos/drift";

describe("driftAt", () => {
  it("is deterministic for the same inputs", () => {
    expect(driftAt(123_456, 10)).toEqual(driftAt(123_456, 10));
  });

  it("produces zero drift when the multiplier is off", () => {
    for (const elapsedMs of [0, 60_000, 10_000_000]) {
      expect(driftAt(elapsedMs, 0)).toEqual({ hueDeg: 0, warmth: 0 });
    }
  });

  it("starts at zero drift when the epoch resets", () => {
    for (const multiplier of [1, 10, 100]) {
      const { hueDeg, warmth } = driftAt(0, multiplier);
      expect(hueDeg).toBeCloseTo(0, 6);
      expect(warmth).toBeCloseTo(0, 6);
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
      const { hueDeg, warmth } = driftAt(elapsedMs, 1);
      expect(Math.abs(hueDeg)).toBeLessThanOrEqual(HUE_AMPLITUDE_DEG);
      expect(warmth).toBeGreaterThanOrEqual(0);
      expect(warmth).toBeLessThanOrEqual(WARMTH_AMPLITUDE);
    }
  });

  it("clamps warmth at 100x", () => {
    for (let elapsedMs = 0; elapsedMs <= 20_000; elapsedMs += 250) {
      const { warmth } = driftAt(elapsedMs, 100);
      expect(warmth).toBeGreaterThanOrEqual(0);
      expect(warmth).toBeLessThanOrEqual(WARMTH_MAX);
    }
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
