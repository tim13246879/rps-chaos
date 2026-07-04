import { describe, expect, it } from "vitest";
import { phantomTitle, TITLE_ACTIVE_FRACTION, TITLE_PERIOD_MS } from "../chaos/phantomTitle";

const BASE = "RPS Chaos";
const QUIET_MS = TITLE_PERIOD_MS * (1 - TITLE_ACTIVE_FRACTION);

describe("phantomTitle", () => {
  it("is deterministic for the same inputs", () => {
    expect(phantomTitle(123_456, 10, BASE)).toBe(phantomTitle(123_456, 10, BASE));
  });

  it("returns the base title when the multiplier is off", () => {
    for (const elapsedMs of [0, QUIET_MS + 1_000, 10_000_000]) {
      expect(phantomTitle(elapsedMs, 0, BASE)).toBe(BASE);
    }
  });

  it("returns the base title during the quiet part of each cycle", () => {
    expect(phantomTitle(0, 1, BASE)).toBe(BASE);
    expect(phantomTitle(QUIET_MS - 1, 1, BASE)).toBe(BASE);
    expect(phantomTitle(TITLE_PERIOD_MS + QUIET_MS - 1, 1, BASE)).toBe(BASE);
  });

  it("rotates through the phantom variants across active cycles", () => {
    expect(phantomTitle(QUIET_MS + 1_000, 1, BASE)).toBe("RPS Chaos.");
    expect(phantomTitle(TITLE_PERIOD_MS + QUIET_MS + 1_000, 1, BASE)).toBe("RPS chaos");
    expect(phantomTitle(2 * TITLE_PERIOD_MS + QUIET_MS + 1_000, 1, BASE)).toBe("RPS Chaso");
    expect(phantomTitle(3 * TITLE_PERIOD_MS + QUIET_MS + 1_000, 1, BASE)).toBe("RPS Chaos.");
  });

  it("cycles faster at higher multipliers", () => {
    const elapsedMs = (QUIET_MS + 1_000) / 100;
    expect(phantomTitle(elapsedMs, 100, BASE)).toBe("RPS Chaos.");
    expect(phantomTitle(elapsedMs, 1, BASE)).toBe(BASE);
  });
});
