import { describe, expect, it } from "vitest";
import {
  INITIAL_PHANTOM,
  PHANTOM_DURATION_MS,
  phantomTitle,
  stepPhantom,
  type PhantomState,
} from "../chaos/phantomTitle";

const BASE = "RPS Chaos";
const TICK_MS = 50;

function sequenceRandom(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("stepPhantom", () => {
  it("never fires when the random draw is above the tick chance", () => {
    let state = INITIAL_PHANTOM;
    for (let i = 0; i < 1_000; i += 1) {
      state = stepPhantom(state, TICK_MS, 100, () => 0.99);
    }
    expect(state).toEqual(INITIAL_PHANTOM);
  });

  it("fires with a random variant when the draw is below the tick chance", () => {
    const state = stepPhantom(INITIAL_PHANTOM, TICK_MS, 1, sequenceRandom([0, 0.7]));
    expect(state.variant).toBe(2);
    expect(state.remainingMs).toBe(PHANTOM_DURATION_MS);
  });

  it("shortens the phantom duration at higher multipliers", () => {
    const state = stepPhantom(INITIAL_PHANTOM, TICK_MS, 100, sequenceRandom([0, 0.1]));
    expect(state.remainingMs).toBe(PHANTOM_DURATION_MS / 100);
  });

  it("counts down while active and reverts when the duration elapses", () => {
    let state: PhantomState = { variant: 1, remainingMs: 2 * TICK_MS };
    state = stepPhantom(state, TICK_MS, 1, () => 0.99);
    expect(state).toEqual({ variant: 1, remainingMs: TICK_MS });
    state = stepPhantom(state, TICK_MS, 1, () => 0.99);
    expect(state).toEqual(INITIAL_PHANTOM);
  });

  it("resets to inactive when the multiplier is off", () => {
    const active: PhantomState = { variant: 0, remainingMs: 5_000 };
    expect(stepPhantom(active, TICK_MS, 0, () => 0)).toEqual(INITIAL_PHANTOM);
  });
});

describe("phantomTitle", () => {
  it("returns the base title while inactive", () => {
    expect(phantomTitle(INITIAL_PHANTOM, BASE)).toBe(BASE);
  });

  it("applies the active variant", () => {
    expect(phantomTitle({ variant: 0, remainingMs: 1_000 }, BASE)).toBe("RPS Chaos.");
    expect(phantomTitle({ variant: 1, remainingMs: 1_000 }, BASE)).toBe("RPS chaos");
    expect(phantomTitle({ variant: 2, remainingMs: 1_000 }, BASE)).toBe("RPS Chaso");
  });
});
