import { GameEngine } from "../../types";
import { generateSudoku, isValidSudokuDifficulty, SudokuDifficulty } from "./sudokuGenerator";
import { isValidCompleteGrid } from "./sudokuSolver";

const DEFAULT_DIFFICULTY: SudokuDifficulty = "medium";

export interface SudokuCellState {
  value: number; // 0 = vazio
  isGiven: boolean; // true = veio no puzzle original, nunca pode ser alterada
  filledBy?: string; // playerId de quem preencheu (só para células não originais)
}

export interface SudokuState {
  difficulty: SudokuDifficulty;
  cells: SudokuCellState[]; // 81 posições, linha a linha
  clues: number;
  moves: number;
  startedAt: number;
  solved: boolean;
  solvedAt: number | null;
}

export type SudokuAction = { type: "setCell"; index: number; value: number };

function buildCells(puzzle: number[]): SudokuCellState[] {
  return puzzle.map((value) => ({ value, isGiven: value !== 0 }));
}

export class SudokuGame implements GameEngine<SudokuState, SudokuAction> {
  readonly id = "sudoku" as const;

  createInitialState(options?: Record<string, unknown>): SudokuState {
    const rawDifficulty = typeof options?.difficulty === "string" ? options.difficulty : DEFAULT_DIFFICULTY;
    const difficulty = isValidSudokuDifficulty(rawDifficulty) ? rawDifficulty : DEFAULT_DIFFICULTY;

    const { puzzle, clues } = generateSudoku(difficulty);

    return {
      difficulty,
      cells: buildCells(puzzle),
      clues,
      moves: 0,
      startedAt: Date.now(),
      solved: false,
      solvedAt: null,
    };
  }

  applyAction(state: SudokuState, action: SudokuAction, playerId: string): SudokuState {
    if (state.solved) return state;
    if (action.type !== "setCell") return state;

    const { index, value } = action;
    if (!Number.isInteger(index) || index < 0 || index > 80) return state;
    if (!Number.isInteger(value) || value < 0 || value > 9) return state;

    const cell = state.cells[index];
    if (!cell || cell.isGiven) return state; // nunca sobrescreve uma célula original

    const next = structuredClone(state);
    next.cells[index] = value === 0 ? { value: 0, isGiven: false } : { value, isGiven: false, filledBy: playerId };
    next.moves += 1;
    next.solved = this.isSolved(next);
    next.solvedAt = next.solved ? Date.now() : null;
    return next;
  }

  isSolved(state: SudokuState): boolean {
    const values = state.cells.map((c) => c.value);
    if (values.some((v) => v === 0)) return false;
    return isValidCompleteGrid(values);
  }

  /** "Reiniciar": limpa só o que o jogador preencheu, mantém as células originais do puzzle. */
  reset(state: SudokuState): SudokuState {
    const cells = state.cells.map((c) => (c.isGiven ? c : { value: 0, isGiven: false }));
    return {
      ...state,
      cells,
      moves: 0,
      startedAt: Date.now(),
      solved: false,
      solvedAt: null,
    };
  }
}
