export interface ChaosDrift {
  hueDeg: number;
  warmth: number;
}

export const CHAOS_LEVELS = [1, 10, 100, 0] as const;

export const HUE_PERIOD_MS = 360_000;
export const HUE_AMPLITUDE_DEG = 12;
// Incommensurate with HUE_PERIOD_MS so the two oscillations never sync up.
export const WARMTH_PERIOD_MS = 520_000;
export const WARMTH_AMPLITUDE = 0.05;
// Above this, sepia reads as "broken monitor" instead of subtle warmth.
export const WARMTH_MAX = 0.35;

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

export function driftAt(elapsedMs: number, multiplier: number): ChaosDrift {
  if (multiplier <= 0) {
    return { hueDeg: 0, warmth: 0 };
  }
  const hueAmplitude = Math.min(180, HUE_AMPLITUDE_DEG * multiplier);
  const huePhase = (2 * Math.PI * elapsedMs * multiplier) / HUE_PERIOD_MS;
  const warmthPeak = Math.min(WARMTH_MAX, WARMTH_AMPLITUDE * multiplier);
  const warmthPhase = (2 * Math.PI * elapsedMs * multiplier) / WARMTH_PERIOD_MS;
  return {
    hueDeg: hueAmplitude * Math.sin(huePhase),
    warmth: warmthPeak * (0.5 - 0.5 * Math.cos(warmthPhase)),
  };
}
