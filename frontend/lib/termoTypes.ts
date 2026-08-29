export type TermoVariant = "one" | "dueto" | "quarteto";
export type TermoMode = "solo" | "duel";
export type TermoLetterState = "correct" | "present" | "absent";

export interface TermoGuess {
  word: string;
  letters: TermoLetterState[];
}

export interface TermoOwnProgress {
  boards: TermoGuess[][];
  attemptsUsed: number;
  solvedIndices: number[];
  finished: boolean;
  completed: boolean;
  finishedAt: number | null;
  timeUsedMs: number | null;
  invalidAttemptAt: number | null;
}

export interface TermoOpponentProgress {
  attemptsUsed: number;
  solvedCount: number;
  finished: boolean;
  completed: boolean;
  finishedAt: number | null;
  timeUsedMs: number | null;
}

export interface TermoResultEntry {
  playerId: string;
  place: number;
  outcome: "win" | "loss" | "draw" | "solo";
  solvedCount: number;
  attemptsUsed: number;
  timeUsedMs: number;
  completed: boolean;
}

export interface TermoState {
  variant: TermoVariant;
  mode: TermoMode;
  maxAttempts: number;
  expectedPlayers: string[];
  progress: Record<string, TermoOwnProgress | TermoOpponentProgress>;
  startedAt: number;
  finished: boolean;
  finishedAt: number | null;
  results: TermoResultEntry[];
  /** Só é preenchido pelo servidor depois que a partida inteira termina. */
  revealedSolutions: string[] | null;
}

export const TERMO_VARIANTS = {
  one: { label: "1 palavra", emoji: "🟩", hint: "6 tentativas" },
  dueto: { label: "2 palavras", emoji: "🟨", hint: "7 tentativas" },
  quarteto: { label: "4 palavras", emoji: "🟦", hint: "9 tentativas" },
} as const;

export const TERMO_MODES = {
  solo: { label: "Solo", emoji: "🙋", hint: "descubra as palavras" },
  duel: { label: "Duelo", emoji: "⚔️", hint: "as mesmas palavras, progresso privado" },
} as const;

export function isTermoOwnProgress(progress: TermoOwnProgress | TermoOpponentProgress | undefined): progress is TermoOwnProgress {
  return Boolean(progress && "boards" in progress);
}
