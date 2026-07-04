import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PredictionPanel } from "../components/PredictionPanel";
import { getRoundClock } from "../game/round";
import type { Move, PredictionResult } from "../types";

function prediction(move: Move, confidence = 0.8): PredictionResult {
  return {
    move,
    confidence,
    margin: 0.2,
    scores: {
      rock: move === "rock" ? confidence : 0.05,
      paper: move === "paper" ? confidence : 0.05,
      scissors: move === "scissors" ? confidence : 0.05,
      unknown: move === "unknown" ? 1 : 0.05,
    },
    stableFrames: 3,
  };
}

function renderPanel(props: Partial<Parameters<typeof PredictionPanel>[0]> = {}) {
  return renderToStaticMarkup(
    <PredictionPanel
      status="Predicting"
      clock={getRoundClock(null, 0)}
      prediction={prediction("rock")}
      counterMove="paper"
      lockedAtMs={null}
      lowConfidence={false}
      history={[]}
      practiceMode={false}
      modelReady={true}
      cameraReady={true}
      error={null}
      onEnableCamera={() => undefined}
      onStartRound={() => undefined}
      onCalibrate={() => undefined}
      onTogglePractice={() => undefined}
      {...props}
    />,
  );
}

describe("PredictionPanel", () => {
  it("shows the counter for the live likely move before lock", () => {
    const html = renderPanel({
      prediction: prediction("rock"),
      counterMove: "paper",
      lockedAtMs: null,
    });

    expect(html).toContain("Your likely move");
    expect(html).toContain("Rock");
    expect(html).toContain("Counter move");
    expect(html).toContain("Paper");
  });

  it("shows the counter for the locked prediction after lock", () => {
    const html = renderPanel({
      prediction: prediction("scissors"),
      counterMove: "rock",
      lockedAtMs: 3025,
    });

    expect(html).toContain("Scissors");
    expect(html).toContain("Rock");
    expect(html).toContain("Clean lock at 3025ms");
  });
});
