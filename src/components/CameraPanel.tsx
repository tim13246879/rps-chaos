import type { RefObject } from "react";
import type { VisionSnapshot } from "../vision/useHandVision";
import { formatPercent } from "../game/moves";

interface CameraPanelProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  snapshot: VisionSnapshot;
}

export function CameraPanel({ videoRef, canvasRef, snapshot }: CameraPanelProps) {
  return (
    <section className="camera-panel" aria-label="Camera analysis">
      <div className="camera-shell">
        <video ref={videoRef} className="camera-video" playsInline muted />
        <canvas ref={canvasRef} className="camera-overlay" />
        {!snapshot.cameraReady && (
          <div className="camera-empty">
            <div className="camera-empty__title">Camera standby</div>
            <div className="camera-empty__copy">Enable the webcam to start reading your hand.</div>
          </div>
        )}
        {snapshot.cameraReady && !snapshot.handVisible && (
          <div className="camera-hint">Show one hand in frame</div>
        )}
      </div>
      <div className="camera-metrics">
        <span>Vision FPS {Math.round(snapshot.fps)}</span>
        <span>Confidence {formatPercent(snapshot.prediction.confidence)}</span>
        <span>Margin {formatPercent(snapshot.prediction.margin)}</span>
      </div>
    </section>
  );
}
