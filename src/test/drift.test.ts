import { describe, expect, it } from "vitest";
import {
  BLUR_AMPLITUDE_PX,
  BLUR_MAX_PX,
  effectiveMultiplier,
  HUE_AMPLITUDE_DEG,
  INITIAL_DRIFT,
  nextChaosLevel,
  SCALE_AMPLITUDE,
  SCALE_MAX_DELTA,
  stepDrift,
  WARMTH_AMPLITUDE,
  WARMTH_MAX,
  type DriftState,
} from "../chaos/drift";

function sequenceRandom(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

function run(steps: number, multiplier: number, random: () => number): DriftState {
  let state = INITIAL_DRIFT;
  for (let i = 0; i < steps; i += 1) {
    state = stepDrift(state, multiplier, random);
  }
  return state;
}

describe("stepDrift", () => {
  it("is deterministic for the same random sequence", () => {
    const values = [0.9, 0.1, 0.6, 0.3, 0.8];
    expect(run(50, 10, sequenceRandom(values))).toEqual(run(50, 10, sequenceRandom(values)));
  });

  it("snaps any state to zero drift when the multiplier is off", () => {
    const displaced: DriftState = { hueDeg: 11, warmth: 0.04, blurPx: 0.19, scaleDelta: 0.003 };
    expect(stepDrift(displaced, 0, () => 0.9)).toEqual(INITIAL_DRIFT);
  });

  it("stays within the 1x bounds under maximal positive steps", () => {
    const state = run(10_000, 1, () => 1);
    expect(state.hueDeg).toBeLessThanOrEqual(HUE_AMPLITUDE_DEG);
    expect(state.warmth).toBeLessThanOrEqual(WARMTH_AMPLITUDE);
    expect(state.blurPx).toBeLessThanOrEqual(BLUR_AMPLITUDE_PX);
    expect(state.scaleDelta).toBeLessThanOrEqual(SCALE_AMPLITUDE);
  });

  it("clamps at the 100x maxima", () => {
    const state = run(10_000, 100, () => 1);
    expect(state.hueDeg).toBeLessThanOrEqual(180);
    expect(state.warmth).toBeLessThanOrEqual(WARMTH_MAX);
    expect(state.blurPx).toBeLessThanOrEqual(BLUR_MAX_PX);
    expect(state.scaleDelta).toBeLessThanOrEqual(SCALE_MAX_DELTA);
  });

  it("keeps one-sided channels at zero and hue at its negative bound under minimal steps", () => {
    const state = run(10_000, 1, () => 0);
    expect(state.hueDeg).toBeCloseTo(-HUE_AMPLITUDE_DEG, 6);
    expect(state.warmth).toBe(0);
    expect(state.blurPx).toBe(0);
    expect(state.scaleDelta).toBe(0);
  });

  it("reverts toward zero when displaced and the noise is neutral", () => {
    let state: DriftState = { hueDeg: HUE_AMPLITUDE_DEG, warmth: WARMTH_AMPLITUDE, blurPx: 0, scaleDelta: 0 };
    for (let i = 0; i < 20; i += 1) {
      const next = stepDrift(state, 1, () => 0.5);
      expect(Math.abs(next.hueDeg)).toBeLessThan(Math.abs(state.hueDeg));
      expect(next.warmth).toBeLessThan(state.warmth);
      state = next;
    }
  });

  it("wanders under a varying random sequence", () => {
    const random = sequenceRandom([0.9, 0.2, 0.7, 0.4]);
    const first = stepDrift(INITIAL_DRIFT, 1, random);
    const second = stepDrift(first, 1, random);
    expect(second.hueDeg).not.toBe(first.hueDeg);
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
