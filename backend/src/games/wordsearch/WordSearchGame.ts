import { GameEngine } from "../../types";
import {
  generateWordSearchPuzzle,
  isValidWordSearchDifficulty,
  WordSearchDifficulty,
  WordSearchPlacedWord,
  WordSearchPuzzle,
} from "./wordsearchGenerator";

/**
 * Caça-Palavras — dois modos:
 * - "together": os dois jogadores recebem a mesma grade e trabalham juntos;
 *   quando um encontra uma palavra, ela aparece marcada para os dois na hora.
 * - "duel": mesma grade para os dois, mas cada um com seu próprio progresso
 *   (encontrar uma palavra não marca para o outro). Vence quem encontrar
 *   todas primeiro; a partida só fecha quando todos os jogadores esperados
 *   tiverem terminado.
 *
 * Importante: a palavra em si (texto) é sempre visível na lista — é o que o
 * jogador precisa procurar. Só a LOCALIZAÇÃO exata na grade é secreta até a
 * palavra ser encontrada (ver socketHandlers.ts, getWordSearchStateForPlayer).
 */

export type WordSearchMode = "together" | "duel";
const VALID_MODES: WordSearchMode[] = ["together", "duel"];
export function isValidWordSearchMode(value: string): value is WordSearchMode {
  return (VALID_MODES as string[]).includes(value);
}

const DEFAULT_DIFFICULTY: WordSearchDifficulty = "medium";
const DEFAULT_MODE: WordSearchMode = "together";

export interface WordSearchFoundCell {
  row: number;
  col: number;
}

export interface WordSearchPlayerProgress {
  found: Record<string, WordSearchFoundCell[]>; // wordId -> células encontradas
  /** Quem encontrou cada palavra. Em Duelo, os dois podem encontrar a mesma palavra. */
  foundBy: Record<string, string[]>;
  mistakes: number;
  finished: boolean;
  finishedAt: number | null;
  timeMs: number | null;
}

export interface WordSearchResultEntry {
  playerId: string;
  place: number;
  finishedAt: number;
  timeMs: number;
  mistakes: number;
}

export interface WordSearchState {
  difficulty: WordSearchDifficulty;
  mode: WordSearchMode;
  size: number;
  letters: string[];
  words: WordSearchPlacedWord[]; // localização real — nunca deve sair do servidor sem mascarar
  progress: Record<string, WordSearchPlayerProgress>;
  expectedPlayers: string[];
  startedAt: number;
  finished: boolean;
  finishedAt: number | null;
  results: WordSearchResultEntry[];
}

export type WordSearchAction = {
  type: "submitSelection";
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
};

function blankProgress(): WordSearchPlayerProgress {
  return { found: {}, foundBy: {}, mistakes: 0, finished: false, finishedAt: null, timeMs: null };
}

function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

export class WordSearchGame implements GameEngine<WordSearchState, WordSearchAction> {
  readonly id = "wordsearch" as const;

  createInitialState(options?: Record<string, unknown>): WordSearchState {
    const rawDifficulty = typeof options?.difficulty === "string" ? options.difficulty : DEFAULT_DIFFICULTY;
    const difficulty = isValidWordSearchDifficulty(rawDifficulty) ? rawDifficulty : DEFAULT_DIFFICULTY;

    const rawMode = typeof options?.mode === "string" ? options.mode : DEFAULT_MODE;
    const mode = isValidWordSearchMode(rawMode) ? rawMode : DEFAULT_MODE;

    const playerIds = Array.isArray(options?.playerIds) ? (options!.playerIds as string[]) : [];

    const puzzle: WordSearchPuzzle = generateWordSearchPuzzle(difficulty);

    const progress: Record<string, WordSearchPlayerProgress> = {};
    for (const id of playerIds) progress[id] = blankProgress();

    return {
      difficulty,
      mode,
      size: puzzle.size,
      letters: puzzle.letters,
      words: puzzle.words,
      progress,
      expectedPlayers: playerIds,
      startedAt: Date.now(),
      finished: false,
      finishedAt: null,
      results: [],
    };
  }

  applyAction(state: WordSearchState, action: WordSearchAction, playerId: string): WordSearchState {
    if (state.finished) return state;
    if (action.type !== "submitSelection") return state;

    const { startRow, startCol, endRow, endCol } = action;
    const size = state.size;
    const inBounds = (r: number, c: number) => Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0 && r < size && c < size;
    if (!inBounds(startRow, startCol) || !inBounds(endRow, endCol)) return state;

    const dRow = endRow - startRow;
    const dCol = endCol - startCol;
    const isStraight = dRow === 0 || dCol === 0 || Math.abs(dRow) === Math.abs(dCol);
    if (!isStraight) return state;

    const length = Math.max(Math.abs(dRow), Math.abs(dCol)) + 1;
    if (length < 2) return state;
    const dr = sign(dRow);
    const dc = sign(dCol);

    const cells: WordSearchFoundCell[] = [];
    let forward = "";
    for (let i = 0; i < length; i++) {
      const r = startRow + dr * i;
      const c = startCol + dc * i;
      cells.push({ row: r, col: c });
      forward += state.letters[r * size + c];
    }
    const backward = forward.split("").reverse().join("");

    const next = structuredClone(state);
    const targets = next.mode === "together" ? next.expectedPlayers : [playerId];

    // Considera acerto se bate com QUALQUER palavra da lista ainda não
    // encontrada (por esse jogador/equipe), em qualquer direção de arraste.
    for (const targetId of targets) {
      if (!next.progress[targetId]) next.progress[targetId] = blankProgress();
      const prog = next.progress[targetId];
      if (prog.finished) continue;

      const match = next.words.find(
        (w) => (w.word === forward || w.word === backward) && !prog.found[w.id]
      );

      if (match) {
        prog.found[match.id] = cells;
        prog.foundBy[match.id] = Array.from(new Set([...(prog.foundBy[match.id] ?? []), playerId]));
      } else {
        prog.mistakes += 1;
      }

      const allFound = next.words.length > 0 && Object.keys(prog.found).length === next.words.length;
      if (allFound && !prog.finished) {
        prog.finished = true;
        prog.finishedAt = Date.now();
        prog.timeMs = prog.finishedAt - next.startedAt;
        next.results.push({
          playerId: targetId,
          place: next.results.length + 1,
          finishedAt: prog.finishedAt,
          timeMs: prog.timeMs,
          mistakes: prog.mistakes,
        });
      }
    }

    if (next.expectedPlayers.length > 0 && next.expectedPlayers.every((id) => next.progress[id]?.finished)) {
      next.finished = true;
      next.finishedAt = Date.now();
    }

    return next;
  }

  isSolved(state: WordSearchState): boolean {
    return state.finished;
  }

  /** "Jogar de novo": gera uma nova grade (mesma dificuldade e modo). */
  reset(state: WordSearchState): WordSearchState {
    const puzzle = generateWordSearchPuzzle(state.difficulty);
    const progress: Record<string, WordSearchPlayerProgress> = {};
    for (const id of state.expectedPlayers) progress[id] = blankProgress();
    return {
      ...state,
      size: puzzle.size,
      letters: puzzle.letters,
      words: puzzle.words,
      progress,
      startedAt: Date.now(),
      finished: false,
      finishedAt: null,
      results: [],
    };
  }
}
