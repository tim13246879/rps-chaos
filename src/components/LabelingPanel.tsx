import type { Move } from "../types";

interface LabelingPanelProps {
  sampleCount: number;
  onLabel: (label: Move) => void;
  onExport: () => void;
}

const LABELS: Move[] = ["rock", "paper", "scissors", "unknown"];

export function LabelingPanel({ sampleCount, onLabel, onExport }: LabelingPanelProps) {
  return (
    <div className="labeling-panel">
      <div className="labeling-panel__header">
        <span>Labeling mode</span>
        <b>{sampleCount} sample{sampleCount === 1 ? "" : "s"}</b>
      </div>
      <div className="labeling-grid">
        {LABELS.map((label) => (
          <button
            key={label}
            type="button"
            className="button"
            onClick={() => onLabel(label)}
          >
            Label {label}
          </button>
        ))}
      </div>
      <button type="button" className="button button--primary" onClick={onExport} disabled={sampleCount === 0}>
        Export samples
      </button>
    </div>
  );
}
