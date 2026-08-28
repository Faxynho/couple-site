import { GameEngine } from "../../types";

/** Jogo da Memória: o mapa completo dos ícones fica somente no servidor.
 * O socketHandlers envia uma versão mascarada, revelando a imagem apenas
 * quando uma carta está aberta ou já foi encontrada. */

export type MemoryDifficulty = "easy" | "medium" | "hard";
export type MemoryMode = "solo" | "duel" | "together";

const VALID_DIFFICULTIES: MemoryDifficulty[] = ["easy", "medium", "hard"];
const VALID_MODES: MemoryMode[] = ["solo", "duel", "together"];

export function isValidMemoryDifficulty(value: string): value is MemoryDifficulty {
  return (VALID_DIFFICULTIES as string[]).includes(value);
}

export function isValidMemoryMode(value: string): value is MemoryMode {
  return (VALID_MODES as string[]).includes(value);
}

const ICON_IDS = [
  "bee",
  "chicken",
  "cow",
  "dna",
  "horse",
  "ladybug",
  "moon",
  "mortarboard",
  "mushroom",
  "paper-plane",
  "pig",
  "rabbit",
  "sun",
  "tulip",
  "world",
] as const;

interface DifficultyConfig {
  rows: number;
  cols: number;
  pairCount: number;
  previewMs: number;
  timeLimitMs: number;
  scoreWindowSeconds: number;
}

export const MEMORY_DIFFICULTY_CONFIG: Record<MemoryDifficulty, DifficultyConfig> = {
  easy: { rows: 3, cols: 3, pairCount: 4, previewMs: 4_000, timeLimitMs: 90_000, scoreWindowSeconds: 60 },
  medium: { rows: 4, cols: 4, pairCount: 8, previewMs: 5_000, timeLimitMs: 180_000, scoreWindowSeconds: 120 },
  hard: { rows: 5, cols: 5, pairCount: 12, previewMs: 6_000, timeLimitMs: 300_000, scoreWindowSeconds: 180 },
};

export interface MemorySlot {
  id: string;
  /** null representa o espaço vazio natural nas grades 3x3 e 5x5. */
  iconId: string | null;
}

export interface MemoryPlayerProgress {
  matchedSlotIds: string[];
  openSlotIds: string[];
  score: number;
  /** Acertos consecutivos; no Duelo é individual, em Juntos é compartilhado. */
  combo: number;
  pairsFound: number;
  mistakes: number;
  /** Momento em que um par errado deve voltar a ficar oculto. */
  mismatchUntil: number | null;
  finished: boolean;
  completed: boolean;
  finishedAt: number | null;
  timeUsedMs: number | null;
}

export interface MemoryResultEntry {
  playerId: string;
  place: number;
  score: number;
  pairsFound: number;
  timeUsedMs: number;
  completed: boolean;
}

export interface MemoryState {
  difficulty: MemoryDifficulty;
  mode: MemoryMode;
  rows: number;
  cols: number;
  pairCount: number;
  slots: MemorySlot[];
  expectedPlayers: string[];
  progress: Record<string, MemoryPlayerProgress>;
  startedAt: number;
  previewEndsAt: number;
  playStartedAt: number | null;
  deadlineAt: number | null;
  finished: boolean;
  finishedAt: number | null;
  results: MemoryResultEntry[];
}

export type MemoryAction =
  | { type: "startPlay" }
  | { type: "flipCard"; slotId: string }
  | { type: "hideMismatch"; playerId: string }
  | { type: "timeUp" };

const DEFAULT_DIFFICULTY: MemoryDifficulty = "medium";
const MISMATCH_VISIBLE_MS = 1_250;
const MAX_POINTS_PER_PAIR = 100;
const MIN_POINTS_PER_PAIR = 40;
const COMBO_BONUS_STEP = 5;
const MAX_COMBO_BONUS = 20;

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5;
}

function pointsForMatch(playStartedAt: number, now: number, windowSeconds: number): number {
  // Segundos inteiros tornam a pontuação estável: diferenças de milissegundos
  // nunca mudam o placar.
  const elapsedSeconds = Math.max(0, Math.floor((now - playStartedAt) / 1_000));
  const fraction = 1 - Math.min(elapsedSeconds, windowSeconds) / windowSeconds;
  return roundToFive(MIN_POINTS_PER_PAIR + (MAX_POINTS_PER_PAIR - MIN_POINTS_PER_PAIR) * fraction);
}

function comboBonus(combo: number): number {
  // O primeiro par vale apenas a pontuação normal. Cada par seguinte adiciona
  // 5 pontos, com teto de 20 para manter o placar previsível e equilibrado.
  return Math.min(Math.max(0, combo - 1) * COMBO_BONUS_STEP, MAX_COMBO_BONUS);
}

function createSlots(difficulty: MemoryDifficulty): MemorySlot[] {
  const config = MEMORY_DIFFICULTY_CONFIG[difficulty];
  const icons = shuffle(ICON_IDS).slice(0, config.pairCount);
  const cards = shuffle([...icons, ...icons]);
  const emptyCount = config.rows * config.cols - cards.length;
  const entries: (string | null)[] = [...cards, ...Array.from({ length: emptyCount }, () => null)];
  return shuffle(entries).map((iconId, index) => ({ id: `slot-${index}`, iconId }));
}

function blankProgress(): MemoryPlayerProgress {
  return {
    matchedSlotIds: [],
    openSlotIds: [],
    score: 0,
    combo: 0,
    pairsFound: 0,
    mistakes: 0,
    mismatchUntil: null,
    finished: false,
    completed: false,
    finishedAt: null,
    timeUsedMs: null,
  };
}

function finishProgress(progress: MemoryPlayerProgress, playStartedAt: number, now: number, completed: boolean, timeLimitMs: number) {
  if (progress.finished) return;
  progress.finished = true;
  progress.completed = completed;
  progress.finishedAt = now;
  progress.timeUsedMs = completed ? Math.max(0, now - playStartedAt) : timeLimitMs;
  progress.openSlotIds = [];
  progress.mismatchUntil = null;
}

function buildResults(state: MemoryState): MemoryResultEntry[] {
  const rows = state.expectedPlayers.map((playerId) => {
    const progress = state.progress[playerId] ?? blankProgress();
    return {
      playerId,
      score: progress.score,
      pairsFound: progress.pairsFound,
      timeUsedMs: progress.timeUsedMs ?? (state.deadlineAt && state.playStartedAt ? state.deadlineAt - state.playStartedAt : 0),
      completed: progress.completed,
    };
  });
  rows.sort((a, b) => b.score - a.score || b.pairsFound - a.pairsFound || a.timeUsedMs - b.timeUsedMs);
  return rows.map((row, index) => ({ ...row, place: index + 1 }));
}

function finishMatch(state: MemoryState, now: number) {
  if (state.finished) return;
  state.finished = true;
  state.finishedAt = now;
  state.results = buildResults(state);
}

export class MemoryGame implements GameEngine<MemoryState, MemoryAction> {
  readonly id = "memory" as const;

  createInitialState(options?: Record<string, unknown>): MemoryState {
    const rawDifficulty = typeof options?.difficulty === "string" ? options.difficulty : DEFAULT_DIFFICULTY;
    const difficulty = isValidMemoryDifficulty(rawDifficulty) ? rawDifficulty : DEFAULT_DIFFICULTY;
    const rawMode = typeof options?.mode === "string" ? options.mode : "solo";
    const mode = isValidMemoryMode(rawMode) ? rawMode : "solo";
    const expectedPlayers = Array.isArray(options?.playerIds) ? (options.playerIds as string[]) : [];
    const now = Date.now();
    const progress: Record<string, MemoryPlayerProgress> = {};
    for (const playerId of expectedPlayers) progress[playerId] = blankProgress();
    const config = MEMORY_DIFFICULTY_CONFIG[difficulty];

    return {
      difficulty,
      mode,
      rows: config.rows,
      cols: config.cols,
      pairCount: config.pairCount,
      slots: createSlots(difficulty),
      expectedPlayers,
      progress,
      startedAt: now,
      previewEndsAt: now + config.previewMs,
      playStartedAt: null,
      deadlineAt: null,
      finished: false,
      finishedAt: null,
      results: [],
    };
  }

  applyAction(state: MemoryState, action: MemoryAction, playerId: string): MemoryState {
    if (state.finished) return state;
    const now = Date.now();

    if (action.type === "startPlay") {
      if (state.playStartedAt !== null || now < state.previewEndsAt) return state;
      const next = structuredClone(state);
      next.playStartedAt = now;
      next.deadlineAt = now + MEMORY_DIFFICULTY_CONFIG[next.difficulty].timeLimitMs;
      return next;
    }

    if (action.type === "hideMismatch") {
      const progress = state.progress[action.playerId];
      if (!progress || !progress.mismatchUntil || now < progress.mismatchUntil) return state;
      const next = structuredClone(state);
      const nextProgress = next.progress[action.playerId];
      nextProgress.openSlotIds = [];
      nextProgress.mismatchUntil = null;
      return next;
    }

    if (action.type === "timeUp") {
      if (state.playStartedAt === null || !state.deadlineAt || now < state.deadlineAt) return state;
      const next = structuredClone(state);
      const config = MEMORY_DIFFICULTY_CONFIG[next.difficulty];
      for (const progress of Object.values(next.progress)) {
        finishProgress(progress, next.playStartedAt!, now, progress.completed, config.timeLimitMs);
      }
      finishMatch(next, now);
      return next;
    }

    if (action.type !== "flipCard" || state.playStartedAt === null || !state.deadlineAt || now >= state.deadlineAt) {
      return state;
    }
    if (!state.expectedPlayers.includes(playerId)) return state;
    const slot = state.slots.find((candidate) => candidate.id === action.slotId);
    if (!slot || slot.iconId === null) return state;

    const next = structuredClone(state);
    const targetIds = next.mode === "together" ? next.expectedPlayers : [playerId];
    const actorProgress = next.progress[playerId];
    if (!actorProgress || actorProgress.finished || actorProgress.mismatchUntil || actorProgress.openSlotIds.length >= 2) return state;
    if (actorProgress.matchedSlotIds.includes(slot.id) || actorProgress.openSlotIds.includes(slot.id)) return state;

    // Em Duelo targetIds contém apenas playerId: nada que ele faça é escrito
    // no progresso, feedback ou visibilidade do adversário.
    for (const targetId of targetIds) {
      const progress = next.progress[targetId];
      if (!progress || progress.finished) continue;
      progress.openSlotIds.push(slot.id);
    }

    if (actorProgress.openSlotIds.length < 2) return next;

    const selected = [...actorProgress.openSlotIds];
    const first = next.slots.find((candidate) => candidate.id === selected[0]);
    const second = next.slots.find((candidate) => candidate.id === selected[1]);
    const matched = Boolean(first?.iconId && first.iconId === second?.iconId);
    const config = MEMORY_DIFFICULTY_CONFIG[next.difficulty];

    for (const targetId of targetIds) {
      const progress = next.progress[targetId];
      if (!progress || progress.finished) continue;
      if (matched) {
        progress.matchedSlotIds.push(...selected);
        progress.openSlotIds = [];
        progress.pairsFound += 1;
        progress.combo += 1;
        progress.score += pointsForMatch(next.playStartedAt!, now, config.scoreWindowSeconds) + comboBonus(progress.combo);
        if (progress.pairsFound === next.pairCount) {
          finishProgress(progress, next.playStartedAt!, now, true, config.timeLimitMs);
        }
      } else {
        progress.mistakes += 1;
        progress.combo = 0;
        progress.mismatchUntil = now + MISMATCH_VISIBLE_MS;
      }
    }

    if (next.mode === "together") {
      if (targetIds.length > 0 && targetIds.every((id) => next.progress[id]?.finished)) finishMatch(next, now);
    } else if (next.mode === "solo") {
      if (next.progress[playerId]?.finished) finishMatch(next, now);
    } else if (next.expectedPlayers.length > 0 && next.expectedPlayers.every((id) => next.progress[id]?.finished)) {
      // No Duelo, a primeira pessoa a terminar fica congelada, mas a partida
      // inteira só acaba quando a outra também termina ou o cronômetro expira.
      finishMatch(next, now);
    }

    return next;
  }

  isSolved(state: MemoryState): boolean {
    return state.finished;
  }

  reset(state: MemoryState): MemoryState {
    return this.createInitialState({
      difficulty: state.difficulty,
      mode: state.mode,
      playerIds: state.expectedPlayers,
    });
  }
}
