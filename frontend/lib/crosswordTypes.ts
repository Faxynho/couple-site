export type CrosswordDirection = "across" | "down";
export type CrosswordMode = "together" | "duel";

export interface CrosswordCell {
  block: boolean;
  number: number | null;
}

export interface CrosswordWordDef {
  id: string;
  number: number;
  direction: CrosswordDirection;
  row: number;
  col: number;
  length: number;
  clue: string;
}

/**
 * Progresso de UM jogador. No modo "duel", o progresso do adversário chega
 * "resumido" (sem `values`/`completedWordIds`) — ver `isSummary`.
 */
export interface CrosswordFullProgress {
  values: (string | null)[];
  completedWordIds: string[];
  finished: boolean;
  finishedAt: number | null;
  timeMs: number | null;
}

export interface CrosswordSummaryProgress {
  finished: boolean;
  finishedAt: number | null;
  timeMs: number | null;
  wordsCompleted: number;
  completedWordIds: string[];
}

export type CrosswordProgress = CrosswordFullProgress | CrosswordSummaryProgress;

export function isFullProgress(p: CrosswordProgress): p is CrosswordFullProgress {
  return Array.isArray((p as CrosswordFullProgress).values);
}

export interface CrosswordResultEntry {
  playerId: string;
  place: number;
  finishedAt: number;
  timeMs: number;
}

export interface CrosswordState {
  difficulty: string;
  mode: CrosswordMode;
  rows: number;
  cols: number;
  cells: CrosswordCell[];
  words: CrosswordWordDef[];
  progress: Record<string, CrosswordProgress>;
  expectedPlayers: string[];
  startedAt: number;
  finished: boolean;
  finishedAt: number | null;
  results: CrosswordResultEntry[];
  /** Jogadores que já acertaram cada palavra. */
  completedWordBy: Record<string, string[]>;
}

export const CROSSWORD_DIFFICULTIES = {
  easy: { label: "Fácil", emoji: "🟢", hint: "grade menor, palavras comuns" },
  medium: { label: "Médio", emoji: "🟡", hint: "grade maior, mais palavras" },
  hard: { label: "Difícil", emoji: "🔴", hint: "grade grande, palavras menos óbvias" },
} as const;
export type CrosswordDifficulty = keyof typeof CROSSWORD_DIFFICULTIES;
