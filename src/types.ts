export type Move = "rock" | "paper" | "scissors" | "unknown";

export type FingerName = "thumb" | "index" | "middle" | "ring" | "pinky";

export type FingerExtensions = Record<FingerName, number>;

export type FingerAngles = Record<Exclude<FingerName, "thumb">, number>;

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface FrameFeatures {
  timestamp: number;
  palmSize: number;
  palmCenter: { x: number; y: number };
  fingerExtensions: FingerExtensions;
  fingerAngles: FingerAngles;
  averageFingerVelocity: number;
  scissorsSpread: number;
  handPresent: boolean;
}

export interface PredictionResult {
  move: Move;
  confidence: number;
  margin: number;
  scores: Record<Move, number>;
  stableFrames: number;
}

export type RoundPhase = "idle" | "countdown" | "shoot" | "result";

export interface RoundRecord {
  id: string;
  userMove: Move;
  counterMove: Move;
  confidence: number;
  lockedAtMs: number;
  lowConfidence: boolean;
  createdAt: number;
}

export interface LabeledSample {
  id: string;
  timestamp: number;
  features: FrameFeatures;
  predictedMove: Move;
  predictedConfidence: number;
  predictedMargin: number;
  userLabel: Move;
}
