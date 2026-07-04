import type { CountdownOverlayState } from "../game/round";

export function CountdownOverlay({ visible, value, step, isShoot }: CountdownOverlayState) {
  if (!visible) {
    return null;
  }

  return (
    <div className="countdown-overlay" aria-hidden="true">
      <span
        key={step}
        className={`countdown-overlay__value ${isShoot ? "countdown-overlay__value--shoot" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
