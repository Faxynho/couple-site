import { GameEngine } from "../../types";
import { generateSudoku, isValidSudokuDifficulty, SudokuDifficulty } from "./sudokuGenerator";
import { isValidCompleteGrid, solveComplete } from "./sudokuSolver";

/**
 * Sudoku — dois modos, no mesmo padrão do Palavras Cruzadas/Caça-Palavras:
 * - "together": os dois jogadores preenchem a MESMA grade; toda jogada de um
 *   é espelhada instantaneamente na cópia do outro (progresso compartilhado).
 * - "duel": os dois recebem exatamente o mesmo puzzle, mas cada um preenche
 *   sua própria cópia de forma independente; vence quem completar a grade
 *   corretamente primeiro. A partida só é dada como encerrada quando os DOIS
 *   jogadores esperados (`expectedPlayers`, fixado no início) tiverem
 *   terminado — permitindo que o segundo termine mesmo já havendo um vencedor.
 */

export type SudokuMode = "together" | "duel";
const VALID_MODES: SudokuMode[] = ["together", "duel"];
export function isValidSudokuMode(value: string): value is SudokuMode {
  return (VALID_MODES as string[]).includes(value);
}

const DEFAULT_DIFFICULTY: SudokuDifficulty = "medium";
const DEFAULT_MODE: SudokuMode = "together";

export interface SudokuCellState {
  value: number; // 0 = vazio
  isGiven: boolean; // true = veio no puzzle original, nunca pode ser alterada
  filledBy?: string; // playerId de quem preencheu (só para células não originais)
}

export interface SudokuPlayerProgress {
  cells: SudokuCellState[]; // 81 posições, linha a linha — cópia própria do jogador
  moves: number;
  finished: boolean;
  finishedAt: number | null;
  timeMs: number | null;
}

export interface SudokuResultEntry {
  playerId: string;
  place: number;
  finishedAt: number;
  timeMs: number;
}

export interface SudokuState {
  difficulty: SudokuDifficulty;
  mode: SudokuMode;
  clues: number;
  progress: Record<string, SudokuPlayerProgress>;
  expectedPlayers: string[];
  startedAt: number;
  finished: boolean;
  finishedAt: number | null;
  results: SudokuResultEntry[];
  /** Solução fica exclusivamente no backend e nunca é enviada ao cliente. */
  solution: number[];
  /** Contador visível para os dois jogadores. */
  hintsUsedByPlayer: Record<string, number>;
}

export type SudokuAction =
  | { type: "setCell"; index: number; value: number }
  | { type: "hint" };

function buildCells(puzzle: number[]): SudokuCellState[] {
  return puzzle.map((value) => ({ value, isGiven: value !== 0 }));
}

function blankProgress(baseCells: SudokuCellState[]): SudokuPlayerProgress {
  return {
    cells: baseCells.map((c) => ({ ...c })), // cópia independente por jogador
    moves: 0,
    finished: false,
    finishedAt: null,
    timeMs: null,
  };
}

function isBoardSolved(cells: SudokuCellState[]): boolean {
  const values = cells.map((c) => c.value);
  if (values.some((v) => v === 0)) return false;
  return isValidCompleteGrid(values);
}

export class SudokuGame implements GameEngine<SudokuState, SudokuAction> {
  readonly id = "sudoku" as const;

  createInitialState(options?: Record<string, unknown>): SudokuState {
    const rawDifficulty = typeof options?.difficulty === "string" ? options.difficulty : DEFAULT_DIFFICULTY;
    const difficulty = isValidSudokuDifficulty(rawDifficulty) ? rawDifficulty : DEFAULT_DIFFICULTY;

    const rawMode = typeof options?.mode === "string" ? options.mode : DEFAULT_MODE;
    const mode = isValidSudokuMode(rawMode) ? rawMode : DEFAULT_MODE;

    const playerIds = Array.isArray(options?.playerIds) ? (options!.playerIds as string[]) : [];

    const { puzzle, clues } = generateSudoku(difficulty);
    const solution = solveComplete(puzzle);
    if (!solution) throw new Error("Não foi possível resolver o Sudoku gerado.");

    const baseCells = buildCells(puzzle);

    const progress: Record<string, SudokuPlayerProgress> = {};
    const hintsUsedByPlayer: Record<string, number> = {};
    for (const id of playerIds) {
      progress[id] = blankProgress(baseCells);
      hintsUsedByPlayer[id] = 0;
    }

    return {
      difficulty,
      mode,
      clues,
      progress,
      expectedPlayers: playerIds,
      startedAt: Date.now(),
      finished: false,
      finishedAt: null,
      results: [],
      solution,
      hintsUsedByPlayer,
    };
  }

  applyAction(state: SudokuState, action: SudokuAction, playerId: string): SudokuState {
    if (state.finished) return state;

    if (action.type === "hint") {
      const next = structuredClone(state);
      const targets = next.mode === "together" ? next.expectedPlayers : [playerId];

      // Cada clique revela UMA única casa. No modo Juntos, a mesma casa é
      // aplicada às duas cópias para manter a grade realmente compartilhada.
      const sourceProgress = targets
        .map((id) => next.progress[id])
        .find((prog) => prog && !prog.finished);

      if (!sourceProgress) return next;

      const candidates = sourceProgress.cells
        .map((cell, idx) => ({ cell, idx }))
        .filter(({ cell, idx }) => !cell.isGiven && cell.value !== next.solution[idx]);

      if (candidates.length === 0) return next;

      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      const correctValue = next.solution[chosen.idx];

      for (const targetId of targets) {
        const prog = next.progress[targetId];
        if (!prog || prog.finished) continue;

        prog.cells[chosen.idx] = {
          value: correctValue,
          isGiven: false,
          filledBy: playerId,
        };

        if (isBoardSolved(prog.cells)) {
          prog.finished = true;
          prog.finishedAt = Date.now();
          prog.timeMs = prog.finishedAt - next.startedAt;
          next.results.push({
            playerId: targetId,
            place: next.results.length + 1,
            finishedAt: prog.finishedAt,
            timeMs: prog.timeMs,
          });
        }
      }

      next.hintsUsedByPlayer[playerId] = (next.hintsUsedByPlayer[playerId] ?? 0) + 1;

      if (next.expectedPlayers.length > 0 && next.expectedPlayers.every((id) => next.progress[id]?.finished)) {
        next.finished = true;
        next.finishedAt = Date.now();
      }

      return next;
    }

    if (action.type !== "setCell") return state;

    const { index, value } = action;
    if (!Number.isInteger(index) || index < 0 || index > 80) return state;
    if (!Number.isInteger(value) || value < 0 || value > 9) return state;

    const next = structuredClone(state);
    // No modo "together" a jogada é espelhada nas duas cópias (progresso
    // compartilhado); no "duel" só afeta a própria grade de quem jogou.
    const targets = next.mode === "together" ? next.expectedPlayers : [playerId];

    for (const targetId of targets) {
      const prog = next.progress[targetId];
      if (!prog || prog.finished) continue; // já concluiu — não altera mais

      const cell = prog.cells[index];
      if (!cell || cell.isGiven) continue; // nunca sobrescreve uma célula original

      prog.cells[index] = value === 0 ? { value: 0, isGiven: false } : { value, isGiven: false, filledBy: playerId };
      prog.moves += 1;

      if (!prog.finished && isBoardSolved(prog.cells)) {
        prog.finished = true;
        prog.finishedAt = Date.now();
        prog.timeMs = prog.finishedAt - next.startedAt;
        next.results.push({
          playerId: targetId,
          place: next.results.length + 1,
          finishedAt: prog.finishedAt,
          timeMs: prog.timeMs,
        });
      }
    }

    if (next.expectedPlayers.length > 0 && next.expectedPlayers.every((id) => next.progress[id]?.finished)) {
      next.finished = true;
      next.finishedAt = Date.now();
    }

    return next;
  }

  isSolved(state: SudokuState): boolean {
    return state.finished;
  }

  /** "Reiniciar": limpa só o que os jogadores preencheram, mantém o mesmo puzzle. */
  reset(state: SudokuState): SudokuState {
    const referenceCells = Object.values(state.progress)[0]?.cells ?? [];
    const baseCells: SudokuCellState[] = referenceCells.map((c) =>
      c.isGiven ? { value: c.value, isGiven: true } : { value: 0, isGiven: false }
    );

    const progress: Record<string, SudokuPlayerProgress> = {};
    const hintsUsedByPlayer: Record<string, number> = {};
    for (const id of state.expectedPlayers) {
      progress[id] = blankProgress(baseCells);
      hintsUsedByPlayer[id] = 0;
    }

    return {
      ...state,
      progress,
      startedAt: Date.now(),
      finished: false,
      finishedAt: null,
      results: [],
      hintsUsedByPlayer,
    };
  }
}
