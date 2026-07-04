const COUNTDOWN_BEEP_FREQUENCY = 660;
const SHOOT_BEEP_FREQUENCY = 980;
const COUNTDOWN_BEEP_SECONDS = 0.09;
const SHOOT_BEEP_SECONDS = 0.16;
const BEEP_VOLUME = 0.16;
const AUDIO_START_DELAY_SECONDS = 0.03;
export const COUNTDOWN_AUDIO_LEAD_MS = 250;

type AudioContextConstructor = typeof AudioContext;

interface WindowWithWebkitAudioContext extends Window {
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
}

export interface CountdownAudioPlayer {
  play(): Promise<void>;
  dispose(): void;
}

function getAudioContextConstructor(): AudioContextConstructor | null {
  const audioWindow = window as WindowWithWebkitAudioContext;
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

function scheduleBeep(
  context: AudioContext,
  scheduledNodes: AudioScheduledSourceNode[],
  startAt: number,
  frequency: number,
  duration: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const attackEndsAt = startAt + 0.006;
  const releaseStartsAt = startAt + Math.max(0.01, duration - 0.025);
  const endsAt = startAt + duration;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(BEEP_VOLUME, attackEndsAt);
  gain.gain.setValueAtTime(BEEP_VOLUME, releaseStartsAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(endsAt);
  oscillator.addEventListener(
    "ended",
    () => {
      oscillator.disconnect();
      gain.disconnect();
    },
    { once: true },
  );

  scheduledNodes.push(oscillator);
}

export function createCountdownAudioPlayer(): CountdownAudioPlayer | null {
  const AudioContextCtor = getAudioContextConstructor();

  if (!AudioContextCtor) {
    return null;
  }

  let context: AudioContext | null = null;
  const scheduledNodes: AudioScheduledSourceNode[] = [];

  const stopScheduledNodes = () => {
    while (scheduledNodes.length > 0) {
      const node = scheduledNodes.pop();

      try {
        node?.stop();
      } catch {
        // Already stopped nodes throw in some browsers; they are harmless here.
      }
    }
  };

  const getContext = async () => {
    context ??= new AudioContextCtor();

    if (context.state === "suspended") {
      await context.resume();
    }

    return context;
  };

  return {
    async play() {
      const unlockedContext = await getContext();

      stopScheduledNodes();

      const startsAt = unlockedContext.currentTime + AUDIO_START_DELAY_SECONDS;
      [0, 1, 2].forEach((offset) => {
        scheduleBeep(
          unlockedContext,
          scheduledNodes,
          startsAt + offset,
          COUNTDOWN_BEEP_FREQUENCY,
          COUNTDOWN_BEEP_SECONDS,
        );
      });
      scheduleBeep(
        unlockedContext,
        scheduledNodes,
        startsAt + 3,
        SHOOT_BEEP_FREQUENCY,
        SHOOT_BEEP_SECONDS,
      );
    },
    dispose() {
      stopScheduledNodes();
      void context?.close();
      context = null;
    },
  };
}
