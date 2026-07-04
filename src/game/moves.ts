import type { Move } from "../types";

export const MOVE_LABELS: Record<Move, string> = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
  unknown: "Unknown",
};

export function getCounterMove(move: Move): Move {
  if (move === "rock") {
    return "paper";
  }

  if (move === "paper") {
    return "scissors";
  }

  if (move === "scissors") {
    return "rock";
  }

  return "unknown";
}

export function formatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}
