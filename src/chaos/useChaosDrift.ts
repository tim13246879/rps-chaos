import { useEffect, useRef, useState } from "react";
import { driftAt, effectiveMultiplier, nextChaosLevel } from "./drift";

const TICK_MS = 50;

export function useChaosDrift(): number {
  const [level, setLevel] = useState(1);
  const epochRef = useRef(performance.now());

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "C" &&
        event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.repeat
      ) {
        epochRef.current = performance.now();
        setLevel(nextChaosLevel);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const multiplier = effectiveMultiplier(level, reducedMotion);
    const rootStyle = document.documentElement.style;
    const tick = () => {
      const { hueDeg, warmth } = driftAt(performance.now() - epochRef.current, multiplier);
      rootStyle.setProperty("--chaos-hue", `${hueDeg}deg`);
      rootStyle.setProperty("--chaos-warmth", `${warmth}`);
    };
    tick();
    const interval = window.setInterval(tick, TICK_MS);
    return () => {
      window.clearInterval(interval);
      rootStyle.removeProperty("--chaos-hue");
      rootStyle.removeProperty("--chaos-warmth");
    };
  }, [level]);

  return level;
}
