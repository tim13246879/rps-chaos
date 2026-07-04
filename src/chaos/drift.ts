export interface DriftState {
  hueDeg: number;
  warmth: number;
  blurPx: number;
  scaleDelta: number;
}

export const INITIAL_DRIFT: DriftState = { hueDeg: 0, warmth: 0, blurPx: 0, scaleDelta: 0 };

export const CHAOS_LEVELS = [1, 10, 100, 0] as const;
export const DEFAULT_CHAOS_LEVEL = 10;

export const HUE_AMPLITUDE_DEG = 12;
export const WARMTH_AMPLITUDE = 0.05;
// Above this, sepia reads as "broken monitor" instead of subtle warmth.
export const WARMTH_MAX = 0.35;
export const BLUR_AMPLITUDE_PX = 0.2;
// Beyond this the UI stops being readable even for the 100x demo.
export const BLUR_MAX_PX = 3;
export const SCALE_AMPLITUDE = 0.004;
export const SCALE_MAX_DELTA = 0.05;

// Random step up to this fraction of the bound per tick.
export const STEP_FRACTION = 0.025;
// Pull back toward zero, proportional to displacement (~10s time constant at 50ms ticks).
export const REVERSION = 0.005;

export function nextChaosLevel(current: number): number {
  const index = CHAOS_LEVELS.indexOf(current as (typeof CHAOS_LEVELS)[number]);
  if (index === -1) {
    return CHAOS_LEVELS[0];
  }
  return CHAOS_LEVELS[(index + 1) % CHAOS_LEVELS.length];
}

export function effectiveMultiplier(level: number, reducedMotion: boolean): number {
  return reducedMotion ? Math.min(level, 1) : level;
}

function walk(current: number, bound: number, lo: number, random: () => number): number {
  const next = current - REVERSION * current + bound * STEP_FRACTION * (2 * random() - 1);
  return Math.min(bound, Math.max(lo, next));
}

export function stepDrift(state: DriftState, multiplier: number, random: () => number): DriftState {
  if (multiplier <= 0) {
    return INITIAL_DRIFT;
  }
  const hueBound = Math.min(180, HUE_AMPLITUDE_DEG * multiplier);
  const warmthBound = Math.min(WARMTH_MAX, WARMTH_AMPLITUDE * multiplier);
  const blurBound = Math.min(BLUR_MAX_PX, BLUR_AMPLITUDE_PX * multiplier);
  const scaleBound = Math.min(SCALE_MAX_DELTA, SCALE_AMPLITUDE * multiplier);
  return {
    hueDeg: walk(state.hueDeg, hueBound, -hueBound, random),
    warmth: walk(state.warmth, warmthBound, 0, random),
    blurPx: walk(state.blurPx, blurBound, 0, random),
    scaleDelta: walk(state.scaleDelta, scaleBound, 0, random),
  };
}
