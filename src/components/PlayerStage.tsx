import type { RefObject } from "react";
import { MOVE_LABELS } from "../game/moves";
import type { RoundClock } from "../game/round";
import type { Move } from "../types";
import type { VisionSnapshot } from "../vision/useHandVision";
import { CameraPanel } from "./CameraPanel";
import { MoveGlyph } from "./MoveGlyph";

interface PlayerStageProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  snapshot: VisionSnapshot;
  clock: RoundClock;
  computerMove: Move;
  lockedAtMs: number | null;
  error: string | null;
  onToggleCamera: () => void;
  onStartRound: () => void;
}

export function PlayerStage({
  videoRef,
  canvasRef,
  snapshot,
  clock,
  computerMove,
  lockedAtMs,
  error,
  onToggleCamera,
  onStartRound,
}: PlayerStageProps) {
  const isRoundActive = clock.phase === "countdown" || clock.phase === "shoot";
  const primaryAction = snapshot.cameraReady ? "Start round" : "Start camera";
  const canStartRound = snapshot.cameraReady && !isRoundActive;

  return (
    <section className="player-stage" aria-label="Rock paper scissors game">
      <div className="player-stage__arena">
        <div className="player-stage__camera">
          <CameraPanel
            videoRef={videoRef}
            canvasRef={canvasRef}
            snapshot={snapshot}
            showMetrics={false}
            showOverlay={false}
          />
        </div>

        <div className={`player-stage__move ${lockedAtMs !== null ? "player-stage__move--locked" : ""}`}>
          <span>Computer move</span>
          <MoveGlyph move={computerMove} />
          <strong>{MOVE_LABELS[computerMove]}</strong>
        </div>
      </div>

      <div className="player-stage__actions">
        <button
          type="button"
          className="button button--primary player-stage__button"
          onClick={snapshot.cameraReady ? onStartRound : onToggleCamera}
          disabled={snapshot.cameraReady && !canStartRound}
        >
          {isRoundActive ? "Playing" : primaryAction}
        </button>
        {snapshot.cameraReady && (
          <button type="button" className="button player-stage__ghost-button" onClick={onToggleCamera}>
            Stop camera
          </button>
        )}
      </div>

      {error && <div className="error-box player-stage__error">{error}</div>}
    </section>
  );
}
