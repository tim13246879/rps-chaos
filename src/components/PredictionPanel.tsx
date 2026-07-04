import type { Move, PredictionResult, RoundRecord } from "../types";
import type { RoundClock } from "../game/round";
import { formatPercent, MOVE_LABELS } from "../game/moves";
import { MoveGlyph } from "./MoveGlyph";

interface PredictionPanelProps {
  status: string;
  clock: RoundClock;
  prediction: PredictionResult;
  counterMove: Move;
  lockedMove: Move;
  lockedAtMs: number | null;
  lowConfidence: boolean;
  history: RoundRecord[];
  practiceMode: boolean;
  modelReady: boolean;
  cameraReady: boolean;
  error: string | null;
  onToggleCamera: () => void;
  onStartRound: () => void;
  onCalibrate: () => void;
  onTogglePractice: () => void;
}

export function PredictionPanel({
  status,
  clock,
  prediction,
  counterMove,
  lockedMove,
  lockedAtMs,
  lowConfidence,
  history,
  practiceMode,
  modelReady,
  cameraReady,
  error,
  onToggleCamera,
  onStartRound,
  onCalibrate,
  onTogglePractice,
}: PredictionPanelProps) {
  const displayedUserMove = lockedMove === "unknown" ? prediction.move : lockedMove;

  return (
    <aside className="prediction-panel" aria-label="Prediction and counter move">
      <div className="status-line">
        <span className={`status-dot ${cameraReady ? "status-dot--ready" : ""}`} />
        <span>{status}</span>
      </div>

      <div className="countdown-box">
        <div className="countdown-box__label">Round timer</div>
        <div className="timer-track">
          <div style={{ width: `${clock.progress * 100}%` }} />
        </div>
      </div>

      <div className="move-grid">
        <div className="metric-block">
          <span>Your likely move</span>
          <strong>{MOVE_LABELS[displayedUserMove]}</strong>
        </div>
        <div className="metric-block">
          <span>Confidence</span>
          <strong>{formatPercent(prediction.confidence)}</strong>
        </div>
      </div>

      <div className={`counter-card ${lockedMove !== "unknown" ? "counter-card--locked" : ""}`}>
        <span>Counter move</span>
        <MoveGlyph move={counterMove} />
        <strong>{MOVE_LABELS[counterMove]}</strong>
        <small>
          {lockedAtMs === null
            ? "Waiting for the reveal window"
            : `${lowConfidence ? "Fallback lock" : "Clean lock"} at ${Math.round(lockedAtMs)}ms`}
        </small>
      </div>

      <div className="controls">
        <button
          type="button"
          className={`button ${cameraReady ? "button--danger" : "button--primary"}`}
          onClick={onToggleCamera}
        >
          {cameraReady ? "Stop camera" : modelReady ? "Start camera" : "Load model + camera"}
        </button>
        <button type="button" className="button" onClick={onStartRound} disabled={!cameraReady}>
          Start round
        </button>
        {/* <button type="button" className="button" onClick={onCalibrate} disabled={!cameraReady}>
          Calibrate
        </button>
        <button
          type="button"
          className={`button ${practiceMode ? "button--active" : ""}`}
          onClick={onTogglePractice}
        >
          Practice mode
        </button> */}
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="history">
        <div className="history__header">History</div>
        {history.length === 0 ? (
          <p>No rounds yet.</p>
        ) : (
          <ol>
            {history.map((record) => (
              <li key={record.id}>
                <MoveGlyph move={record.counterMove} size="small" />
                <span>
                  Beat {MOVE_LABELS[record.userMove]} with {MOVE_LABELS[record.counterMove]}
                </span>
                <b>{formatPercent(record.confidence)}</b>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
