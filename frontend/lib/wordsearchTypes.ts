export type WordSearchMode = "together" | "duel";

export interface WordSearchCellPos {
  row: number;
  col: number;
}

/** Palavra da lista: `cells` só vem preenchido depois de encontrada. */
export interface WordSearchWordEntry {
  id: string;
  word: string;
  cells?: WordSearchCellPos[];
  /** Jogador(es) que já encontraram esta palavra. Em Duelo os dois podem encontrar a mesma palavra. */
  foundBy?: string[];
}

export interface WordSearchFullProgress {
  found: Record<string, WordSearchCellPos[]>;
  mistakes: number;
  finished: boolean;
  finishedAt: number | null;
  timeMs: number | null;
}

export interface WordSearchSummaryProgress {
  finished: boolean;
  finishedAt: number | null;
  timeMs: number | null;
  mistakes: number;
  wordsFound: number;
}

export type WordSearchProgress = WordSearchFullProgress | WordSearchSummaryProgress;

export function isFullWordSearchProgress(p: WordSearchProgress): p is WordSearchFullProgress {
  return typeof (p as WordSearchFullProgress).found === "object" && (p as WordSearchFullProgress).found !== null;
}

export interface WordSearchResultEntry {
  playerId: string;
  place: number;
  finishedAt: number;
  timeMs: number;
  mistakes: number;
}

export interface WordSearchState {
  difficulty: string;
  mode: WordSearchMode;
  size: number;
  letters: string[];
  words: WordSearchWordEntry[];
  progress: Record<string, WordSearchProgress>;
  expectedPlayers: string[];
  startedAt: number;
  finished: boolean;
  finishedAt: number | null;
  results: WordSearchResultEntry[];
}

export const WORDSEARCH_DIFFICULTIES = {
  easy: { label: "Fácil", emoji: "🟢", hint: "grade menor, só na horizontal/vertical" },
  medium: { label: "Médio", emoji: "🟡", hint: "grade maior, com diagonais" },
  hard: { label: "Difícil", emoji: "🔴", hint: "grade grande, todas as direções" },
} as const;
export type WordSearchDifficulty = keyof typeof WORDSEARCH_DIFFICULTIES;
