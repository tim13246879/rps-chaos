import type { FrameFeatures, LandmarkPoint } from "../types";

const FINGER_INDICES = {
  index: { mcp: 5, pip: 6, dip: 7, tip: 8 },
  middle: { mcp: 9, pip: 10, dip: 11, tip: 12 },
  ring: { mcp: 13, pip: 14, dip: 15, tip: 16 },
  pinky: { mcp: 17, pip: 18, dip: 19, tip: 20 },
} as const;

function distance(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function angleDegrees(a: LandmarkPoint, b: LandmarkPoint, c: LandmarkPoint): number {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: (c.z ?? 0) - (b.z ?? 0) };
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const abLength = Math.hypot(ab.x, ab.y, ab.z);
  const cbLength = Math.hypot(cb.x, cb.y, cb.z);

  if (abLength === 0 || cbLength === 0) {
    return 0;
  }

  const cosine = Math.max(-1, Math.min(1, dot / (abLength * cbLength)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function straightness(angle: number): number {
  return clamp01((angle - 70) / 105);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getPalmCenter(landmarks: LandmarkPoint[]): { x: number; y: number } {
  const palm = [landmarks[0], landmarks[5], landmarks[9], landmarks[13], landmarks[17]];
  return {
    x: average(palm.map((point) => point.x)),
    y: average(palm.map((point) => point.y)),
  };
}

function getPalmSize(landmarks: LandmarkPoint[]): number {
  return Math.max(distance(landmarks[0], landmarks[9]), distance(landmarks[5], landmarks[17]), 0.001);
}

function fingerExtension(
  landmarks: LandmarkPoint[],
  palmSize: number,
  finger: keyof typeof FINGER_INDICES,
): { extension: number; angle: number } {
  const indices = FINGER_INDICES[finger];
  const mcp = landmarks[indices.mcp];
  const pip = landmarks[indices.pip];
  const dip = landmarks[indices.dip];
  const tip = landmarks[indices.tip];
  const wrist = landmarks[0];
  const pipAngle = angleDegrees(mcp, pip, dip);
  const dipAngle = angleDegrees(pip, dip, tip);
  const jointStraightness = (straightness(pipAngle) + straightness(dipAngle)) / 2;
  const baseDistance = distance(mcp, wrist) / palmSize;
  const tipDistance = distance(tip, wrist) / palmSize;
  const reach = clamp01((tipDistance - baseDistance * 0.7) / 1.15);

  return {
    extension: clamp01(jointStraightness * 0.68 + reach * 0.32),
    angle: (pipAngle + dipAngle) / 2,
  };
}

function thumbExtension(landmarks: LandmarkPoint[], palmSize: number): number {
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];
  const lateralReach = distance(thumbTip, indexMcp) / palmSize;
  const palmSpan = distance(indexMcp, pinkyMcp) / palmSize;
  const wristReach = distance(thumbTip, wrist) / palmSize;

  return clamp01(lateralReach * 0.55 + wristReach * 0.25 + palmSpan * 0.2 - 0.18);
}

export function extractFrameFeatures(
  landmarks: LandmarkPoint[] | undefined,
  timestamp: number,
  previous?: FrameFeatures,
): FrameFeatures | null {
  if (!landmarks || landmarks.length < 21) {
    return null;
  }

  const palmSize = getPalmSize(landmarks);
  const palmCenter = getPalmCenter(landmarks);
  const index = fingerExtension(landmarks, palmSize, "index");
  const middle = fingerExtension(landmarks, palmSize, "middle");
  const ring = fingerExtension(landmarks, palmSize, "ring");
  const pinky = fingerExtension(landmarks, palmSize, "pinky");
  const scissorsSpread = distance(landmarks[8], landmarks[12]) / palmSize;
  const previousAverage = previous
    ? average([
        previous.fingerExtensions.index,
        previous.fingerExtensions.middle,
        previous.fingerExtensions.ring,
        previous.fingerExtensions.pinky,
      ])
    : average([index.extension, middle.extension, ring.extension, pinky.extension]);
  const currentAverage = average([index.extension, middle.extension, ring.extension, pinky.extension]);
  const deltaSeconds = previous ? Math.max(0.016, (timestamp - previous.timestamp) / 1000) : 1;

  return {
    timestamp,
    palmSize,
    palmCenter,
    fingerExtensions: {
      thumb: thumbExtension(landmarks, palmSize),
      index: index.extension,
      middle: middle.extension,
      ring: ring.extension,
      pinky: pinky.extension,
    },
    fingerAngles: {
      index: index.angle,
      middle: middle.angle,
      ring: ring.angle,
      pinky: pinky.angle,
    },
    averageFingerVelocity: (currentAverage - previousAverage) / deltaSeconds,
    scissorsSpread,
    handPresent: true,
  };
}
