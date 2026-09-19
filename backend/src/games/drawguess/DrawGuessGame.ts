import { GameEngine } from "../../types";
import { pickDrawGuessWord } from "./words";

export const DRAW_GUESS_ROUND_MS = 60_000;
export const DRAW_GUESS_RESULT_MS = 2_600;
export const DRAW_GUESS_MAX_POINTS = 320;
export const DRAW_GUESS_MAX_ACTION_BYTES = 48_000;
export const DRAW_GUESS_MAX_CANVAS_ACTIONS = 240;
export const DRAW_GUESS_ROUND_OPTIONS = [4, 6, 8] as const;
export const DRAW_GUESS_DURATION_OPTIONS = [60, 120] as const;

export type DrawGuessShape = "line" | "rectangle" | "ellipse" | "triangle";
export interface DrawGuessPoint { x: number; y: number }
export type DrawGuessCanvasAction =
  | { id: string; kind: "stroke"; tool: "brush" | "eraser"; color: string; size: number; points: DrawGuessPoint[] }
  | { id: string; kind: "shape"; shape: DrawGuessShape; color: string; size: number; start: DrawGuessPoint; end: DrawGuessPoint }
  | { id: string; kind: "fill"; color: string; point: DrawGuessPoint }
  | { id: string; kind: "clear" };

export interface DrawGuessAttempt {
  id: string;
  playerId: string;
  text: string;
  normalized: string;
  createdAt: number;
  correct: boolean;
}

export interface DrawGuessPlayerStats {
  score: number;
  correctGuesses: number;
  totalGuessTimeMs: number;
  bestGuessTimeMs: number | null;
}

export interface DrawGuessRoundResult {
  round: number;
  word: string;
  reason: "correct" | "timeUp";
  guesserId: string;
  drawerId: string;
  guesserPoints: number;
  drawerPoints: number;
  remainingMs: number;
  guessTimeMs: number | null;
  correctAttemptId: string | null;
}

export interface DrawGuessState {
  mode: "duo";
  expectedPlayers: string[];
  configuredRounds: number;
  roundDurationMs: number;
  totalRounds: number;
  currentRound: number;
  tiebreakPairs: number;
  phase: "playing" | "roundResult" | "finished";
  drawerId: string;
  guesserId: string;
  wordId: string;
  word: string;
  wordCategory: string;
  usedWordIds: string[];
  roundStartedAt: number;
  roundDeadlineAt: number;
  pausedAt: number | null;
  autoAdvanceAt: number | null;
  startedAt: number;
  finishedAt: number | null;
  winnerId: string | null;
  scores: Record<string, number>;
  playerStats: Record<string, DrawGuessPlayerStats>;
  attempts: DrawGuessAttempt[];
  processedAttemptIds: string[];
  canvasActions: DrawGuessCanvasAction[];
  redoActions: DrawGuessCanvasAction[];
  canvasRevision: number;
  lastRoundResult: DrawGuessRoundResult | null;
}

export type DrawGuessAction =
  | { type: "submitGuess"; id: string; guess: string; now?: number }
  | { type: "draw"; action: DrawGuessCanvasAction }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "clear"; id: string }
  | { type: "timeUp"; now?: number }
  | { type: "advanceRound"; now?: number }
  | { type: "resume"; now?: number };

export interface DrawGuessPublicState extends Omit<DrawGuessState, "word" | "wordId" | "wordCategory" | "usedWordIds" | "redoActions" | "processedAttemptIds"> {
  word: string | null;
  maskedWord: string;
  canUndo: boolean;
  canRedo: boolean;
  serverNow: number;
}

export function isValidDrawGuessRounds(value: unknown): value is 4 | 6 | 8 {
  const parsed = typeof value === "string" ? Number(value) : value;
  return DRAW_GUESS_ROUND_OPTIONS.includes(parsed as 4 | 6 | 8);
}

export function isValidDrawGuessDuration(value: unknown): value is 60 | 120 {
  const parsed = typeof value === "string" ? Number(value) : value;
  return DRAW_GUESS_DURATION_OPTIONS.includes(parsed as 60 | 120);
}

export function normalizeDrawGuessAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreDrawGuessRound(remainingMs: number, roundDurationMs = DRAW_GUESS_ROUND_MS) {
  const remaining = Math.max(0, remainingMs);
  const duration = Math.max(DRAW_GUESS_ROUND_MS, roundDurationMs);
  if (remaining >= duration * (5 / 6)) return { guesser: 100, drawer: 50 };
  if (remaining >= duration * (7 / 12)) return { guesser: 80, drawer: 40 };
  if (remaining >= duration * (1 / 3)) return { guesser: 60, drawer: 30 };
  if (remaining > 0) return { guesser: 40, drawer: 20 };
  return { guesser: 0, drawer: 0 };
}

function safePoint(value: unknown): value is DrawGuessPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as DrawGuessPoint;
  return Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}

function safeId(value: unknown) {
  return typeof value === "string" && /^[a-zA-Z0-9:_-]{1,80}$/.test(value);
}

function safeColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function safeSize(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0.001 && value <= 0.08;
}

export function isValidDrawGuessCanvasAction(value: unknown): value is DrawGuessCanvasAction {
  if (!value || typeof value !== "object") return false;
  try {
    if (Buffer.byteLength(JSON.stringify(value), "utf8") > DRAW_GUESS_MAX_ACTION_BYTES) return false;
  } catch {
    return false;
  }
  const action = value as Partial<DrawGuessCanvasAction> & Record<string, unknown>;
  if (!safeId(action.id) || typeof action.kind !== "string") return false;
  if (action.kind === "clear") return true;
  if (!safeColor(action.color)) return false;
  if (action.kind === "fill") return safePoint(action.point);
  if (!safeSize(action.size)) return false;
  if (action.kind === "shape") {
    return (action.shape === "line" || action.shape === "rectangle" || action.shape === "ellipse" || action.shape === "triangle")
      && safePoint(action.start) && safePoint(action.end);
  }
  if (action.kind === "stroke") {
    return (action.tool === "brush" || action.tool === "eraser")
      && Array.isArray(action.points)
      && action.points.length >= 1
      && action.points.length <= DRAW_GUESS_MAX_POINTS
      && action.points.every(safePoint);
  }
  return false;
}

function blankStats(playerIds: string[]): Record<string, DrawGuessPlayerStats> {
  return Object.fromEntries(playerIds.map((id) => [id, { score: 0, correctGuesses: 0, totalGuessTimeMs: 0, bestGuessTimeMs: null }]));
}

function maskWord(word: string): string {
  return [...word].map((char) => /[\p{L}\p{N}]/u.test(char) ? "_" : char).join(" ");
}

function chooseRoles(players: string[], round: number) {
  const drawerIndex = (round - 1) % 2;
  return { drawerId: players[drawerIndex], guesserId: players[1 - drawerIndex] };
}

function beginRound(state: DrawGuessState, round: number, now: number): DrawGuessState {
  const word = pickDrawGuessWord(state.usedWordIds);
  const roles = chooseRoles(state.expectedPlayers, round);
  return {
    ...state,
    currentRound: round,
    phase: "playing",
    drawerId: roles.drawerId,
    guesserId: roles.guesserId,
    wordId: word.id,
    word: word.value,
    wordCategory: word.category,
    usedWordIds: [...state.usedWordIds, word.id],
    roundStartedAt: now,
    roundDeadlineAt: now + state.roundDurationMs,
    pausedAt: null,
    autoAdvanceAt: null,
    attempts: [],
    processedAttemptIds: [],
    canvasActions: [],
    redoActions: [],
    canvasRevision: state.canvasRevision + 1,
    lastRoundResult: null,
  };
}

function closeRound(state: DrawGuessState, reason: DrawGuessRoundResult["reason"], now: number, attemptId: string | null): DrawGuessState {
  if (state.phase !== "playing") return state;
  const remainingMs = reason === "correct" ? Math.max(0, state.roundDeadlineAt - now) : 0;
  const points = reason === "correct" ? scoreDrawGuessRound(remainingMs, state.roundDurationMs) : { guesser: 0, drawer: 0 };
  const guessTimeMs = reason === "correct" ? Math.max(0, now - state.roundStartedAt) : null;
  const next = structuredClone(state);
  next.phase = "roundResult";
  next.autoAdvanceAt = now + DRAW_GUESS_RESULT_MS;
  next.pausedAt = null;
  next.scores[state.guesserId] = (next.scores[state.guesserId] ?? 0) + points.guesser;
  next.scores[state.drawerId] = (next.scores[state.drawerId] ?? 0) + points.drawer;
  next.playerStats[state.guesserId].score = next.scores[state.guesserId];
  next.playerStats[state.drawerId].score = next.scores[state.drawerId];
  if (guessTimeMs !== null) {
    const stats = next.playerStats[state.guesserId];
    stats.correctGuesses += 1;
    stats.totalGuessTimeMs += guessTimeMs;
    stats.bestGuessTimeMs = stats.bestGuessTimeMs === null ? guessTimeMs : Math.min(stats.bestGuessTimeMs, guessTimeMs);
  }
  next.lastRoundResult = {
    round: state.currentRound,
    word: state.word,
    reason,
    guesserId: state.guesserId,
    drawerId: state.drawerId,
    guesserPoints: points.guesser,
    drawerPoints: points.drawer,
    remainingMs,
    guessTimeMs,
    correctAttemptId: attemptId,
  };
  return next;
}

function averageTime(stats: DrawGuessPlayerStats) {
  return stats.correctGuesses > 0 ? stats.totalGuessTimeMs / stats.correctGuesses : Number.POSITIVE_INFINITY;
}

export function resolveDrawGuessWinner(state: DrawGuessState): string | null {
  const [a, b] = state.expectedPlayers;
  if ((state.scores[a] ?? 0) !== (state.scores[b] ?? 0)) return (state.scores[a] ?? 0) > (state.scores[b] ?? 0) ? a : b;
  const averageA = averageTime(state.playerStats[a]);
  const averageB = averageTime(state.playerStats[b]);
  if (averageA !== averageB) return averageA < averageB ? a : b;
  const bestA = state.playerStats[a].bestGuessTimeMs ?? Number.POSITIVE_INFINITY;
  const bestB = state.playerStats[b].bestGuessTimeMs ?? Number.POSITIVE_INFINITY;
  if (bestA !== bestB) return bestA < bestB ? a : b;
  return null;
}

export function getDrawGuessStateForPlayer(state: DrawGuessState, playerId: string, now = Date.now()): DrawGuessPublicState {
  const { wordId: _wordId, wordCategory: _wordCategory, usedWordIds: _usedWordIds, redoActions, processedAttemptIds: _processed, ...publicState } = state;
  const reveal = state.phase !== "playing" || state.drawerId === playerId;
  return {
    ...publicState,
    word: reveal ? state.word : null,
    maskedWord: maskWord(state.word),
    canUndo: state.phase === "playing" && state.drawerId === playerId && state.canvasActions.length > 0,
    canRedo: state.phase === "playing" && state.drawerId === playerId && redoActions.length > 0,
    serverNow: now,
  };
}

export class DrawGuessGame implements GameEngine<DrawGuessState, DrawGuessAction> {
  readonly id = "drawguess" as const;

  createInitialState(options?: Record<string, unknown>): DrawGuessState {
    const players = Array.isArray(options?.playerIds)
      ? (options!.playerIds as unknown[]).filter((id): id is string => typeof id === "string").slice(0, 2)
      : [];
    const configuredRounds = isValidDrawGuessRounds(options?.difficulty) ? Number(options!.difficulty) : 6;
    const roundDurationMs = isValidDrawGuessDuration(options?.roundDurationSeconds)
      ? Number(options!.roundDurationSeconds) * 1_000
      : DRAW_GUESS_ROUND_MS;
    const now = typeof options?.now === "number" ? options.now : Date.now();
    const roles = chooseRoles(players, 1);
    const word = pickDrawGuessWord([]);
    return {
      mode: "duo",
      expectedPlayers: players,
      configuredRounds,
      roundDurationMs,
      totalRounds: configuredRounds,
      currentRound: 1,
      tiebreakPairs: 0,
      phase: "playing",
      drawerId: roles.drawerId,
      guesserId: roles.guesserId,
      wordId: word.id,
      word: word.value,
      wordCategory: word.category,
      usedWordIds: [word.id],
      roundStartedAt: now,
      roundDeadlineAt: now + roundDurationMs,
      pausedAt: null,
      autoAdvanceAt: null,
      startedAt: now,
      finishedAt: null,
      winnerId: null,
      scores: Object.fromEntries(players.map((id) => [id, 0])),
      playerStats: blankStats(players),
      attempts: [],
      processedAttemptIds: [],
      canvasActions: [],
      redoActions: [],
      canvasRevision: 1,
      lastRoundResult: null,
    };
  }

  applyAction(state: DrawGuessState, action: DrawGuessAction, playerId: string): DrawGuessState {
    if (!action || state.phase === "finished") return state;
    const now = "now" in action && typeof action.now === "number" ? action.now : Date.now();

    if (action.type === "resume" && playerId === "system" && state.pausedAt !== null) {
      const pauseMs = Math.max(0, now - state.pausedAt);
      return {
        ...state,
        pausedAt: null,
        roundStartedAt: state.roundStartedAt + pauseMs,
        roundDeadlineAt: state.roundDeadlineAt + pauseMs,
        autoAdvanceAt: state.autoAdvanceAt === null ? null : state.autoAdvanceAt + pauseMs,
      };
    }
    if (state.pausedAt !== null) return state;

    if (action.type === "submitGuess") {
      if (state.phase !== "playing" || playerId !== state.guesserId || !safeId(action.id) || typeof action.guess !== "string") return state;
      if (state.processedAttemptIds.includes(action.id) || action.guess.length > 80) return state;
      const text = action.guess.trim().replace(/\s+/g, " ");
      const normalized = normalizeDrawGuessAnswer(text);
      if (!normalized) return state;
      const correct = normalized === normalizeDrawGuessAnswer(state.word);
      const attempt: DrawGuessAttempt = { id: action.id, playerId, text, normalized, createdAt: now, correct };
      const next = {
        ...state,
        attempts: [...state.attempts.slice(-11), attempt],
        processedAttemptIds: [...state.processedAttemptIds.slice(-79), action.id],
      };
      return correct ? closeRound(next, "correct", now, action.id) : next;
    }

    if (action.type === "timeUp" && playerId === "system") {
      if (state.phase !== "playing" || now < state.roundDeadlineAt) return state;
      return closeRound(state, "timeUp", now, null);
    }

    if (action.type === "advanceRound" && playerId === "system") {
      if (state.phase !== "roundResult" || state.autoAdvanceAt === null || now < state.autoAdvanceAt) return state;
      if (state.currentRound < state.totalRounds) return beginRound(state, state.currentRound + 1, now);
      const winnerId = resolveDrawGuessWinner(state);
      if (winnerId) return { ...state, phase: "finished", finishedAt: now, winnerId, autoAdvanceAt: null };
      const extended = { ...state, totalRounds: state.totalRounds + 2, tiebreakPairs: state.tiebreakPairs + 1 };
      return beginRound(extended, state.currentRound + 1, now);
    }

    if (state.phase !== "playing" || playerId !== state.drawerId) return state;
    if (action.type === "draw") {
      if (!isValidDrawGuessCanvasAction(action.action) || action.action.kind === "clear") return state;
      if (state.canvasActions.some((item) => item.id === action.action.id) || state.canvasActions.length >= DRAW_GUESS_MAX_CANVAS_ACTIONS) return state;
      return { ...state, canvasActions: [...state.canvasActions, action.action], redoActions: [], canvasRevision: state.canvasRevision + 1 };
    }
    if (action.type === "undo") {
      const previous = state.canvasActions.at(-1);
      if (!previous) return state;
      return { ...state, canvasActions: state.canvasActions.slice(0, -1), redoActions: [...state.redoActions, previous], canvasRevision: state.canvasRevision + 1 };
    }
    if (action.type === "redo") {
      const restored = state.redoActions.at(-1);
      if (!restored || state.canvasActions.length >= DRAW_GUESS_MAX_CANVAS_ACTIONS) return state;
      return { ...state, canvasActions: [...state.canvasActions, restored], redoActions: state.redoActions.slice(0, -1), canvasRevision: state.canvasRevision + 1 };
    }
    if (action.type === "clear" && safeId(action.id)) {
      if (state.canvasActions.length === 0 || state.canvasActions.length >= DRAW_GUESS_MAX_CANVAS_ACTIONS) return state;
      const clear: DrawGuessCanvasAction = { id: action.id, kind: "clear" };
      return { ...state, canvasActions: [...state.canvasActions, clear], redoActions: [], canvasRevision: state.canvasRevision + 1 };
    }
    return state;
  }

  isSolved(state: DrawGuessState): boolean {
    return state.phase === "finished";
  }

  reset(state: DrawGuessState): DrawGuessState {
    return this.createInitialState({
      playerIds: [...state.expectedPlayers].reverse(),
      difficulty: state.configuredRounds,
      roundDurationSeconds: state.roundDurationMs / 1_000,
    });
  }

  releasePlayer(state: DrawGuessState): DrawGuessState {
    if (state.phase === "finished" || state.pausedAt !== null) return state;
    return { ...state, pausedAt: Date.now() };
  }
}
