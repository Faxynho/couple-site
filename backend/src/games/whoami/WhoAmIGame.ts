import { GameEngine } from "../../types";
import { getWhoAmIItem, isWhoAmIAnswerCorrect, selectWhoAmIItems } from "./itemBank";
import {
  WhoAmICategory,
  WhoAmIDifficulty,
  WhoAmIMode,
  isValidWhoAmICategory,
  isValidWhoAmIDifficulty,
  isValidWhoAmIMode,
} from "./types";

export { isValidWhoAmICategory, isValidWhoAmIDifficulty, isValidWhoAmIMode } from "./types";

export interface WhoAmIPlayerState {
  hintsRevealed: number;
  attempts: number;
  correctAt: number | null;
  answerTimeMs: number | null;
  gaveUp: boolean;
  lastGuessCorrect: boolean | null;
  lastGuessAt: number | null;
}

export type WhoAmIResultReason =
  | "duelHints"
  | "classicFirst"
  | "togetherSolved"
  | "giveUp"
  | "togetherGiveUp"
  | null;

export interface WhoAmIState {
  difficulty: WhoAmIDifficulty;
  mode: WhoAmIMode;
  category: WhoAmICategory;
  expectedPlayers: string[];
  /** Nos modos com pistas, os dois compartilham este item. */
  sharedItemId: string | null;
  /** No clássico, cada id aponta para a identidade QUE A PRÓPRIA PESSOA precisa descobrir. */
  classicItemIds: Record<string, string>;
  players: Record<string, WhoAmIPlayerState>;
  teamHintsRevealed: number;
  teamAttempts: number;
  teamLastGuessCorrect: boolean | null;
  teamLastGuessAt: number | null;
  startedAt: number;
  finished: boolean;
  finishedAt: number | null;
  winnerId: string | null;
  resultReason: WhoAmIResultReason;
}

export type WhoAmIAction =
  | { type: "revealHint" }
  | { type: "submitGuess"; guess: string }
  | { type: "giveUp" };

export interface WhoAmIPublicPlayerProgress {
  hintsRevealed: number;
  attempts: number;
  correct: boolean;
  gaveUp: boolean;
  answerTimeMs: number | null;
}

export interface WhoAmIPublicState {
  difficulty: WhoAmIDifficulty;
  mode: WhoAmIMode;
  category: WhoAmICategory;
  expectedPlayers: string[];
  startedAt: number;
  finished: boolean;
  finishedAt: number | null;
  winnerId: string | null;
  resultReason: WhoAmIResultReason;
  revealedHintCount: number;
  hints: (string | null)[];
  answer: string | null;
  playerProgress: Record<string, WhoAmIPublicPlayerProgress>;
  ownLastGuessCorrect: boolean | null;
  ownLastGuessAt: number | null;
  teamAttempts: number;
  teamLastGuessCorrect: boolean | null;
  teamLastGuessAt: number | null;
  classicPartnerIdentity: { answer: string; category: WhoAmICategory } | null;
  classicOwnIdentity: { answer: string; category: WhoAmICategory } | null;
  classicRevealedIdentities: Record<string, string> | null;
}

const DEFAULT_DIFFICULTY: WhoAmIDifficulty = "easy";
const DEFAULT_MODE: WhoAmIMode = "duelHints";
const DEFAULT_CATEGORY: WhoAmICategory = "all";

function blankPlayerState(mode: WhoAmIMode): WhoAmIPlayerState {
  return {
    // A primeira pista já começa aberta, exatamente como combinado.
    hintsRevealed: mode === "duelHints" ? 1 : 0,
    attempts: 0,
    correctAt: null,
    answerTimeMs: null,
    gaveUp: false,
    lastGuessCorrect: null,
    lastGuessAt: null,
  };
}

function compareDuelPlayers(state: WhoAmIState, idA: string, idB: string): string | null {
  const a = state.players[idA];
  const b = state.players[idB];
  if (!a || !b) return null;

  if (a.gaveUp && b.gaveUp) return null;
  if (a.gaveUp) return idB;
  if (b.gaveUp) return idA;
  if (!a.correctAt || !b.correctAt) return null;

  if (a.hintsRevealed !== b.hintsRevealed) {
    return a.hintsRevealed < b.hintsRevealed ? idA : idB;
  }

  if ((a.answerTimeMs ?? Infinity) !== (b.answerTimeMs ?? Infinity)) {
    return (a.answerTimeMs ?? Infinity) < (b.answerTimeMs ?? Infinity) ? idA : idB;
  }

  return null;
}

function finish(state: WhoAmIState, winnerId: string | null, reason: WhoAmIResultReason, now = Date.now()): WhoAmIState {
  const next = structuredClone(state);
  next.finished = true;
  next.finishedAt = now;
  next.winnerId = winnerId;
  next.resultReason = reason;
  return next;
}

/**
 * O Duelo por pistas só termina quando OS DOIS jogadores encerraram sua
 * tentativa individual: acertando ou desistindo. Mesmo que alguém acerte com
 * uma quantidade de pistas que já garanta a vitória, o adversário continua
 * jogando normalmente até responder ou desistir.
 */
function resolveDuelHints(state: WhoAmIState): WhoAmIState {
  const [idA, idB] = state.expectedPlayers;
  if (!idA || !idB) return state;
  const a = state.players[idA];
  const b = state.players[idB];
  if (!a || !b) return state;

  const aDone = Boolean(a.correctAt) || a.gaveUp;
  const bDone = Boolean(b.correctAt) || b.gaveUp;

  // Enquanto um dos dois ainda estiver tentando, a rodada continua.
  if (!aDone || !bDone) return state;

  // Ambos desistiram: ninguém vence.
  if (a.gaveUp && b.gaveUp) return finish(state, null, "giveUp");

  // Um desistiu e o outro acertou: quem acertou vence.
  if (a.gaveUp) return finish(state, b.correctAt ? idB : null, "giveUp");
  if (b.gaveUp) return finish(state, a.correctAt ? idA : null, "giveUp");

  // Os dois acertaram: primeiro compara pistas; só em empate de pistas o
  // tempo de resposta decide.
  return finish(state, compareDuelPlayers(state, idA, idB), "duelHints");
}

export class WhoAmIGame implements GameEngine<WhoAmIState, WhoAmIAction> {
  readonly id = "whoami" as const;

  createInitialState(options?: Record<string, unknown>): WhoAmIState {
    const difficulty = isValidWhoAmIDifficulty(options?.difficulty) ? options!.difficulty : DEFAULT_DIFFICULTY;
    const mode = isValidWhoAmIMode(options?.mode) ? options!.mode : DEFAULT_MODE;
    const category = isValidWhoAmICategory(options?.category) ? options!.category : DEFAULT_CATEGORY;
    const playerIds = Array.isArray(options?.playerIds)
      ? (options!.playerIds as unknown[]).filter((id): id is string => typeof id === "string").slice(0, 2)
      : [];

    const players: Record<string, WhoAmIPlayerState> = {};
    for (const id of playerIds) players[id] = blankPlayerState(mode);

    let sharedItemId: string | null = null;
    const classicItemIds: Record<string, string> = {};

    if (mode === "classicDuel") {
      const picked = selectWhoAmIItems(difficulty, category, Math.max(2, playerIds.length));
      playerIds.forEach((id, index) => {
        const item = picked[index] ?? picked[0];
        if (item) classicItemIds[id] = item.id;
      });
    } else {
      sharedItemId = selectWhoAmIItems(difficulty, category, 1)[0]?.id ?? null;
    }

    return {
      difficulty,
      mode,
      category,
      expectedPlayers: playerIds,
      sharedItemId,
      classicItemIds,
      players,
      teamHintsRevealed: mode === "togetherHints" ? 1 : 0,
      teamAttempts: 0,
      teamLastGuessCorrect: null,
      teamLastGuessAt: null,
      startedAt: Date.now(),
      finished: false,
      finishedAt: null,
      winnerId: null,
      resultReason: null,
    };
  }

  applyAction(state: WhoAmIState, action: WhoAmIAction, playerId: string): WhoAmIState {
    if (state.finished || !state.expectedPlayers.includes(playerId) || !state.players[playerId]) return state;

    if (action.type === "revealHint") {
      if (state.mode === "classicDuel") return state;

      const next = structuredClone(state);
      if (state.mode === "togetherHints") {
        next.teamHintsRevealed = Math.min(5, next.teamHintsRevealed + 1);
        return next;
      }

      const own = next.players[playerId];
      if (own.correctAt || own.gaveUp) return state;
      own.hintsRevealed = Math.min(5, own.hintsRevealed + 1);
      return resolveDuelHints(next);
    }

    if (action.type === "submitGuess") {
      if (typeof action.guess !== "string" || action.guess.trim().length === 0 || action.guess.length > 100) return state;
      const now = Date.now();

      if (state.mode === "togetherHints") {
        const item = state.sharedItemId ? getWhoAmIItem(state.sharedItemId) : null;
        if (!item) return state;
        const correct = isWhoAmIAnswerCorrect(item, action.guess);
        const next = structuredClone(state);
        next.teamAttempts += 1;
        next.teamLastGuessCorrect = correct;
        next.teamLastGuessAt = now;
        if (correct) return finish(next, null, "togetherSolved", now);
        return next;
      }

      const itemId = state.mode === "classicDuel" ? state.classicItemIds[playerId] : state.sharedItemId;
      const item = itemId ? getWhoAmIItem(itemId) : null;
      if (!item) return state;

      const next = structuredClone(state);
      const own = next.players[playerId];
      if (own.correctAt || own.gaveUp) return state;

      own.attempts += 1;
      const correct = isWhoAmIAnswerCorrect(item, action.guess);
      own.lastGuessCorrect = correct;
      own.lastGuessAt = now;

      if (!correct) return next;

      own.correctAt = now;
      own.answerTimeMs = Math.max(0, now - next.startedAt);

      if (state.mode === "classicDuel") {
        return finish(next, playerId, "classicFirst", now);
      }

      return resolveDuelHints(next);
    }

    if (action.type === "giveUp") {
      const now = Date.now();

      if (state.mode === "togetherHints") {
        return finish(state, null, "togetherGiveUp", now);
      }

      if (state.mode === "classicDuel") {
        const opponentId = state.expectedPlayers.find((id) => id !== playerId) ?? null;
        const next = structuredClone(state);
        next.players[playerId].gaveUp = true;
        return finish(next, opponentId, "giveUp", now);
      }

      const next = structuredClone(state);
      next.players[playerId].gaveUp = true;
      return resolveDuelHints(next);
    }

    return state;
  }

  isSolved(state: WhoAmIState): boolean {
    return state.finished;
  }

  reset(state: WhoAmIState): WhoAmIState {
    return this.createInitialState({
      difficulty: state.difficulty,
      mode: state.mode,
      category: state.category,
      playerIds: state.expectedPlayers,
    });
  }
}

function publicProgress(state: WhoAmIState, viewerId: string): Record<string, WhoAmIPublicPlayerProgress> {
  const result: Record<string, WhoAmIPublicPlayerProgress> = {};
  for (const [id, progress] of Object.entries(state.players)) {
    result[id] = {
      hintsRevealed: progress.hintsRevealed,
      attempts: id === viewerId || state.finished ? progress.attempts : 0,
      correct: Boolean(progress.correctAt),
      gaveUp: progress.gaveUp,
      answerTimeMs: id === viewerId || state.finished ? progress.answerTimeMs : null,
    };
  }
  return result;
}

/**
 * Estado personalizado por jogador.
 * - Duelo por pistas: cada um recebe só as pistas que ELE revelou.
 * - Clássico: cada um recebe a identidade do PAR, nunca a própria.
 * - Juntos: as pistas são compartilhadas e chegam iguais aos dois.
 * - A resposta real só aparece quando a rodada termina.
 */
export function getWhoAmIStateForPlayer(state: WhoAmIState | null, playerId: string): WhoAmIPublicState | null {
  if (!state) return null;

  const own = state.players[playerId];
  const sharedItem = state.sharedItemId ? getWhoAmIItem(state.sharedItemId) : null;

  let hints: (string | null)[] = [];
  let answer: string | null = null;
  let classicPartnerIdentity: WhoAmIPublicState["classicPartnerIdentity"] = null;
  let classicOwnIdentity: WhoAmIPublicState["classicOwnIdentity"] = null;
  let classicRevealedIdentities: Record<string, string> | null = null;

  if (state.mode === "duelHints" && sharedItem) {
    const count = own?.hintsRevealed ?? 1;
    hints = sharedItem.hints.map((hint, index) => (index < count || state.finished ? hint : null));
    answer = state.finished ? sharedItem.answer : null;
  } else if (state.mode === "togetherHints" && sharedItem) {
    hints = sharedItem.hints.map((hint, index) => (index < state.teamHintsRevealed || state.finished ? hint : null));
    answer = state.finished ? sharedItem.answer : null;
  } else if (state.mode === "classicDuel") {
    const opponentId = state.expectedPlayers.find((id) => id !== playerId);
    const opponentItem = opponentId ? getWhoAmIItem(state.classicItemIds[opponentId]) : null;
    if (opponentItem) {
      classicPartnerIdentity = { answer: opponentItem.answer, category: opponentItem.category };
    }

    if (state.finished) {
      const ownItem = getWhoAmIItem(state.classicItemIds[playerId]);
      if (ownItem) classicOwnIdentity = { answer: ownItem.answer, category: ownItem.category };
      classicRevealedIdentities = {};
      for (const [id, itemId] of Object.entries(state.classicItemIds)) {
        const item = getWhoAmIItem(itemId);
        if (item) classicRevealedIdentities[id] = item.answer;
      }
    }
  }

  return {
    difficulty: state.difficulty,
    mode: state.mode,
    category: state.category,
    expectedPlayers: state.expectedPlayers,
    startedAt: state.startedAt,
    finished: state.finished,
    finishedAt: state.finishedAt,
    winnerId: state.winnerId,
    resultReason: state.resultReason,
    revealedHintCount: state.mode === "togetherHints" ? state.teamHintsRevealed : (own?.hintsRevealed ?? 0),
    hints,
    answer,
    playerProgress: publicProgress(state, playerId),
    ownLastGuessCorrect: own?.lastGuessCorrect ?? null,
    ownLastGuessAt: own?.lastGuessAt ?? null,
    teamAttempts: state.teamAttempts,
    teamLastGuessCorrect: state.teamLastGuessCorrect,
    teamLastGuessAt: state.teamLastGuessAt,
    classicPartnerIdentity,
    classicOwnIdentity,
    classicRevealedIdentities,
  };
}
