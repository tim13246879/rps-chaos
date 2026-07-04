import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlayerStage } from "../components/PlayerStage";
import { getRoundClock } from "../game/round";
import type { VisionSnapshot } from "../vision/useHandVision";

function snapshot(overrides: Partial<VisionSnapshot> = {}): VisionSnapshot {
  return {
    modelReady: true,
    cameraReady: true,
    handVisible: true,
    fps: 30,
    error: null,
    features: null,
    prediction: {
      move: "rock",
      confidence: 0.8,
      margin: 0.2,
      scores: {
        rock: 0.8,
        paper: 0.1,
        scissors: 0.05,
        unknown: 0.05,
      },
      stableFrames: 3,
    },
    calibratedAt: null,
    ...overrides,
  };
}

function renderPlayerStage(props: Partial<Parameters<typeof PlayerStage>[0]> = {}) {
  return renderToStaticMarkup(
    <PlayerStage
      videoRef={createRef<HTMLVideoElement>()}
      canvasRef={createRef<HTMLCanvasElement>()}
      snapshot={snapshot()}
      clock={getRoundClock(null, 0)}
      computerMove="paper"
      lockedAtMs={null}
      error={null}
      onToggleCamera={() => undefined}
      onStartRound={() => undefined}
      {...props}
    />,
  );
}

describe("PlayerStage", () => {
  it("keeps the idle surface focused on the camera and computer move", () => {
    const html = renderPlayerStage();

    expect(html).toContain("Computer move");
    expect(html).toContain("Paper");
    expect(html).not.toContain("Ready");
    expect(html).not.toContain("camera-overlay");
    expect(html).not.toContain("player-stage__countdown");
    expect(html).not.toContain("Confidence");
    expect(html).not.toContain("History");
    expect(html).not.toContain("Calibrate");
    expect(html).not.toContain("Practice mode");
  });

  it("leaves countdown display to the fullscreen overlay during a round", () => {
    const html = renderPlayerStage({
      clock: getRoundClock(1000, 1000),
    });

    expect(html).toContain("Playing");
    expect(html).not.toContain("player-stage__countdown");
  });

  it("starts with a camera action before camera permission is active", () => {
    const html = renderPlayerStage({
      snapshot: snapshot({ cameraReady: false, handVisible: false }),
    });

    expect(html).toContain("Start camera");
    expect(html).not.toContain("Start round");
  });
});
