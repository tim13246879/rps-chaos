export interface ChaosDrift {
  hueDeg: number;
  warmth: number;
  blurPx: number;
  scale: number;
}

export const CHAOS_LEVELS = [1, 10, 100, 0] as const;

export const HUE_PERIOD_MS = 360_000;
export const HUE_AMPLITUDE_DEG = 12;
// Periods are mutually incommensurate so the oscillations never sync up.
export const WARMTH_PERIOD_MS = 520_000;
export const WARMTH_AMPLITUDE = 0.05;
// Above this, sepia reads as "broken monitor" instead of subtle warmth.
export const WARMTH_MAX = 0.35;
export const BLUR_PERIOD_MS = 440_000;
export const BLUR_AMPLITUDE_PX = 0.2;
// Beyond this the UI stops being readable even for the 100x demo.
export const BLUR_MAX_PX = 3;
export const SCALE_PERIOD_MS = 420_000;
export const SCALE_AMPLITUDE = 0.004;
export const SCALE_MAX_DELTA = 0.05;

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

// Rises from 0 to 1 and back over one period, starting and ending at 0.
function halfCosine(elapsedMs: number, multiplier: number, periodMs: number): number {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * elapsedMs * multiplier) / periodMs);
}

export function driftAt(elapsedMs: number, multiplier: number): ChaosDrift {
  if (multiplier <= 0) {
    return { hueDeg: 0, warmth: 0, blurPx: 0, scale: 1 };
  }
  const hueAmplitude = Math.min(180, HUE_AMPLITUDE_DEG * multiplier);
  const huePhase = (2 * Math.PI * elapsedMs * multiplier) / HUE_PERIOD_MS;
  const warmthPeak = Math.min(WARMTH_MAX, WARMTH_AMPLITUDE * multiplier);
  const blurPeak = Math.min(BLUR_MAX_PX, BLUR_AMPLITUDE_PX * multiplier);
  const scalePeak = Math.min(SCALE_MAX_DELTA, SCALE_AMPLITUDE * multiplier);
  return {
    hueDeg: hueAmplitude * Math.sin(huePhase),
    warmth: warmthPeak * halfCosine(elapsedMs, multiplier, WARMTH_PERIOD_MS),
    blurPx: blurPeak * halfCosine(elapsedMs, multiplier, BLUR_PERIOD_MS),
    scale: 1 + scalePeak * halfCosine(elapsedMs, multiplier, SCALE_PERIOD_MS),
  };
}
