export type SudokuMode = "together" | "duel";

export interface SudokuCell {
  value: number; // 0 = vazio
  isGiven: boolean;
  filledBy?: string;
}

/**
 * Progresso de UM jogador. No modo "duel", o progresso do adversário chega
 * "resumido" (sem `cells` — ver `isFullProgress`), já que no Sudoku os dois
 * jogam o MESMO puzzle e ver a grade do outro daria a solução de graça.
 */
export interface SudokuFullProgress {
  cells: SudokuCell[]; // 81 posições, linha a linha
  moves: number;
  finished: boolean;
  finishedAt: number | null;
  timeMs: number | null;
}

export interface SudokuSummaryProgress {
  finished: boolean;
  finishedAt: number | null;
  timeMs: number | null;
  cellsFilled: number;
}

export type SudokuProgress = SudokuFullProgress | SudokuSummaryProgress;

export function isFullProgress(p: SudokuProgress): p is SudokuFullProgress {
  return Array.isArray((p as SudokuFullProgress).cells);
}

export interface SudokuResultEntry {
  playerId: string;
  place: number;
  finishedAt: number;
  timeMs: number;
}

export interface SudokuState {
  difficulty: string;
  mode: SudokuMode;
  clues: number;
  progress: Record<string, SudokuProgress>;
  expectedPlayers: string[];
  startedAt: number;
  finished: boolean;
  finishedAt: number | null;
  results: SudokuResultEntry[];
  /** Quantas dicas cada jogador usou nesta partida. */
  hintsUsedByPlayer: Record<string, number>;
}

/**
 * Dificuldades do Sudoku — independente do `DIFFICULTIES` do quebra-cabeça
 * (lá o número se refere a peças; aqui, a quantas células já vêm preenchidas).
 */
export const SUDOKU_DIFFICULTIES = {
  easy: { label: "Fácil", emoji: "🟢", hint: "mais números prontos" },
  medium: { label: "Médio", emoji: "🟡", hint: "equilíbrio de desafio" },
  hard: { label: "Difícil", emoji: "🔴", hint: "poucos números, exige estratégia" },
} as const;

export type SudokuDifficulty = keyof typeof SUDOKU_DIFFICULTIES;
