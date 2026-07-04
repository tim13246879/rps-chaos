export interface PhantomState {
  variant: number | null;
  remainingMs: number;
}

export const INITIAL_PHANTOM: PhantomState = { variant: null, remainingMs: 0 };

export const PHANTOM_MEAN_INTERVAL_MS = 45_000;
export const PHANTOM_DURATION_MS = 9_000;

// Noticeable on a double take, but easy to second-guess after it reverts.
const VARIANTS: ((base: string) => string)[] = [
  (base) => `${base}.`,
  (base) => base.replace("C", "c"),
  (base) => `${base.slice(0, -2)}${base.slice(-1)}${base.slice(-2, -1)}`,
];

export function stepPhantom(
  state: PhantomState,
  tickMs: number,
  multiplier: number,
  random: () => number,
): PhantomState {
  if (multiplier <= 0) {
    return INITIAL_PHANTOM;
  }
  if (state.variant !== null) {
    const remainingMs = state.remainingMs - tickMs;
    return remainingMs > 0 ? { ...state, remainingMs } : INITIAL_PHANTOM;
  }
  const fireChance = (tickMs * multiplier) / PHANTOM_MEAN_INTERVAL_MS;
  if (random() < fireChance) {
    return {
      variant: Math.floor(random() * VARIANTS.length),
      remainingMs: PHANTOM_DURATION_MS / multiplier,
    };
  }
  return state;
}

export function phantomTitle(state: PhantomState, base: string): string {
  return state.variant === null ? base : VARIANTS[state.variant](base);
}
