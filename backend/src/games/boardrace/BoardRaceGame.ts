import { GameEngine } from "../../types";
import { selectQuizQuestions } from "../quiz/questionBank";
import { cloneBoardRaceSpaces } from "./boardConfig";
import {
  applyEmbeddedMinigameAction,
  BOARD_RACE_MINIGAMES,
  BOARD_RACE_MINIGAME_TITLES,
  createEmbeddedMinigame,
  delayEmbeddedMinigameStart,
  embeddedMinigameWinnerIds,
  isEmbeddedMinigameFinished,
  maskEmbeddedMinigameState,
  tickEmbeddedMinigame,
} from "./minigameAdapters";
import { BOARD_RACE_MAX_POWERS, BOARD_RACE_POWER_IDS } from "./powerConfig";
import {
  BoardRaceAction,
  BoardRaceLogEntry,
  BoardRaceMinigameKind,
  BoardRaceMoveState,
  BoardRacePlayerState,
  BoardRacePowerId,
  BoardRaceState,
} from "./types";

const BOT_ID = "BOT";
const TURN_TRANSITION_MS = 1_600;
const DICE_REVEAL_MS = 650;
const MOVE_STEP_MS = 420;
const NORMAL_LANDING_FEEDBACK_MS = 750;
const SPECIAL_LANDING_FEEDBACK_MS = 1_350;
const BOT_THINK_MS = 900;
export const BOARD_RACE_MINIGAME_COUNTDOWN_MS = 4_000;
const MAX_EFFECT_CHAIN = 4;

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function blankPlayer(): BoardRacePlayerState {
  return {
    position: 0,
    skipNextTurn: false,
    powers: [],
    shieldActive: false,
    rollBonus: 0,
    pendingRollPenalty: 0,
    pendingQuiz: null,
  };
}

function isValidMode(value: unknown): value is "solo" | "duel" {
  return value === "solo" || value === "duel";
}

export function isValidBoardRaceMode(value: string): value is "solo" | "duel" {
  return isValidMode(value);
}

function addLog(
  state: BoardRaceState,
  message: string,
  tone: "neutral" | "positive" | "negative" = "neutral",
  meta: Partial<Omit<BoardRaceLogEntry, "id" | "message" | "tone">> = {}
) {
  state.eventSerial += 1;
  state.eventLog = [...state.eventLog, { id: state.eventSerial, message, tone, ...meta }].slice(-12);
}

function otherPlayerId(state: BoardRaceState, playerId: string): string | null {
  return state.playerOrder.find((id) => id !== playerId) ?? null;
}

function finishIfNeeded(state: BoardRaceState, playerId: string): boolean {
  if (state.players[playerId].position < state.lastPosition) return false;
  state.players[playerId].position = state.lastPosition;
  state.winnerId = playerId;
  state.finishedAt = Date.now();
  state.phase = "finished";
  addLog(state, playerId === BOT_ID ? "O BOT chegou ao final." : "Você alcançou a chegada!", "positive", { kind: "finish", playerId });
  return true;
}

function moveBy(state: BoardRaceState, playerId: string, amount: number, movement: BoardRaceMoveState) {
  const player = state.players[playerId];
  const direction = Math.sign(amount);
  const steps = Math.abs(amount);
  for (let step = 0; step < steps; step += 1) {
    const next = Math.max(0, Math.min(state.lastPosition, player.position + direction));
    if (next === player.position) break;
    player.position = next;
    movement.path.push(next);
    if (next === state.lastPosition) break;
  }
  movement.to = player.position;
}

function consumeShield(state: BoardRaceState, playerId: string, effectName: string): boolean {
  const player = state.players[playerId];
  if (!player.shieldActive) return false;
  player.shieldActive = false;
  addLog(state, `O escudo bloqueou ${effectName}.`, "positive", { kind: "shieldBlocked", playerId });
  return true;
}

function grantRandomPower(state: BoardRaceState, playerId: string) {
  const player = state.players[playerId];
  if (player.powers.length >= BOARD_RACE_MAX_POWERS) {
    addLog(state, "O inventário já está cheio (máximo de 2 poderes).", "neutral");
    return;
  }
  const powerId = BOARD_RACE_POWER_IDS[randomInt(0, BOARD_RACE_POWER_IDS.length - 1)];
  player.powers.push(powerId);
  addLog(state, `Tesouro encontrado: poder ${powerId}.`, "positive", { kind: "powerGranted", playerId, powerId });
}

function startMinigame(state: BoardRaceState, playerId: string) {
  const kind = BOARD_RACE_MINIGAMES[randomInt(0, BOARD_RACE_MINIGAMES.length - 1)];
  const embedded = createEmbeddedMinigame(kind, state.playerOrder, state.mode === "solo");
  state.pendingMinigame = {
    kind,
    title: BOARD_RACE_MINIGAME_TITLES[kind],
    challengerId: playerId,
    playerIds: state.playerOrder,
    state: embedded.state,
    startedAt: Date.now(),
    readyAt: Date.now(),
    expiresAt: embedded.expiresAt,
    botNextActionAt: embedded.botNextActionAt,
  };
  state.phase = "minigame";
  addLog(state, `Desafio iniciado: ${BOARD_RACE_MINIGAME_TITLES[kind]}.`, "neutral", { kind: "minigameStart", playerId, spaceType: "minigame" });
}

function resolveSpace(
  state: BoardRaceState,
  playerId: string,
  movement: BoardRaceMoveState,
  chainDepth = 0
) {
  if (state.phase === "finished" || chainDepth > MAX_EFFECT_CHAIN) return;
  const player = state.players[playerId];
  const space = state.spaces[player.position];
  if (!space) return;

  switch (space.type) {
    case "normal":
    case "start":
    case "finish":
      return;
    case "advance": {
      const amount = randomInt(1, 3);
      addLog(state, `Casa Avançar: +${amount} casas.`, "positive", { kind: "advance", playerId, amount, spaceType: "advance" });
      moveBy(state, playerId, amount, movement);
      if (!finishIfNeeded(state, playerId)) resolveSpace(state, playerId, movement, chainDepth + 1);
      return;
    }
    case "retreat": {
      if (consumeShield(state, playerId, "o recuo")) return;
      const amount = randomInt(1, 3);
      addLog(state, `Casa Recuar: -${amount} casas.`, "negative", { kind: "retreat", playerId, amount, spaceType: "retreat" });
      moveBy(state, playerId, -amount, movement);
      // Regra deliberada: uma penalidade para trás nunca dispara o efeito da casa de destino.
      return;
    }
    case "prison":
      if (!consumeShield(state, playerId, "a prisão")) {
        player.skipNextTurn = true;
        addLog(state, "Prisão: a próxima jogada será perdida.", "negative", { kind: "prison", playerId, spaceType: "prison" });
      }
      return;
    case "quiz": {
      const question = selectQuizQuestions("medium", 1)[0];
      if (question) player.pendingQuiz = { ...question, assignedAt: Date.now() };
      addLog(state, "Quiz pendente para o próximo turno.", "neutral", { kind: "quizPending", playerId, spaceType: "quiz" });
      return;
    }
    case "minigame":
      startMinigame(state, playerId);
      return;
    case "treasure":
      grantRandomPower(state, playerId);
      return;
    case "surprise": {
      const event = randomInt(0, 3);
      if (event === 0) {
        addLog(state, "Surpresa boa: avance 2 casas.", "positive", { kind: "surprisePositive", playerId, amount: 2, spaceType: "surprise" });
        moveBy(state, playerId, 2, movement);
        if (!finishIfNeeded(state, playerId)) resolveSpace(state, playerId, movement, chainDepth + 1);
      } else if (event === 1) {
        if (!consumeShield(state, playerId, "a surpresa negativa")) {
          addLog(state, "Surpresa ruim: recue 2 casas.", "negative", { kind: "surpriseNegative", playerId, amount: 2, spaceType: "surprise" });
          moveBy(state, playerId, -2, movement);
        }
      } else if (event === 2) {
        addLog(state, "Surpresa: turno extra!", "positive", { kind: "extraTurn", playerId, spaceType: "surprise" });
        state.phaseReadyAt = -1; // marcador consumido ao encerrar o turno
      } else {
        grantRandomPower(state, playerId);
      }
      return;
    }
  }
}

function presentationDelay(movement: BoardRaceMoveState, hadEffect: boolean): number {
  return DICE_REVEAL_MS
    + movement.path.length * MOVE_STEP_MS
    + (hadEffect ? SPECIAL_LANDING_FEEDBACK_MS : NORMAL_LANDING_FEEDBACK_MS);
}

function endTurn(state: BoardRaceState, extraTurn = false, delayMs = TURN_TRANSITION_MS) {
  if (state.phase === "finished") return;
  const currentIndex = state.playerOrder.indexOf(state.currentPlayerId);
  if (!extraTurn) state.currentPlayerId = state.playerOrder[(currentIndex + 1) % state.playerOrder.length];
  state.turnNumber += 1;
  state.phase = "turnStart";
  state.phaseReadyAt = Date.now() + delayMs;
}

function beginTurn(state: BoardRaceState) {
  const player = state.players[state.currentPlayerId];
  if (!player) return;
  player.rollBonus = 0;
  if (player.skipNextTurn) {
    player.skipNextTurn = false;
    addLog(state, state.currentPlayerId === BOT_ID ? "O BOT perdeu a jogada por estar preso." : "Você perdeu a jogada por estar na prisão.", "negative", { kind: "lostTurn", playerId: state.currentPlayerId });
    state.lastMove = null;
    endTurn(state);
    return;
  }
  if (player.pendingQuiz) {
    state.phase = "awaitingQuiz";
    if (state.currentPlayerId === BOT_ID) state.phaseReadyAt = Date.now() + BOT_THINK_MS;
    return;
  }
  state.phase = "awaitingRoll";
  if (state.currentPlayerId === BOT_ID) state.phaseReadyAt = Date.now() + BOT_THINK_MS;
}

function rollTurn(state: BoardRaceState, playerId: string): BoardRaceState {
  if (state.phase !== "awaitingRoll" || state.currentPlayerId !== playerId) return state;
  const next = structuredClone(state);
  const player = next.players[playerId];
  let penalty = player.pendingRollPenalty;
  if (penalty > 0 && consumeShield(next, playerId, "a penalidade de movimento")) penalty = 0;
  const value = randomInt(1, 6);
  const total = Math.max(1, value + player.rollBonus - penalty);
  player.rollBonus = 0;
  player.pendingRollPenalty = 0;
  next.dice = { value, total, rolledBy: playerId, serial: next.dice.serial + 1 };
  const movement: BoardRaceMoveState = {
    serial: (next.lastMove?.serial ?? 0) + 1,
    playerId,
    from: player.position,
    to: player.position,
    path: [],
    cause: "dice",
    effectEventId: null,
  };
  const eventSerialBeforeLanding = next.eventSerial;
  moveBy(next, playerId, total, movement);
  if (!finishIfNeeded(next, playerId)) resolveSpace(next, playerId, movement);
  const hadSpecialEffect = next.eventSerial > eventSerialBeforeLanding;
  if (!hadSpecialEffect && next.phase !== "finished") {
    addLog(next, "Casa normal: caminho livre.", "neutral", { kind: "landNormal", playerId, spaceType: "normal" });
  }
  movement.effectEventId = next.eventSerial > eventSerialBeforeLanding ? next.eventSerial : null;
  next.lastMove = movement;
  const pacingMs = presentationDelay(movement, hadSpecialEffect);
  if (next.phase === "finished") {
    next.phaseReadyAt = Date.now() + pacingMs;
    return next;
  }
  if (next.phase === "minigame") {
    next.phase = "moving";
    next.phaseReadyAt = Date.now() + pacingMs;
    if (next.pendingMinigame) {
      const delayedBy = pacingMs + BOARD_RACE_MINIGAME_COUNTDOWN_MS;
      next.pendingMinigame.readyAt = next.phaseReadyAt + BOARD_RACE_MINIGAME_COUNTDOWN_MS;
      next.pendingMinigame.startedAt = next.pendingMinigame.readyAt;
      next.pendingMinigame.expiresAt += delayedBy;
      next.pendingMinigame.state = delayEmbeddedMinigameStart(next.pendingMinigame.kind, next.pendingMinigame.state, delayedBy);
      if (next.pendingMinigame.botNextActionAt !== null) next.pendingMinigame.botNextActionAt += delayedBy;
    }
    return next;
  }
  const extraTurn = next.phaseReadyAt === -1;
  endTurn(next, extraTurn, pacingMs);
  return next;
}

function answerQuiz(state: BoardRaceState, playerId: string, optionIndex: number): BoardRaceState {
  if (state.phase !== "awaitingQuiz" || state.currentPlayerId !== playerId) return state;
  const pending = state.players[playerId]?.pendingQuiz;
  if (!pending || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) return state;
  const next = structuredClone(state);
  const correct = optionIndex === pending.correctIndex;
  next.players[playerId].pendingQuiz = null;
  addLog(next, correct ? "Quiz correto: o dado foi liberado." : "Quiz incorreto: a jogada foi perdida.", correct ? "positive" : "negative", { kind: correct ? "quizCorrect" : "quizWrong", playerId });
  if (correct) {
    next.phase = "awaitingRoll";
    if (playerId === BOT_ID) next.phaseReadyAt = Date.now() + BOT_THINK_MS;
  } else {
    next.lastMove = null;
    endTurn(next);
  }
  return next;
}

function removePower(player: BoardRacePlayerState, powerId: BoardRacePowerId) {
  const index = player.powers.indexOf(powerId);
  if (index >= 0) player.powers.splice(index, 1);
}

function usePower(state: BoardRaceState, playerId: string, powerId: BoardRacePowerId, targetPlayerId?: string): BoardRaceState {
  if (state.phase !== "awaitingRoll" || state.currentPlayerId !== playerId) return state;
  const player = state.players[playerId];
  if (!BOARD_RACE_POWER_IDS.includes(powerId) || !player?.powers.includes(powerId)) return state;
  const next = structuredClone(state);
  const nextPlayer = next.players[playerId];
  if (powerId === "boost") {
    nextPlayer.rollBonus += 2;
    removePower(nextPlayer, powerId);
    addLog(next, "Impulso ativado: +2 no movimento.", "positive", { kind: "powerUsed", playerId, powerId });
    return next;
  }
  if (powerId === "shield") {
    nextPlayer.shieldActive = true;
    removePower(nextPlayer, powerId);
    addLog(next, "Escudo ativado para o próximo efeito negativo.", "positive", { kind: "powerUsed", playerId, powerId });
    return next;
  }
  const opponentId = targetPlayerId && targetPlayerId !== playerId && next.players[targetPlayerId]
    ? targetPlayerId
    : otherPlayerId(next, playerId);
  if (!opponentId) return state;
  removePower(nextPlayer, powerId);
  if (!consumeShield(next, opponentId, "a armadilha")) {
    next.players[opponentId].pendingRollPenalty = Math.max(next.players[opponentId].pendingRollPenalty, 2);
    addLog(next, "Armadilha lançada: -2 no próximo movimento adversário.", "negative", { kind: "powerUsed", playerId, powerId });
  }
  return next;
}

function resolveMinigame(state: BoardRaceState): BoardRaceState {
  if (!state.pendingMinigame) return state;
  const next = structuredClone(state);
  const challenge = next.pendingMinigame!;
  const winners = embeddedMinigameWinnerIds(challenge.kind, challenge.state);
  const challengerWon = winners.includes(challenge.challengerId);
  addLog(next, challengerWon ? "Minijogo vencido: turno extra conquistado!" : "Minijogo encerrado sem turno extra.", challengerWon ? "positive" : "neutral", { kind: challengerWon ? "minigameWin" : "minigameLoss", playerId: challenge.challengerId });
  next.pendingMinigame = null;
  next.lastMove = null;
  endTurn(next, challengerWon);
  return next;
}

function tick(state: BoardRaceState): BoardRaceState {
  if (state.phase === "finished") return state;
  const now = Date.now();
  let next = structuredClone(state);

  if (next.phase === "moving" && now >= next.phaseReadyAt && next.pendingMinigame) {
    next.phase = "minigame";
  }

  if (next.phase === "turnStart" && now >= next.phaseReadyAt) beginTurn(next);

  if (next.phase === "minigame" && next.pendingMinigame) {
    const challenge = next.pendingMinigame;
    if (now < challenge.readyAt) return next;
    const ticked = tickEmbeddedMinigame(challenge.kind, challenge.state, now, challenge.botNextActionAt);
    challenge.state = ticked.state;
    challenge.botNextActionAt = ticked.botNextActionAt;
    if (isEmbeddedMinigameFinished(challenge.kind, challenge.state) || now >= challenge.expiresAt) {
      return resolveMinigame(next);
    }
    return next;
  }

  if (next.currentPlayerId === BOT_ID && next.phase === "awaitingQuiz" && now >= next.phaseReadyAt) {
    const quiz = next.players[BOT_ID].pendingQuiz;
    if (quiz) {
      const answer = Math.random() < 0.72 ? quiz.correctIndex : (quiz.correctIndex + randomInt(1, 3)) % 4;
      return answerQuiz(next, BOT_ID, answer);
    }
  }

  if (next.currentPlayerId === BOT_ID && next.phase === "awaitingRoll" && now >= next.phaseReadyAt) {
    const bot = next.players[BOT_ID];
    const power = bot.powers[0];
    if (power) next = usePower(next, BOT_ID, power, otherPlayerId(next, BOT_ID) ?? undefined);
    return rollTurn(next, BOT_ID);
  }

  return next;
}

export function getBoardRaceStateForPlayer(state: BoardRaceState, playerId: string): BoardRaceState {
  const clone = structuredClone(state);
  for (const [id, player] of Object.entries(clone.players)) {
    if (id !== playerId && player.pendingQuiz) {
      const { correctIndex: _correctIndex, explanation: _explanation, ...publicQuiz } = player.pendingQuiz;
      player.pendingQuiz = publicQuiz as typeof player.pendingQuiz;
    } else if (id === playerId && player.pendingQuiz) {
      const { correctIndex: _correctIndex, explanation: _explanation, ...publicQuiz } = player.pendingQuiz;
      player.pendingQuiz = publicQuiz as typeof player.pendingQuiz;
    }
  }
  if (clone.pendingMinigame) {
    clone.pendingMinigame.state = maskEmbeddedMinigameState(clone.pendingMinigame.kind, clone.pendingMinigame.state, playerId);
  }
  return clone;
}

export class BoardRaceGame implements GameEngine<BoardRaceState, BoardRaceAction> {
  readonly id = "boardrace" as const;

  createInitialState(options?: Record<string, unknown>): BoardRaceState {
    const mode = isValidMode(options?.mode) ? options.mode : "solo";
    const humans = Array.isArray(options?.playerIds)
      ? options.playerIds.filter((id): id is string => typeof id === "string" && id.length > 0).slice(0, mode === "duel" ? 2 : 1)
      : [];
    const playerOrder = mode === "solo" ? [humans[0] ?? "PLAYER", BOT_ID] : humans;
    const safeOrder = playerOrder.length >= 2 ? playerOrder : [playerOrder[0] ?? "PLAYER", "OPPONENT"];
    const players = Object.fromEntries(safeOrder.map((id) => [id, blankPlayer()]));
    const spaces = cloneBoardRaceSpaces();
    const now = Date.now();
    return {
      mode,
      boardVersion: 1,
      spaces,
      lastPosition: spaces.length - 1,
      playerOrder: safeOrder,
      currentPlayerId: safeOrder[0],
      players,
      phase: "turnStart",
      phaseReadyAt: now,
      dice: { value: null, total: null, rolledBy: null, serial: 0 },
      lastMove: null,
      pendingMinigame: null,
      winnerId: null,
      startedAt: now,
      finishedAt: null,
      turnNumber: 1,
      eventSerial: 0,
      eventLog: [],
    };
  }

  applyAction(state: BoardRaceState, action: BoardRaceAction, playerId: string): BoardRaceState {
    if (!action || typeof action !== "object" || state.phase === "finished") return state;
    if (action.type === "tick" && playerId === "system") return tick(state);
    if (action.type === "roll") return rollTurn(state, playerId);
    if (action.type === "answerQuiz") return answerQuiz(state, playerId, action.optionIndex);
    if (action.type === "usePower") return usePower(state, playerId, action.powerId, action.targetPlayerId);
    if (action.type === "minigameAction" && state.phase === "minigame" && state.pendingMinigame) {
      if (!state.pendingMinigame.playerIds.includes(playerId) || playerId === BOT_ID) return state;
      if (Date.now() < state.pendingMinigame.readyAt) return state;
      const next = structuredClone(state);
      next.pendingMinigame!.state = applyEmbeddedMinigameAction(
        next.pendingMinigame!.kind,
        next.pendingMinigame!.state,
        action.action,
        playerId
      );
      if (isEmbeddedMinigameFinished(next.pendingMinigame!.kind, next.pendingMinigame!.state)) return resolveMinigame(next);
      return next;
    }
    return state;
  }

  isSolved(state: BoardRaceState): boolean {
    return state.phase === "finished" && state.winnerId !== null;
  }

  reset(state: BoardRaceState): BoardRaceState {
    return this.createInitialState({
      mode: state.mode,
      playerIds: state.mode === "solo" ? state.playerOrder.filter((id) => id !== BOT_ID) : state.playerOrder,
    });
  }
}

export type { BoardRaceMinigameKind };
