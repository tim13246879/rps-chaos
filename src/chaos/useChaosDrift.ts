import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CHAOS_LEVEL,
  effectiveMultiplier,
  INITIAL_DRIFT,
  nextChaosLevel,
  stepDrift,
} from "./drift";
import { INITIAL_PHANTOM, phantomTitle, stepPhantom } from "./phantomTitle";

const TICK_MS = 50;

export type ChaosEffect = "color" | "blur" | "breathe" | "title";

export interface ChaosState {
  level: number;
  effects: Record<ChaosEffect, boolean>;
  toggleEffect: (effect: ChaosEffect) => void;
}

export function useChaosDrift(): ChaosState {
  const [level, setLevel] = useState(DEFAULT_CHAOS_LEVEL);
  const [effects, setEffects] = useState<Record<ChaosEffect, boolean>>({
    color: true,
    blur: true,
    breathe: true,
    title: true,
  });
  const driftRef = useRef(INITIAL_DRIFT);
  const phantomRef = useRef(INITIAL_PHANTOM);
  const baseTitleRef = useRef(document.title);

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
    const baseTitle = baseTitleRef.current;
    const tick = () => {
      const drift = stepDrift(driftRef.current, multiplier, Math.random);
      driftRef.current = drift;
      rootStyle.setProperty("--chaos-hue", effects.color ? `${drift.hueDeg}deg` : "0deg");
      rootStyle.setProperty("--chaos-warmth", effects.color ? `${drift.warmth}` : "0");
      rootStyle.setProperty("--chaos-blur", effects.blur ? `${drift.blurPx}px` : "0px");
      rootStyle.setProperty("--chaos-scale", effects.breathe ? `${1 + drift.scaleDelta}` : "1");
      phantomRef.current = stepPhantom(phantomRef.current, TICK_MS, multiplier, Math.random);
      const title = effects.title ? phantomTitle(phantomRef.current, baseTitle) : baseTitle;
      if (document.title !== title) {
        document.title = title;
      }
    };
    tick();
    const interval = window.setInterval(tick, TICK_MS);
    return () => {
      window.clearInterval(interval);
      rootStyle.removeProperty("--chaos-hue");
      rootStyle.removeProperty("--chaos-warmth");
      rootStyle.removeProperty("--chaos-blur");
      rootStyle.removeProperty("--chaos-scale");
      document.title = baseTitle;
    };
  }, [effects, level]);

  const toggleEffect = useCallback((effect: ChaosEffect) => {
    setEffects((current) => ({ ...current, [effect]: !current[effect] }));
  }, []);

  return { level, effects, toggleEffect };
}
