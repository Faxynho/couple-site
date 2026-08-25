import { GameEngine } from "../../types";
import {
  CrosswordCell,
  CrosswordDifficulty,
  CrosswordPuzzle,
  CrosswordWordDef,
  generateCrosswordPuzzle,
  isValidCrosswordDifficulty,
} from "./crosswordGenerator";

/**
 * Palavras Cruzadas — dois modos:
 * - "together": os dois jogadores preenchem a MESMA grade; toda jogada de um
 *   é espelhada instantaneamente na cópia do outro (progresso compartilhado).
 * - "duel": os dois recebem exatamente o mesmo puzzle, mas cada um preenche
 *   sua própria cópia de forma independente; vence quem completar tudo
 *   primeiro. A partida só é dada como encerrada quando TODOS os jogadores
 *   esperados (`expectedPlayers`, fixado no início) tiverem terminado — isso
 *   permite que o segundo jogador termine a prova mesmo depois de já haver
 *   um vencedor, igual ao que já fazemos na Memória de Cores/Sudoku.
 */

export type CrosswordMode = "together" | "duel";
const VALID_MODES: CrosswordMode[] = ["together", "duel"];
export function isValidCrosswordMode(value: string): value is CrosswordMode {
  return (VALID_MODES as string[]).includes(value);
}

const DEFAULT_DIFFICULTY: CrosswordDifficulty = "medium";
const DEFAULT_MODE: CrosswordMode = "together";

export interface CrosswordPlayerProgress {
  values: (string | null)[]; // alinhado a `cells`, só relevante para células não-bloco
  completedWordIds: string[];
  finished: boolean;
  finishedAt: number | null;
  timeMs: number | null;
}

export interface CrosswordResultEntry {
  playerId: string;
  place: number;
  finishedAt: number;
  timeMs: number;
}

export interface CrosswordState {
  difficulty: CrosswordDifficulty;
  mode: CrosswordMode;
  rows: number;
  cols: number;
  cells: CrosswordCell[];
  words: CrosswordWordDef[];
  progress: Record<string, CrosswordPlayerProgress>;
  expectedPlayers: string[];
  startedAt: number;
  finished: boolean;
  finishedAt: number | null;
  results: CrosswordResultEntry[];
  /** Jogadores que já acertaram cada palavra. Em Duelo, ambos podem acertar a mesma. */
  completedWordBy: Record<string, string[]>;
}

export type CrosswordAction = { type: "setCell"; row: number; col: number; letter: string };

function blankProgress(size: number): CrosswordPlayerProgress {
  return {
    values: new Array(size).fill(null),
    completedWordIds: [],
    finished: false,
    finishedAt: null,
    timeMs: null,
  };
}

function computeCompletedWordIds(values: (string | null)[], words: CrosswordWordDef[], cols: number): string[] {
  const done: string[] = [];
  for (const w of words) {
    const dr = w.direction === "down" ? 1 : 0;
    const dc = w.direction === "across" ? 1 : 0;
    let ok = true;
    for (let i = 0; i < w.length; i++) {
      const r = w.row + dr * i;
      const c = w.col + dc * i;
      const value = values[r * cols + c];
      if (!value || value !== w.answer[i]) {
        ok = false;
        break;
      }
    }
    if (ok) done.push(w.id);
  }
  return done;
}

export class CrosswordGame implements GameEngine<CrosswordState, CrosswordAction> {
  readonly id = "crossword" as const;

  createInitialState(options?: Record<string, unknown>): CrosswordState {
    const rawDifficulty = typeof options?.difficulty === "string" ? options.difficulty : DEFAULT_DIFFICULTY;
    const difficulty = isValidCrosswordDifficulty(rawDifficulty) ? rawDifficulty : DEFAULT_DIFFICULTY;

    const rawMode = typeof options?.mode === "string" ? options.mode : DEFAULT_MODE;
    const mode = isValidCrosswordMode(rawMode) ? rawMode : DEFAULT_MODE;

    const playerIds = Array.isArray(options?.playerIds) ? (options!.playerIds as string[]) : [];

    const puzzle: CrosswordPuzzle = generateCrosswordPuzzle(difficulty);
    const size = puzzle.cells.length;

    const progress: Record<string, CrosswordPlayerProgress> = {};
    for (const id of playerIds) progress[id] = blankProgress(size);

    return {
      difficulty,
      mode,
      rows: puzzle.rows,
      cols: puzzle.cols,
      cells: puzzle.cells,
      words: puzzle.words,
      progress,
      expectedPlayers: playerIds,
      startedAt: Date.now(),
      finished: false,
      finishedAt: null,
      results: [],
      completedWordBy: {},
    };
  }

  applyAction(state: CrosswordState, action: CrosswordAction, playerId: string): CrosswordState {
    if (state.finished) return state;
    if (action.type !== "setCell") return state;

    const { row, col } = action;
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || row >= state.rows || col >= state.cols) {
      return state;
    }
    const idx = row * state.cols + col;
    const cell = state.cells[idx];
    if (!cell || cell.block) return state;

    const rawLetter = typeof action.letter === "string" ? action.letter : "";
    const letter = rawLetter.length === 1 && /[A-Za-z]/.test(rawLetter) ? rawLetter.toUpperCase() : null;

    const next = structuredClone(state);

    const targets = next.mode === "together" ? next.expectedPlayers : [playerId];
    for (const targetId of targets) {
      if (!next.progress[targetId]) next.progress[targetId] = blankProgress(next.cells.length);
      const prog = next.progress[targetId];
      if (prog.finished) continue; // já concluiu — não altera mais
      prog.values[idx] = letter;
      const previousCompleted = new Set(prog.completedWordIds);
      prog.completedWordIds = computeCompletedWordIds(prog.values, next.words, next.cols);

      // Registra quem acabou de completar cada palavra. Isso é separado do
      // progresso individual porque, no modo Juntos, os dois compartilham a grade.
      for (const wordId of prog.completedWordIds) {
        if (previousCompleted.has(wordId)) continue;
        const currentOwners = next.completedWordBy[wordId] ?? [];
        if (!currentOwners.includes(playerId)) {
          next.completedWordBy[wordId] = [...currentOwners, playerId];
        }
      }

      const allDone = prog.completedWordIds.length === next.words.length && next.words.length > 0;
      if (allDone && !prog.finished) {
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

  isSolved(state: CrosswordState): boolean {
    return state.finished;
  }

  /** "Jogar de novo": gera um novo puzzle (mesma dificuldade e modo). */
  reset(state: CrosswordState): CrosswordState {
    const puzzle = generateCrosswordPuzzle(state.difficulty);
    const size = puzzle.cells.length;
    const progress: Record<string, CrosswordPlayerProgress> = {};
    for (const id of state.expectedPlayers) progress[id] = blankProgress(size);
    return {
      ...state,
      rows: puzzle.rows,
      cols: puzzle.cols,
      cells: puzzle.cells,
      words: puzzle.words,
      progress,
      startedAt: Date.now(),
      finished: false,
      finishedAt: null,
      results: [],
      completedWordBy: {},
    };
  }
}
