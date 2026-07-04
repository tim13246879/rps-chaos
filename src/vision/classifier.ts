import type { FrameFeatures, Move, PredictionResult } from "../types";

const UNKNOWN_SCORES: Record<Move, number> = {
  rock: 0,
  paper: 0,
  scissors: 0,
  unknown: 1,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function closeness(value: number, target: number, tolerance: number): number {
  return clamp01(1 - Math.abs(value - target) / tolerance);
}

function normalizeScores(raw: Record<Move, number>): Record<Move, number> {
  const total = raw.rock + raw.paper + raw.scissors + raw.unknown;

  if (total <= 0) {
    return UNKNOWN_SCORES;
  }

  return {
    rock: raw.rock / total,
    paper: raw.paper / total,
    scissors: raw.scissors / total,
    unknown: raw.unknown / total,
  };
}

function topMove(scores: Record<Move, number>): { move: Move; confidence: number; margin: number } {
  const ordered = (Object.entries(scores) as Array<[Move, number]>).sort((a, b) => b[1] - a[1]);
  const [best, second] = ordered;

  return {
    move: best[0],
    confidence: best[1],
    margin: best[1] - (second?.[1] ?? 0),
  };
}

export function scoreFromFeatures(features: FrameFeatures): Record<Move, number> {
  const { index, middle, ring, pinky } = features.fingerExtensions;
  const allAverage = average([index, middle, ring, pinky]);
  const closedAverage = average([1 - index, 1 - middle, 1 - ring, 1 - pinky]);
  const minOpen = Math.min(index, middle, ring, pinky);
  const maxOpen = Math.max(index, middle, ring, pinky);
  const allClosedMin = Math.min(1 - index, 1 - middle, 1 - ring, 1 - pinky);
  const scissorsOpen = average([index, middle]);
  const scissorsClosed = average([1 - ring, 1 - pinky]);
  const scissorsSpread = clamp01((features.scissorsSpread - 0.12) / 0.34);
  const velocity = features.averageFingerVelocity;
  const openingBoost = clamp01(velocity / 2.4) * 0.08;
  const closingBoost = clamp01(-velocity / 2.4) * 0.08;

  const rock = clamp01(
    (closedAverage * 0.45 + allClosedMin * 0.55) * (1 - maxOpen * 0.35) +
      average([
        closeness(index, 0.08, 0.42),
        closeness(middle, 0.08, 0.42),
        closeness(ring, 0.08, 0.42),
        closeness(pinky, 0.08, 0.42),
      ]) *
        0.1 +
      closingBoost,
  );

  const paper = clamp01(
    (allAverage * 0.3 + minOpen * 0.7) * 1.18 +
      average([
        closeness(index, 0.9, 0.45),
        closeness(middle, 0.9, 0.45),
        closeness(ring, 0.82, 0.48),
        closeness(pinky, 0.78, 0.52),
      ]) *
        0.08 +
      openingBoost,
  );

  const scissors = clamp01(
    scissorsOpen * 0.3 +
      scissorsClosed * 0.3 +
      Math.min(index, middle) * 0.16 +
      Math.min(1 - ring, 1 - pinky) * 0.16 +
      scissorsSpread * 0.18 +
      openingBoost * 0.4,
  );

  const ambiguity = 0.18 + clamp01(0.18 - Math.max(rock, paper, scissors) * 0.18);

  return normalizeScores({
    rock,
    paper,
    scissors,
    unknown: ambiguity,
  });
}

export function classifyFeatures(features: FrameFeatures): PredictionResult {
  const scores = scoreFromFeatures(features);
  const top = topMove(scores);

  if (top.confidence < 0.36 || top.margin < 0.04) {
    return {
      move: "unknown",
      confidence: top.confidence,
      margin: top.margin,
      scores,
      stableFrames: 0,
    };
  }

  return {
    ...top,
    scores,
    stableFrames: 1,
  };
}

export function classifySequence(history: FrameFeatures[]): PredictionResult {
  const recent = history.slice(-6);

  if (recent.length === 0) {
    return {
      move: "unknown",
      confidence: 0,
      margin: 0,
      scores: UNKNOWN_SCORES,
      stableFrames: 0,
    };
  }

  const weighted = recent.reduce<Record<Move, number>>(
    (scores, frame, index) => {
      const weight = index + 1;
      const frameScores = scoreFromFeatures(frame);
      scores.rock += frameScores.rock * weight;
      scores.paper += frameScores.paper * weight;
      scores.scissors += frameScores.scissors * weight;
      scores.unknown += frameScores.unknown * weight;
      return scores;
    },
    { rock: 0, paper: 0, scissors: 0, unknown: 0 },
  );
  const scores = normalizeScores(weighted);
  const top = topMove(scores);
  const trailingMoves = recent.map(classifyFeatures).map((prediction) => prediction.move);
  let stableFrames = 0;

  for (let index = trailingMoves.length - 1; index >= 0; index -= 1) {
    if (trailingMoves[index] !== top.move) {
      break;
    }

    stableFrames += 1;
  }

  if (top.confidence < 0.36 || top.margin < 0.04) {
    return {
      move: "unknown",
      confidence: top.confidence,
      margin: top.margin,
      scores,
      stableFrames: 0,
    };
  }

  return {
    ...top,
    scores,
    stableFrames,
  };
}
