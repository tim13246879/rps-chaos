import { DEFAULT_WEIGHTS, type ClassifierWeights } from "../config/weights";
import type { Move, PredictionResult, RoundPhase } from "../types";

export const COUNTDOWN_MS = 3000;
export const PREDICTION_WINDOW_START_MS = COUNTDOWN_MS - 350;
export const PREDICTION_WINDOW_END_MS = COUNTDOWN_MS + 100;
export const RESULT_HOLD_MS = 1100;

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

export function shouldLockPrediction(
  prediction: PredictionResult,
  weights: ClassifierWeights = DEFAULT_WEIGHTS,
): boolean {
  return (
    prediction.move !== "unknown" &&
    prediction.confidence >= weights.lock.confidence &&
    prediction.margin >= weights.lock.margin &&
    prediction.stableFrames >= weights.lock.stableFrames
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

export function isLowConfidenceLock(
  prediction: PredictionResult,
  weights: ClassifierWeights = DEFAULT_WEIGHTS,
): boolean {
  return prediction.move === "unknown" || !shouldLockPrediction(prediction, weights);
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
