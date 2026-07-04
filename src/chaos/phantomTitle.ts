export const TITLE_PERIOD_MS = 45_000;
// Fraction at the end of each cycle during which the phantom title shows.
export const TITLE_ACTIVE_FRACTION = 0.2;

// Noticeable on a double take, but easy to second-guess after it reverts.
const VARIANTS: ((base: string) => string)[] = [
  (base) => `${base}.`,
  (base) => base.replace("C", "c"),
  (base) => `${base.slice(0, -2)}${base.slice(-1)}${base.slice(-2, -1)}`,
];

export function phantomTitle(elapsedMs: number, multiplier: number, base: string): string {
  if (multiplier <= 0) {
    return base;
  }
  const periodMs = TITLE_PERIOD_MS / multiplier;
  const cycle = Math.floor(elapsedMs / periodMs);
  const phase = (elapsedMs % periodMs) / periodMs;
  if (phase < 1 - TITLE_ACTIVE_FRACTION) {
    return base;
  }
  return VARIANTS[cycle % VARIANTS.length](base);
}
