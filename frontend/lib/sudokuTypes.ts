export interface SudokuCell {
  value: number; // 0 = vazio
  isGiven: boolean;
  filledBy?: string;
}

export interface SudokuState {
  difficulty: string;
  cells: SudokuCell[]; // 81 posições, linha a linha
  clues: number;
  moves: number;
  startedAt: number;
  solved: boolean;
  solvedAt: number | null;
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
