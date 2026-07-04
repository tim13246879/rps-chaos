import { describe, expect, it } from "vitest";
import { getCounterMove } from "../game/moves";

describe("counter moves", () => {
  it("plays the winning counter for every known move", () => {
    expect(getCounterMove("rock")).toBe("paper");
    expect(getCounterMove("paper")).toBe("scissors");
    expect(getCounterMove("scissors")).toBe("rock");
  });

  it("keeps unknown as unknown", () => {
    expect(getCounterMove("unknown")).toBe("unknown");
  });
});
