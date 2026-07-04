import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraPanel } from "./components/CameraPanel";
import { LabelingPanel } from "./components/LabelingPanel";
import { PredictionPanel } from "./components/PredictionPanel";
import { getCounterMove } from "./game/moves";
import {
  getMachineStatus,
  getRoundClock,
  isLowConfidenceLock,
  pickBetterPrediction,
  PREDICTION_WINDOW_END_MS,
  shouldLockPrediction,
  type RoundClock,
} from "./game/round";
import type { LabeledSample, Move, PredictionResult, RoundRecord } from "./types";
import { useHandVision } from "./vision/useHandVision";

const UNKNOWN_PREDICTION: PredictionResult = {
  move: "unknown",
  confidence: 0,
  margin: 0,
  scores: {
    rock: 0,
    paper: 0,
    scissors: 0,
    unknown: 1,
  },
  stableFrames: 0,
};

function makeRoundRecord(
  prediction: PredictionResult,
  elapsedMs: number,
  lowConfidence: boolean,
): RoundRecord {
  return {
    id: `${Date.now()}-${Math.round(elapsedMs)}`,
    userMove: prediction.move,
    counterMove: getCounterMove(prediction.move),
    confidence: prediction.confidence,
    lockedAtMs: elapsedMs,
    lowConfidence,
    createdAt: Date.now(),
  };
}

export default function App() {
  const { videoRef, canvasRef, snapshot, enableCamera, calibrate } = useHandVision();
  const [roundStartedAt, setRoundStartedAt] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(() => performance.now());
  const [lockedPrediction, setLockedPrediction] = useState<PredictionResult | null>(null);
  const [lockedAtMs, setLockedAtMs] = useState<number | null>(null);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [practiceMode, setPracticeMode] = useState(false);
  const [labelingMode, setLabelingMode] = useState(false);
  const [labeledSamples, setLabeledSamples] = useState<LabeledSample[]>([]);
  const bestLatePredictionRef = useRef<PredictionResult | null>(null);
  const recordedRoundRef = useRef(false);

  const roundClock: RoundClock = useMemo(
    () => getRoundClock(roundStartedAt, clockNow),
    [clockNow, roundStartedAt],
  );
  const activePrediction = snapshot.prediction ?? UNKNOWN_PREDICTION;
  const displayedPrediction = lockedPrediction ?? activePrediction;
  const lockedMove: Move = lockedPrediction?.move ?? "unknown";
  const counterMove = getCounterMove(displayedPrediction.move);
  const status = snapshot.cameraReady
    ? getMachineStatus(roundClock.phase, lockedMove, snapshot.handVisible)
    : "Camera standby";

  const startRound = useCallback(() => {
    if (!snapshot.cameraReady) {
      return;
    }

    bestLatePredictionRef.current = null;
    recordedRoundRef.current = false;
    setLockedPrediction(null);
    setLockedAtMs(null);
    setLowConfidence(false);
    setRoundStartedAt(performance.now());
  }, [snapshot.cameraReady]);

  const lockPrediction = useCallback(
    (prediction: PredictionResult, elapsedMs: number, fallback: boolean) => {
      const lock = prediction.move === "unknown" ? UNKNOWN_PREDICTION : prediction;
      setLockedPrediction(lock);
      setLockedAtMs(elapsedMs);
      setLowConfidence(fallback || isLowConfidenceLock(lock));

      if (!recordedRoundRef.current && lock.move !== "unknown") {
        recordedRoundRef.current = true;
        const record = makeRoundRecord(lock, elapsedMs, fallback || isLowConfidenceLock(lock));
        setHistory((current) => [record, ...current].slice(0, 10));
      }
    },
    [],
  );

  const recordLabel = useCallback(
    (label: Move) => {
      if (!snapshot.features || !snapshot.prediction) {
        return;
      }

      const sample: LabeledSample = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        features: snapshot.features,
        predictedMove: snapshot.prediction.move,
        predictedConfidence: snapshot.prediction.confidence,
        predictedMargin: snapshot.prediction.margin,
        userLabel: label,
      };

      setLabeledSamples((current) => [...current, sample]);
    },
    [snapshot.features, snapshot.prediction],
  );

  const exportLabeledSamples = useCallback(() => {
    const blob = new Blob([JSON.stringify(labeledSamples, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rps-labeled-samples-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [labeledSamples]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(performance.now()), 50);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (roundStartedAt === null) {
      return;
    }

    if (roundClock.isPredictionWindow) {
      bestLatePredictionRef.current = pickBetterPrediction(
        bestLatePredictionRef.current,
        activePrediction,
      );

      if (!lockedPrediction && shouldLockPrediction(activePrediction)) {
        lockPrediction(activePrediction, roundClock.elapsedMs, false);
      }
    }

    if (!lockedPrediction && roundClock.elapsedMs > PREDICTION_WINDOW_END_MS) {
      const fallbackPrediction = bestLatePredictionRef.current ?? activePrediction;
      lockPrediction(fallbackPrediction, roundClock.elapsedMs, true);
    }
  }, [activePrediction, lockPrediction, lockedPrediction, roundClock, roundStartedAt]);

  useEffect(() => {
    if (practiceMode || roundStartedAt === null) {
      return;
    }

    if (roundClock.elapsedMs > PREDICTION_WINDOW_END_MS + 1200) {
      setRoundStartedAt(null);
    }
  }, [practiceMode, roundClock.elapsedMs, roundStartedAt]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>RPS Oracle</h1>
          <p>Webcam hand tracking that predicts the reveal and plays the winning counter.</p>
        </div>
        <div className="app-header__meta">
          <span>{snapshot.modelReady ? "Model ready" : "Model idle"}</span>
          <span>{snapshot.cameraReady ? "Camera live" : "Camera off"}</span>
        </div>
      </header>

      <div className="app-layout">
        <CameraPanel videoRef={videoRef} canvasRef={canvasRef} snapshot={snapshot} />
        <PredictionPanel
          status={status}
          clock={roundClock}
          prediction={activePrediction}
          counterMove={counterMove}
          lockedMove={lockedMove}
          lockedAtMs={lockedAtMs}
          lowConfidence={lowConfidence}
          history={history}
          practiceMode={practiceMode}
          labelingMode={labelingMode}
          modelReady={snapshot.modelReady}
          cameraReady={snapshot.cameraReady}
          error={snapshot.error}
          onEnableCamera={enableCamera}
          onStartRound={startRound}
          onCalibrate={calibrate}
          onTogglePractice={() => setPracticeMode((current) => !current)}
          onToggleLabeling={() => setLabelingMode((current) => !current)}
        />
        {labelingMode && (
          <LabelingPanel
            sampleCount={labeledSamples.length}
            onLabel={recordLabel}
            onExport={exportLabeledSamples}
          />
        )}
      </div>
    </main>
  );
}
