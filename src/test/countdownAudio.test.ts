import { afterEach, describe, expect, it, vi } from "vitest";
import { createCountdownAudioPlayer } from "../countdownAudio";

class MockAudioParam {
  readonly values: Array<{ value: number; time: number }> = [];

  setValueAtTime(value: number, time: number) {
    this.values.push({ value, time });
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number) {
    this.values.push({ value, time });
    return this;
  }
}

class MockGainNode {
  readonly gain = new MockAudioParam();
  readonly connect = vi.fn();
  readonly disconnect = vi.fn();
}

class MockOscillatorNode {
  type: OscillatorType = "sine";
  readonly frequency = new MockAudioParam();
  readonly connect = vi.fn();
  readonly disconnect = vi.fn();
  readonly start = vi.fn();
  readonly stop = vi.fn();
  readonly addEventListener = vi.fn();
}

function installAudioContextMock(initialState: AudioContextState = "running") {
  const oscillators: MockOscillatorNode[] = [];
  const contexts: Array<{
    state: AudioContextState;
    resume: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  }> = [];

  class MockAudioContext {
    currentTime = 10;
    destination = {};
    state = initialState;
    resume = vi.fn(async () => {
      this.state = "running";
    });
    close = vi.fn(async () => {
      this.state = "closed";
    });

    constructor() {
      contexts.push(this);
    }

    createOscillator() {
      const oscillator = new MockOscillatorNode();
      oscillators.push(oscillator);
      return oscillator as unknown as OscillatorNode;
    }

    createGain() {
      return new MockGainNode() as unknown as GainNode;
    }
  }

  vi.stubGlobal("window", {
    AudioContext: MockAudioContext,
  });

  return { contexts, oscillators };
}

describe("countdown audio", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("schedules three identical countdown beeps and a different shoot beep", async () => {
    const { oscillators } = installAudioContextMock();

    const player = createCountdownAudioPlayer();
    await player?.play();

    expect(oscillators).toHaveLength(4);
    expect(oscillators.map((oscillator) => oscillator.frequency.values[0].value)).toEqual([
      660, 660, 660, 980,
    ]);
    [10.03, 11.03, 12.03, 13.03].forEach((expectedStartTime, index) => {
      expect(oscillators[index].start.mock.calls[0][0]).toBeCloseTo(expectedStartTime);
    });
    [10.12, 11.12, 12.12, 13.19].forEach((expectedStopTime, index) => {
      expect(oscillators[index].stop.mock.calls[0][0]).toBeCloseTo(expectedStopTime);
    });
  });

  it("resumes suspended audio from the user-triggered play call", async () => {
    const { contexts } = installAudioContextMock("suspended");

    const player = createCountdownAudioPlayer();
    await player?.play();

    expect(contexts[0].resume).toHaveBeenCalledTimes(1);
  });

  it("does nothing when Web Audio is unavailable", () => {
    vi.stubGlobal("window", {});

    expect(createCountdownAudioPlayer()).toBeNull();
  });
});
