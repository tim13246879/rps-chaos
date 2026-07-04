import type { Move, PredictionResult, RoundPhase } from "../types";

export const COUNTDOWN_MS = 3000;
export const PREDICTION_WINDOW_START_MS = COUNTDOWN_MS - 350;
export const PREDICTION_WINDOW_END_MS = COUNTDOWN_MS + 100;
export const RESULT_HOLD_MS = 1100;
export const COUNTDOWN_OVERLAY_END_MS = COUNTDOWN_MS + 700;
export const LOCK_CONFIDENCE = 0.62;
export const LOCK_MARGIN = 0.12;
export const LOCK_STABLE_FRAMES = 2;

export interface RoundClock {
  elapsedMs: number;
  phase: RoundPhase;
  label: string;
  progress: number;
  isPredictionWindow: boolean;
  isPastPredictionWindow: boolean;
}

export function getRoundClock(startedAt: number | null, now: number): RoundClock {
  if (startedAt === null) {
    return {
      elapsedMs: 0,
      phase: "idle",
      label: "Ready",
      progress: 0,
      isPredictionWindow: false,
      isPastPredictionWindow: false,
    };
  }

  const elapsedMs = Math.max(0, now - startedAt);
  const phase = getRoundPhase(elapsedMs);

  return {
    elapsedMs,
    phase,
    label: getRoundLabel(elapsedMs),
    progress: Math.min(1, elapsedMs / (COUNTDOWN_MS + RESULT_HOLD_MS)),
    isPredictionWindow:
      elapsedMs >= PREDICTION_WINDOW_START_MS &&
      elapsedMs <= PREDICTION_WINDOW_END_MS,
    isPastPredictionWindow: elapsedMs > PREDICTION_WINDOW_END_MS,
  };
}

export function getRoundPhase(elapsedMs: number): RoundPhase {
  if (elapsedMs < COUNTDOWN_MS) {
    return "countdown";
  }

  if (elapsedMs <= PREDICTION_WINDOW_END_MS) {
    return "shoot";
  }

  return "result";
}

export function getRoundLabel(elapsedMs: number): string {
  if (elapsedMs < 1000) {
    return "3";
  }

  if (elapsedMs < 2000) {
    return "2";
  }

  if (elapsedMs < COUNTDOWN_MS) {
    return "1";
  }

  return "SHOOT";
}

export interface CountdownOverlayState {
  visible: boolean;
  value: string;
  step: number;
  isShoot: boolean;
}

export function getCountdownOverlay(startedAt: number | null, now: number): CountdownOverlayState {
  if (startedAt === null) {
    return { visible: false, value: "", step: -1, isShoot: false };
  }

  const elapsedMs = Math.max(0, now - startedAt);

  if (elapsedMs >= COUNTDOWN_OVERLAY_END_MS) {
    return { visible: false, value: "", step: -1, isShoot: false };
  }

  const value = getRoundLabel(elapsedMs);
  const step = elapsedMs < COUNTDOWN_MS ? Math.floor(elapsedMs / 1000) : 3;

  return { visible: true, value, step, isShoot: elapsedMs >= COUNTDOWN_MS };
}

export function shouldLockPrediction(prediction: PredictionResult): boolean {
  return (
    prediction.move !== "unknown" &&
    prediction.confidence >= LOCK_CONFIDENCE &&
    prediction.margin >= LOCK_MARGIN &&
    prediction.stableFrames >= LOCK_STABLE_FRAMES
  );
}

export function pickBetterPrediction(
  currentBest: PredictionResult | null,
  next: PredictionResult,
): PredictionResult | null {
  if (next.move === "unknown") {
    return currentBest;
  }

  if (currentBest === null) {
    return next;
  }

  if (next.confidence > currentBest.confidence) {
    return next;
  }

  if (next.confidence === currentBest.confidence && next.margin > currentBest.margin) {
    return next;
  }

  return currentBest;
}

export function isLowConfidenceLock(prediction: PredictionResult): boolean {
  return prediction.move === "unknown" || !shouldLockPrediction(prediction);
}

export function getMachineStatus(
  phase: RoundPhase,
  lockedMove: Move,
  handVisible: boolean,
): string {
  if (!handVisible) {
    return "Show one hand in frame";
  }

  if (phase === "idle") {
    return "Camera Ready";
  }

  if (phase === "countdown" && lockedMove === "unknown") {
    return "Predicting";
  }

  if (phase === "shoot" || lockedMove !== "unknown") {
    return "Counter locked";
  }

  return "Reading gesture";
}

export function getPlayerCounterMove(phase: RoundPhase, counterMove: Move): Move {
  if (phase === "shoot" || phase === "result") {
    return counterMove;
  }

  return "unknown";
}
