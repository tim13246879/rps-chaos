import type { Move } from "../types";

interface MoveGlyphProps {
  move: Move;
  size?: "small" | "large";
}

export function MoveGlyph({ move, size = "large" }: MoveGlyphProps) {
  return (
    <div className={`move-glyph move-glyph--${size}`} aria-hidden="true">
      <svg viewBox="0 0 120 120" role="img" focusable="false">
        {move === "rock" && (
          <>
            <rect x="27" y="44" width="55" height="41" rx="17" />
            <rect x="32" y="28" width="14" height="35" rx="7" />
            <rect x="47" y="25" width="14" height="38" rx="7" />
            <rect x="62" y="28" width="14" height="35" rx="7" />
            <path d="M29 76c10 16 31 24 50 15 7-3 13-9 17-16" />
          </>
        )}
        {move === "paper" && (
          <>
            <rect x="30" y="45" width="55" height="48" rx="18" />
            <rect x="23" y="17" width="13" height="56" rx="7" />
            <rect x="39" y="12" width="13" height="64" rx="7" />
            <rect x="55" y="12" width="13" height="64" rx="7" />
            <rect x="71" y="18" width="13" height="56" rx="7" />
            <path d="M83 55c11 1 17 8 18 20" />
          </>
        )}
        {move === "scissors" && (
          <>
            <rect x="42" y="58" width="45" height="39" rx="17" />
            <rect x="29" y="14" width="14" height="66" rx="7" transform="rotate(-13 36 47)" />
            <rect x="57" y="10" width="14" height="69" rx="7" transform="rotate(15 64 45)" />
            <rect x="72" y="49" width="13" height="35" rx="7" />
            <path d="M41 92c12 11 31 12 47 1" />
          </>
        )}
        {move === "unknown" && (
          <>
            <circle cx="60" cy="60" r="36" />
            <path d="M48 48c2-10 21-12 25 0 3 8-4 13-10 17-4 3-5 6-5 12" />
            <circle cx="58" cy="89" r="4" />
          </>
        )}
      </svg>
    </div>
  );
}
