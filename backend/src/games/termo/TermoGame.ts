import solutionsData from "./data/termo-solutions.json";
import validWordsData from "./data/termo-valid-words.json";
import { GameEngine } from "../../types";

export type TermoVariant = "one" | "dueto" | "quarteto";
export type TermoMode = "solo" | "duel";
export type TermoLetterState = "correct" | "present" | "absent";

export interface TermoSolution {
  original: string;
  normalized: string;
}

export interface TermoGuess {
  word: string;
  letters: TermoLetterState[];
}

export interface TermoPlayerProgress {
  boards: TermoGuess[][];
  attemptsUsed: number;
  solvedIndices: number[];
  finished: boolean;
  completed: boolean;
  finishedAt: number | null;
  timeUsedMs: number | null;
  invalidAttemptAt: number | null;
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

/** Estado privado do motor. `solutions` nunca é enviado diretamente ao cliente. */
export interface TermoState {
  variant: TermoVariant;
  mode: TermoMode;
  maxAttempts: number;
  expectedPlayers: string[];
  solutions: TermoSolution[];
  progress: Record<string, TermoPlayerProgress>;
  startedAt: number;
  finished: boolean;
  finishedAt: number | null;
  results: TermoResultEntry[];
}

export type TermoAction = { type: "submitGuess"; word: string };

const VARIANTS: Record<TermoVariant, { wordCount: number; maxAttempts: number }> = {
  one: { wordCount: 1, maxAttempts: 6 },
  dueto: { wordCount: 2, maxAttempts: 7 },
  quarteto: { wordCount: 4, maxAttempts: 9 },
};

const VALID_VARIANTS: TermoVariant[] = ["one", "dueto", "quarteto"];
const VALID_MODES: TermoMode[] = ["solo", "duel"];

type SolutionSource = { words: { word: string; normalized: string }[] };
type ValidWordSource = { words: string[] };

const SOLUTIONS: readonly TermoSolution[] = (solutionsData as SolutionSource).words
  .map((entry) => ({ original: entry.word, normalized: normalizeTermoWord(entry.normalized) ?? "" }))
  .filter((entry) => entry.normalized.length === 5);

/** Preparado uma vez na subida do servidor — nunca é reconstruído por tentativa. */
const VALID_WORDS = new Set(
  (validWordsData as ValidWordSource).words
    .map((word) => normalizeTermoWord(word))
    .filter((word): word is string => word !== null)
);

export function isValidTermoVariant(value: string): value is TermoVariant {
  return (VALID_VARIANTS as string[]).includes(value);
}

export function isValidTermoMode(value: string): value is TermoMode {
  return (VALID_MODES as string[]).includes(value);
}

/** Forma única usada em validação e avaliação: sem acento, cedilha ou símbolos. */
export function normalizeTermoWord(value: string): string | null {
  const normalized = value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ç/gu, "c");
  return /^[a-z]{5}$/u.test(normalized) ? normalized : null;
}

/** Avaliação em duas passagens para tratar corretamente letras repetidas. */
export function evaluateTermoGuess(guess: string, solution: string): TermoLetterState[] {
  const states: TermoLetterState[] = Array.from({ length: 5 }, () => "absent");
  const remaining = solution.split("");

  for (let index = 0; index < 5; index += 1) {
    if (guess[index] === solution[index]) {
      states[index] = "correct";
      remaining[index] = "";
    }
  }

  for (let index = 0; index < 5; index += 1) {
    if (states[index] === "correct") continue;
    const availableIndex = remaining.indexOf(guess[index]);
    if (availableIndex >= 0) {
      states[index] = "present";
      remaining[availableIndex] = "";
    }
  }

  return states;
}

function shuffle<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

function chooseSolutions(variant: TermoVariant): TermoSolution[] {
  const chosen: TermoSolution[] = [];
  const seen = new Set<string>();
  for (const solution of shuffle(SOLUTIONS)) {
    if (seen.has(solution.normalized)) continue;
    chosen.push(solution);
    seen.add(solution.normalized);
    if (chosen.length === VARIANTS[variant].wordCount) break;
  }
  return chosen;
}

function emptyProgress(boardCount: number): TermoPlayerProgress {
  return {
    boards: Array.from({ length: boardCount }, () => []),
    attemptsUsed: 0,
    solvedIndices: [],
    finished: false,
    completed: false,
    finishedAt: null,
    timeUsedMs: null,
    invalidAttemptAt: null,
  };
}

function finishProgress(progress: TermoPlayerProgress, startedAt: number, now: number, boardCount: number) {
  if (progress.finished) return;
  progress.finished = true;
  progress.completed = progress.solvedIndices.length === boardCount;
  progress.finishedAt = now;
  progress.timeUsedMs = Math.max(0, now - startedAt);
}

function compareResults(a: TermoResultEntry, b: TermoResultEntry): number {
  return b.solvedCount - a.solvedCount || a.attemptsUsed - b.attemptsUsed || a.timeUsedMs - b.timeUsedMs;
}

function buildResults(state: TermoState): TermoResultEntry[] {
  const rows = state.expectedPlayers.map((playerId) => {
    const progress = state.progress[playerId] ?? emptyProgress(state.solutions.length);
    return {
      playerId,
      place: 1,
      outcome: state.mode === "solo" ? "solo" : "loss",
      solvedCount: progress.solvedIndices.length,
      attemptsUsed: progress.attemptsUsed,
      timeUsedMs: progress.timeUsedMs ?? Math.max(0, (state.finishedAt ?? Date.now()) - state.startedAt),
      completed: progress.completed,
    } satisfies TermoResultEntry;
  });

  rows.sort(compareResults);
  if (state.mode === "solo") return rows;
  const tied = rows.length > 1 && compareResults(rows[0], rows[1]) === 0;
  return rows.map((row, index) => ({
    ...row,
    place: tied ? 1 : index + 1,
    outcome: tied ? "draw" : index === 0 ? "win" : "loss",
  }));
}

function finishMatch(state: TermoState, now: number) {
  if (state.finished) return;
  state.finished = true;
  state.finishedAt = now;
  state.results = buildResults(state);
}

export class TermoGame implements GameEngine<TermoState, TermoAction> {
  readonly id = "termo" as const;

  createInitialState(options?: Record<string, unknown>): TermoState {
    const variant = typeof options?.difficulty === "string" && isValidTermoVariant(options.difficulty) ? options.difficulty : "one";
    const mode = typeof options?.mode === "string" && isValidTermoMode(options.mode) ? options.mode : "solo";
    const expectedPlayers = Array.isArray(options?.playerIds) ? options.playerIds.filter((id): id is string => typeof id === "string") : [];
    const solutions = chooseSolutions(variant);
    const progress: Record<string, TermoPlayerProgress> = {};
    for (const playerId of expectedPlayers) progress[playerId] = emptyProgress(solutions.length);

    return {
      variant,
      mode,
      maxAttempts: VARIANTS[variant].maxAttempts,
      expectedPlayers,
      solutions,
      progress,
      startedAt: Date.now(),
      finished: false,
      finishedAt: null,
      results: [],
    };
  }

  applyAction(state: TermoState, action: TermoAction, playerId: string): TermoState {
    if (state.finished || action.type !== "submitGuess" || !state.expectedPlayers.includes(playerId)) return state;
    const currentProgress = state.progress[playerId];
    if (!currentProgress || currentProgress.finished || typeof action.word !== "string") return state;
    const word = normalizeTermoWord(action.word);
    const now = Date.now();

    if (!word || !VALID_WORDS.has(word)) {
      const next = structuredClone(state);
      next.progress[playerId].invalidAttemptAt = now;
      return next;
    }

    const next = structuredClone(state);
    const progress = next.progress[playerId];
    progress.invalidAttemptAt = null;
    progress.attemptsUsed += 1;

    for (let boardIndex = 0; boardIndex < next.solutions.length; boardIndex += 1) {
      if (progress.solvedIndices.includes(boardIndex)) continue;
      const letters = evaluateTermoGuess(word, next.solutions[boardIndex].normalized);
      progress.boards[boardIndex].push({ word, letters });
      if (letters.every((letter) => letter === "correct")) progress.solvedIndices.push(boardIndex);
    }

    if (progress.solvedIndices.length === next.solutions.length || progress.attemptsUsed >= next.maxAttempts) {
      finishProgress(progress, next.startedAt, now, next.solutions.length);
    }

    if (next.mode === "solo") {
      if (progress.finished) finishMatch(next, now);
    } else if (next.expectedPlayers.length > 0 && next.expectedPlayers.every((id) => next.progress[id]?.finished)) {
      finishMatch(next, now);
    }

    return next;
  }

  isSolved(state: TermoState): boolean {
    return state.finished;
  }

  reset(state: TermoState): TermoState {
    return this.createInitialState({ difficulty: state.variant, mode: state.mode, playerIds: state.expectedPlayers });
  }
}
