export interface FingerTarget {
  target: number;
  tolerance: number;
}

export interface RockWeights {
  closedAverageWeight: number;
  allClosedMinWeight: number;
  maxOpenPenalty: number;
  fingerTargets: FingerTarget;
  fingerTargetWeight: number;
}

export interface PaperWeights {
  allAverageWeight: number;
  minOpenWeight: number;
  scale: number;
  fingerTargets: {
    index: FingerTarget;
    middle: FingerTarget;
    ring: FingerTarget;
    pinky: FingerTarget;
  };
  fingerTargetWeight: number;
}

export interface ScissorsWeights {
  openWeight: number;
  closedWeight: number;
  minOpenPairWeight: number;
  minClosedPairWeight: number;
  spreadWeight: number;
  spreadTarget: number;
  spreadTolerance: number;
  openingBoostWeight: number;
}

export interface VelocityWeights {
  divisor: number;
  boostWeight: number;
}

export interface AmbiguityWeights {
  base: number;
  scale: number;
}

export interface UnknownThresholds {
  minConfidence: number;
  minMargin: number;
}

export interface SequenceWeights {
  windowSize: number;
}

export interface LockWeights {
  confidence: number;
  margin: number;
  stableFrames: number;
}

export interface ClassifierWeights {
  rock: RockWeights;
  paper: PaperWeights;
  scissors: ScissorsWeights;
  velocity: VelocityWeights;
  ambiguity: AmbiguityWeights;
  unknownThresholds: UnknownThresholds;
  sequence: SequenceWeights;
  lock: LockWeights;
}

export const DEFAULT_WEIGHTS: ClassifierWeights = {
  rock: {
    closedAverageWeight: 0.45,
    allClosedMinWeight: 0.55,
    maxOpenPenalty: 0.35,
    fingerTargets: { target: 0.08, tolerance: 0.42 },
    fingerTargetWeight: 0.1,
  },
  paper: {
    allAverageWeight: 0.3,
    minOpenWeight: 0.7,
    scale: 1.18,
    fingerTargets: {
      index: { target: 0.9, tolerance: 0.45 },
      middle: { target: 0.9, tolerance: 0.45 },
      ring: { target: 0.82, tolerance: 0.48 },
      pinky: { target: 0.78, tolerance: 0.52 },
    },
    fingerTargetWeight: 0.08,
  },
  scissors: {
    openWeight: 0.3,
    closedWeight: 0.3,
    minOpenPairWeight: 0.16,
    minClosedPairWeight: 0.16,
    spreadWeight: 0.18,
    spreadTarget: 0.12,
    spreadTolerance: 0.34,
    openingBoostWeight: 0.4,
  },
  velocity: {
    divisor: 2.4,
    boostWeight: 0.08,
  },
  ambiguity: {
    base: 0.18,
    scale: 0.18,
  },
  unknownThresholds: {
    minConfidence: 0.36,
    minMargin: 0.04,
  },
  sequence: {
    windowSize: 6,
  },
  lock: {
    confidence: 0.62,
    margin: 0.12,
    stableFrames: 2,
  },
};
