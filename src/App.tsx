import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CHAOS_LEVEL } from "./chaos/drift";
import { useChaosDrift } from "./chaos/useChaosDrift";
import { CameraPanel } from "./components/CameraPanel";
import { ChaosToggles } from "./components/ChaosToggles";
import { CountdownOverlay } from "./components/CountdownOverlay";
import { PlayerStage } from "./components/PlayerStage";
import { PredictionPanel } from "./components/PredictionPanel";
import {
  COUNTDOWN_AUDIO_LEAD_MS,
  createCountdownAudioPlayer,
  type CountdownAudioPlayer,
} from "./countdownAudio";
import { getCounterMove } from "./game/moves";
import {
  getCountdownOverlay,
  getMachineStatus,
  getPlayerCounterMove,
  getRoundClock,
  isLowConfidenceLock,
  pickBetterPrediction,
  PREDICTION_WINDOW_END_MS,
  shouldLockPrediction,
  type RoundClock,
} from "./game/round";
import type { Move, PredictionResult, RoundRecord } from "./types";
import { useHandVision } from "./vision/useHandVision";

const DISTORT_MODE = import.meta.env.VITE_DISTORT === "1";

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
  const { videoRef, canvasRef, snapshot, enableCamera, stopCamera, calibrate } = useHandVision();
  const chaos = useChaosDrift();
  const [roundStartedAt, setRoundStartedAt] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(() => performance.now());
  const [lockedPrediction, setLockedPrediction] = useState<PredictionResult | null>(null);
  const [lockedAtMs, setLockedAtMs] = useState<number | null>(null);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [practiceMode, setPracticeMode] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const countdownAudioRef = useRef<CountdownAudioPlayer | null>(null);
  const bestLatePredictionRef = useRef<PredictionResult | null>(null);
  const recordedRoundRef = useRef(false);

  const roundClock: RoundClock = useMemo(
    () => getRoundClock(roundStartedAt, clockNow),
    [clockNow, roundStartedAt],
  );
  const countdownOverlay = useMemo(
    () =>
      getCountdownOverlay(
        roundStartedAt === null ? null : roundStartedAt - COUNTDOWN_AUDIO_LEAD_MS,
        clockNow,
      ),
    [clockNow, roundStartedAt],
  );
  const activePrediction = snapshot.prediction ?? UNKNOWN_PREDICTION;
  const displayedPrediction =
    lockedAtMs === null ? activePrediction : lockedPrediction ?? UNKNOWN_PREDICTION;
  const lockedMove: Move = lockedPrediction?.move ?? "unknown";
  const counterMove = getCounterMove(displayedPrediction.move);
  const playerCounterMove = getPlayerCounterMove(roundClock.phase, counterMove);
  const playerLockedAtMs = playerCounterMove === "unknown" ? null : lockedAtMs;
  const status = snapshot.cameraReady
    ? getMachineStatus(roundClock.phase, lockedMove, snapshot.handVisible)
    : "Camera standby";

  const toggleCamera = useCallback(() => {
    if (snapshot.cameraReady) {
      stopCamera();
      setRoundStartedAt(null);
      setLockedPrediction(null);
      setLockedAtMs(null);
      setLowConfidence(false);
      return;
    }

    void enableCamera();
  }, [enableCamera, snapshot.cameraReady, stopCamera]);

  const startRound = useCallback(() => {
    if (!snapshot.cameraReady) {
      return;
    }

    countdownAudioRef.current ??= createCountdownAudioPlayer();
    void countdownAudioRef.current?.play();

    bestLatePredictionRef.current = null;
    recordedRoundRef.current = false;
    setLockedPrediction(null);
    setLockedAtMs(null);
    setLowConfidence(false);
    setRoundStartedAt(performance.now() + COUNTDOWN_AUDIO_LEAD_MS);
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

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(performance.now()), 50);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => countdownAudioRef.current?.dispose();
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
    <main className={`app-shell ${devMode ? "app-shell--dev" : "app-shell--player"}`}>
      <CountdownOverlay {...countdownOverlay} />
      <header className="app-header">
        <div>
          <h1>Rock Paper Scissor Chaos</h1>
          {devMode && <p>Webcam hand tracking that predicts the reveal and plays the winning counter.</p>}
        </div>
        <div className="app-header__meta">
          {devMode && <span>{snapshot.modelReady ? "Model ready" : "Model idle"}</span>}
          {devMode && <span>{snapshot.cameraReady ? "Camera live" : "Camera off"}</span>}
          <button
            type="button"
            className={`mode-toggle ${devMode ? "mode-toggle--active" : ""}`}
            onClick={() => setDevMode((current) => !current)}
          >
            Dev mode
          </button>
        </div>
      </header>

      {devMode ? (
        <div className="app-layout">
          <CameraPanel videoRef={videoRef} canvasRef={canvasRef} snapshot={snapshot} />
          <PredictionPanel
            status={status}
            clock={roundClock}
            prediction={displayedPrediction}
            counterMove={counterMove}
            lockedMove={lockedMove}
            lockedAtMs={lockedAtMs}
            lowConfidence={lowConfidence}
            history={history}
            practiceMode={practiceMode}
            modelReady={snapshot.modelReady}
            cameraReady={snapshot.cameraReady}
            error={snapshot.error}
            onToggleCamera={toggleCamera}
            onStartRound={startRound}
            onCalibrate={calibrate}
            onTogglePractice={() => setPracticeMode((current) => !current)}
          />
        </div>
      ) : (
        <PlayerStage
          videoRef={videoRef}
          canvasRef={canvasRef}
          snapshot={snapshot}
          clock={roundClock}
          computerMove={playerCounterMove}
          lockedAtMs={playerLockedAtMs}
          error={snapshot.error}
          onToggleCamera={toggleCamera}
          onStartRound={startRound}
        />
      )}
      {chaos.level !== DEFAULT_CHAOS_LEVEL ? (
        <span className="chaos-indicator">{chaos.level}x</span>
      ) : null}
      {DISTORT_MODE ? <ChaosToggles effects={chaos.effects} onToggle={chaos.toggleEffect} /> : null}
    </main>
  );
}
