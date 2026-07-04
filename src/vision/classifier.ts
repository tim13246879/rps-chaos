import type { FrameFeatures, Move, PredictionResult } from "../types";
import { DEFAULT_WEIGHTS, type ClassifierWeights } from "../config/weights";

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

export function scoreFromFeatures(
  features: FrameFeatures,
  weights: ClassifierWeights = DEFAULT_WEIGHTS,
): Record<Move, number> {
  const { index, middle, ring, pinky } = features.fingerExtensions;
  const allAverage = average([index, middle, ring, pinky]);
  const closedAverage = average([1 - index, 1 - middle, 1 - ring, 1 - pinky]);
  const minOpen = Math.min(index, middle, ring, pinky);
  const maxOpen = Math.max(index, middle, ring, pinky);
  const allClosedMin = Math.min(1 - index, 1 - middle, 1 - ring, 1 - pinky);
  const scissorsOpen = average([index, middle]);
  const scissorsClosed = average([1 - ring, 1 - pinky]);
  const scissorsSpread = clamp01(
    (features.scissorsSpread - weights.scissors.spreadTarget) / weights.scissors.spreadTolerance,
  );
  const velocity = features.averageFingerVelocity;
  const openingBoost = clamp01(velocity / weights.velocity.divisor) * weights.velocity.boostWeight;
  const closingBoost = clamp01(-velocity / weights.velocity.divisor) * weights.velocity.boostWeight;

  const rock = clamp01(
    (closedAverage * weights.rock.closedAverageWeight + allClosedMin * weights.rock.allClosedMinWeight) *
      (1 - maxOpen * weights.rock.maxOpenPenalty) +
      average([
        closeness(index, weights.rock.fingerTargets.target, weights.rock.fingerTargets.tolerance),
        closeness(middle, weights.rock.fingerTargets.target, weights.rock.fingerTargets.tolerance),
        closeness(ring, weights.rock.fingerTargets.target, weights.rock.fingerTargets.tolerance),
        closeness(pinky, weights.rock.fingerTargets.target, weights.rock.fingerTargets.tolerance),
      ]) *
        weights.rock.fingerTargetWeight +
      closingBoost,
  );

  const paper = clamp01(
    (allAverage * weights.paper.allAverageWeight + minOpen * weights.paper.minOpenWeight) *
      weights.paper.scale +
      average([
        closeness(index, weights.paper.fingerTargets.index.target, weights.paper.fingerTargets.index.tolerance),
        closeness(middle, weights.paper.fingerTargets.middle.target, weights.paper.fingerTargets.middle.tolerance),
        closeness(ring, weights.paper.fingerTargets.ring.target, weights.paper.fingerTargets.ring.tolerance),
        closeness(pinky, weights.paper.fingerTargets.pinky.target, weights.paper.fingerTargets.pinky.tolerance),
      ]) *
        weights.paper.fingerTargetWeight +
      openingBoost,
  );

  const scissors = clamp01(
    scissorsOpen * weights.scissors.openWeight +
      scissorsClosed * weights.scissors.closedWeight +
      Math.min(index, middle) * weights.scissors.minOpenPairWeight +
      Math.min(1 - ring, 1 - pinky) * weights.scissors.minClosedPairWeight +
      scissorsSpread * weights.scissors.spreadWeight +
      openingBoost * weights.scissors.openingBoostWeight,
  );

  const ambiguity =
    weights.ambiguity.base + clamp01(weights.ambiguity.scale - Math.max(rock, paper, scissors) * weights.ambiguity.scale);

  return normalizeScores({
    rock,
    paper,
    scissors,
    unknown: ambiguity,
  });
}

export function classifyFeatures(
  features: FrameFeatures,
  weights: ClassifierWeights = DEFAULT_WEIGHTS,
): PredictionResult {
  const scores = scoreFromFeatures(features, weights);
  const top = topMove(scores);

  if (top.confidence < weights.unknownThresholds.minConfidence || top.margin < weights.unknownThresholds.minMargin) {
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

export function classifySequence(
  history: FrameFeatures[],
  weights: ClassifierWeights = DEFAULT_WEIGHTS,
): PredictionResult {
  const recent = history.slice(-weights.sequence.windowSize);

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
      const frameScores = scoreFromFeatures(frame, weights);
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
  const trailingMoves = recent.map((frame) => classifyFeatures(frame, weights)).map((prediction) => prediction.move);
  let stableFrames = 0;

  for (let index = trailingMoves.length - 1; index >= 0; index -= 1) {
    if (trailingMoves[index] !== top.move) {
      break;
    }

    stableFrames += 1;
  }

  if (top.confidence < weights.unknownThresholds.minConfidence || top.margin < weights.unknownThresholds.minMargin) {
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
