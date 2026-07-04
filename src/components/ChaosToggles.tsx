import type { ChaosEffect } from "../chaos/useChaosDrift";

const EFFECT_LABELS: Record<ChaosEffect, string> = {
  color: "Colour drift",
  blur: "Blur whisper",
  breathe: "Scale breathing",
  title: "Title phantom",
};

interface ChaosTogglesProps {
  effects: Record<ChaosEffect, boolean>;
  onToggle: (effect: ChaosEffect) => void;
}

export function ChaosToggles({ effects, onToggle }: ChaosTogglesProps) {
  return (
    <aside className="chaos-toggles" aria-label="Chaos effect toggles">
      {(Object.keys(EFFECT_LABELS) as ChaosEffect[]).map((effect) => (
        <label key={effect}>
          <input type="checkbox" checked={effects[effect]} onChange={() => onToggle(effect)} />
          <span>{EFFECT_LABELS[effect]}</span>
        </label>
      ))}
    </aside>
  );
}
