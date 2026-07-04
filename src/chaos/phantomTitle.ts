export const TITLE_PERIOD_MS = 45_000;
// Fraction at the end of each cycle during which the phantom title shows.
export const TITLE_ACTIVE_FRACTION = 0.2;
// Cyrillic Es, visually identical to Latin C in most fonts.
const HOMOGLYPH_C = "С";

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
  return cycle % 2 === 0 ? `${base} ` : base.replace("C", HOMOGLYPH_C);
}
