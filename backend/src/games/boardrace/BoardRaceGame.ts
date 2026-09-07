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
import { createWordChallenge, normalizeWordAnswer } from "./wordChallenges";
import {
  BoardRaceAction,
  BoardRaceLogEntry,
  BoardRaceMinigameKind,
  BoardRaceMoveState,
  BoardRacePawnColor,
  BoardRacePlayerState,
  BoardRacePowerId,
  BoardSpaceType,
  BoardRaceState,
} from "./types";

const BOT_ID = "BOT";
const TURN_TRANSITION_MS = 1_600;
const DICE_REVEAL_MS = 650;
const MOVE_STEP_MS = 420;
const FORCED_MOVE_PAUSE_MS = 650;
const NORMAL_LANDING_FEEDBACK_MS = 750;
// O painel visual usa 2,75 s e ainda recebe uma folga para a saída da animação.
// Esta janela é a autoridade que impede um Quiz/Minijogo de abrir sobre o aviso.
const SPECIAL_LANDING_FEEDBACK_MS = 3_200;
const BOT_THINK_MS = 900;
export const BOARD_RACE_MINIGAME_COUNTDOWN_MS = 4_000;

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function blankPlayer(): BoardRacePlayerState {
  return {
    position: 0,
    pendingSpaceIndex: null,
    skipNextTurn: false,
    powers: [],
    shieldActive: false,
    rollBonus: 0,
    pendingRollPenalty: 0,
    pendingQuiz: null,
    pendingWordChallenge: null,
    pendingSafe: null,
  };
}

function isValidMode(value: unknown): value is "solo" | "duel" {
  return value === "solo" || value === "duel";
}

function isPawnColor(value: unknown): value is BoardRacePawnColor {
  return value === "blue" || value === "pink";
}

function oppositePawnColor(color: BoardRacePawnColor): BoardRacePawnColor {
  return color === "blue" ? "pink" : "blue";
}

/** A cor solicitada pelo primeiro jogador define automaticamente a outra peça.
 * Assim, inclusive com dados antigos ou payloads inválidos, nunca há duas peças
 * iguais em uma partida de dois jogadores. */
function createPawnColors(playerOrder: string[], requested: unknown): Record<string, BoardRacePawnColor> {
  const requestedColors = requested && typeof requested === "object"
    ? requested as Record<string, unknown>
    : {};
  const firstId = playerOrder[0];
  const firstColor = firstId && isPawnColor(requestedColors[firstId]) ? requestedColors[firstId] : "pink";
  return Object.fromEntries(playerOrder.map((playerId, index) => [
    playerId,
    index === 0 ? firstColor : oppositePawnColor(firstColor),
  ]));
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

function pauseBeforeForcedMove(movement: BoardRaceMoveState) {
  if (movement.path.length > 0) movement.pauseAfterSteps = [...(movement.pauseAfterSteps ?? []), movement.path.length];
}

function deferForcedDestination(state: BoardRaceState, playerId: string): BoardSpaceType | null {
  const player = state.players[playerId];
  const destination = state.spaces[player.position];
  if (!destination || !["prison", "quiz", "minigame", "treasure", "anagram", "riddle", "safe"].includes(destination.type)) return null;
  player.pendingSpaceIndex = destination.index;
  return destination.type;
}

function consumeShield(state: BoardRaceState, playerId: string, effectName: string): boolean {
  const player = state.players[playerId];
  if (!player.shieldActive) return false;
  player.shieldActive = false;
  addLog(state, `O escudo bloqueou ${effectName}.`, "positive", { kind: "shieldBlocked", playerId });
  return true;
}

function grantRandomPower(state: BoardRaceState, playerId: string, announce = true): BoardRacePowerId | null {
  const player = state.players[playerId];
  if (player.powers.length >= BOARD_RACE_MAX_POWERS) {
    addLog(state, "O inventário já está cheio (máximo de 2 poderes).", "neutral");
    return null;
  }
  const powerId = BOARD_RACE_POWER_IDS[randomInt(0, BOARD_RACE_POWER_IDS.length - 1)];
  player.powers.push(powerId);
  if (announce) addLog(state, `Tesouro encontrado: poder ${powerId}.`, "positive", { kind: "powerGranted", playerId, powerId });
  return powerId;
}

function startMinigame(state: BoardRaceState, playerId: string, announce = true) {
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
  if (announce) addLog(state, `Desafio iniciado: ${BOARD_RACE_MINIGAME_TITLES[kind]}.`, "neutral", { kind: "minigameStart", playerId, spaceType: "minigame" });
}

function resolveSpace(
  state: BoardRaceState,
  playerId: string,
  movement: BoardRaceMoveState,
  silentArrivalAnnouncement = false
) {
  const player = state.players[playerId];
  let forcedArrival = false;
  let lastMovementEventId: number | null = null;
  const maxImmediateEffects = 8;

  for (let chainStep = 0; chainStep < maxImmediateEffects; chainStep += 1) {
    if (state.phase === "finished") return;
    const space = state.spaces[player.position];
    if (!space) return;

    // Só eventos interativos são adiados. Casas que movem continuam a cadeia.
    if (forcedArrival) {
      const destinationSpaceType = deferForcedDestination(state, playerId);
      if (destinationSpaceType) {
        const event = state.eventLog.find((entry) => entry.id === lastMovementEventId);
        if (event) event.destinationSpaceType = destinationSpaceType;
        return;
      }
    }

    switch (space.type) {
      case "normal":
      case "start":
      case "finish":
        return;
      case "advance": {
        const amount = randomInt(1, 3);
        addLog(state, `Casa Avançar: +${amount} casas.`, "positive", { kind: "advance", playerId, amount, spaceType: "advance" });
        lastMovementEventId = state.eventSerial;
        pauseBeforeForcedMove(movement);
        moveBy(state, playerId, amount, movement);
        if (finishIfNeeded(state, playerId)) return;
        forcedArrival = true;
        continue;
      }
      case "retreat": {
        if (consumeShield(state, playerId, "o recuo")) return;
        const amount = randomInt(1, 3);
        addLog(state, `Casa Recuar: -${amount} casas.`, "negative", { kind: "retreat", playerId, amount, spaceType: "retreat" });
        lastMovementEventId = state.eventSerial;
        pauseBeforeForcedMove(movement);
        moveBy(state, playerId, -amount, movement);
        forcedArrival = true;
        continue;
      }
      case "prison":
        if (!consumeShield(state, playerId, "a prisão")) {
          player.skipNextTurn = true;
          if (!silentArrivalAnnouncement) addLog(state, "Prisão: a próxima jogada será perdida.", "negative", { kind: "prison", playerId, spaceType: "prison" });
        }
        return;
      case "quiz": {
        const question = selectQuizQuestions("medium", 1)[0];
        if (question) player.pendingQuiz = { ...question, assignedAt: Date.now() };
        if (!silentArrivalAnnouncement) addLog(state, "Quiz pendente para o próximo turno.", "neutral", { kind: "quizPending", playerId, spaceType: "quiz" });
        return;
      }
      case "anagram":
      case "riddle": {
        player.pendingWordChallenge = createWordChallenge(space.type);
        if (!silentArrivalAnnouncement) addLog(
          state,
          `${space.type === "anagram" ? "Anagrama" : "Enigma"} pendente para o próximo turno.`,
          "neutral",
          { kind: "wordPending", playerId, spaceType: space.type, challengeKind: space.type }
        );
        return;
      }
      case "safe": {
        // A ordem é embaralhada no servidor e persiste no estado da partida.
        const options: ("power" | "advance" | "penalty" | "empty")[] = ["power", "advance", "empty", "penalty"];
        for (let index = options.length - 1; index > 0; index -= 1) {
          const swapIndex = randomInt(0, index);
          [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
        }
        player.pendingSafe = { id: `safe-${Date.now()}-${playerId}`, assignedAt: Date.now(), options };
        if (!silentArrivalAnnouncement) addLog(state, "Cofre pendente para o próximo turno.", "neutral", { kind: "safePending", playerId, spaceType: "safe" });
        return;
      }
      case "minigame":
        startMinigame(state, playerId, !silentArrivalAnnouncement);
        return;
      case "treasure":
        grantRandomPower(state, playerId);
        return;
      case "surprise": {
        const event = randomInt(0, 3);
        if (event === 0 || event === 1) {
          const amount = event === 0 ? 2 : -2;
          const kind = event === 0 ? "surprisePositive" : "surpriseNegative";
          const message = event === 0 ? "Surpresa: avance 2 casas." : "Surpresa: recue 2 casas.";
          if (event === 1 && consumeShield(state, playerId, "a surpresa negativa")) return;
          addLog(state, message, event === 0 ? "positive" : "negative", { kind, playerId, amount: 2, spaceType: "surprise" });
          lastMovementEventId = state.eventSerial;
          pauseBeforeForcedMove(movement);
          moveBy(state, playerId, amount, movement);
          if (finishIfNeeded(state, playerId)) return;
          forcedArrival = true;
          continue;
        }
        if (event === 2) {
          addLog(state, "Surpresa: turno extra!", "positive", { kind: "extraTurn", playerId, spaceType: "surprise" });
          state.phaseReadyAt = -1;
        } else grantRandomPower(state, playerId);
        return;
      }
    }
  }

  // Proteção de segurança: nenhuma cadeia de casas pode prender a partida.
  addLog(state, "A cadeia de movimentos terminou por segurança.", "neutral", { playerId });
}

function presentationDelay(movement: BoardRaceMoveState, hadEffect: boolean): number {
  return DICE_REVEAL_MS
    + movement.path.length * MOVE_STEP_MS
    + (movement.pauseAfterSteps?.length ?? 0) * FORCED_MOVE_PAUSE_MS
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
  const pendingSpaceIndex = player.pendingSpaceIndex;
  if (typeof pendingSpaceIndex === "number" && Number.isInteger(pendingSpaceIndex) && state.spaces[pendingSpaceIndex]?.index === pendingSpaceIndex) {
    // Limpa antes de resolver: se o efeito mover de novo, somente o novo destino fica pendente.
    player.pendingSpaceIndex = null;
    const movement: BoardRaceMoveState = {
      serial: (state.lastMove?.serial ?? 0) + 1,
      playerId: state.currentPlayerId,
      from: player.position,
      to: player.position,
      path: [],
      cause: state.spaces[pendingSpaceIndex].type === "retreat" ? "retreat" : state.spaces[pendingSpaceIndex].type === "surprise" ? "surprise" : "advance",
      effectEventId: null,
    };
    const eventSerialBefore = state.eventSerial;
    resolveSpace(state, state.currentPlayerId, movement, true);
    movement.effectEventId = state.eventSerial > eventSerialBefore ? state.eventSerial : null;

    if (state.phase === "finished") {
      state.lastMove = movement;
      movement.feedbackMs = SPECIAL_LANDING_FEEDBACK_MS;
      state.phaseReadyAt = Date.now() + presentationDelay(movement, true);
      return;
    }
    if (state.phase === "minigame") {
      state.lastMove = movement.path.length > 0 ? movement : null;
      movement.feedbackMs = SPECIAL_LANDING_FEEDBACK_MS;
      const presentationMs = movement.path.length > 0 ? presentationDelay(movement, true) : 0;
      state.phase = movement.path.length > 0 ? "moving" : "minigame";
      state.phaseReadyAt = Date.now() + presentationMs;
      if (state.pendingMinigame) {
        const delayedBy = presentationMs + BOARD_RACE_MINIGAME_COUNTDOWN_MS;
        state.pendingMinigame.readyAt = state.phaseReadyAt + BOARD_RACE_MINIGAME_COUNTDOWN_MS;
        state.pendingMinigame.startedAt = state.pendingMinigame.readyAt;
        state.pendingMinigame.expiresAt += delayedBy;
        state.pendingMinigame.state = delayEmbeddedMinigameStart(state.pendingMinigame.kind, state.pendingMinigame.state, delayedBy);
        if (state.pendingMinigame.botNextActionAt !== null) state.pendingMinigame.botNextActionAt += delayedBy;
      }
      return;
    }
    if (player.pendingWordChallenge) {
      state.lastMove = movement.path.length > 0 ? movement : null;
      state.phase = "awaitingWord";
      state.phaseReadyAt = Date.now() + (movement.path.length > 0 ? presentationDelay(movement, true) : 0);
      if (state.currentPlayerId === BOT_ID) state.phaseReadyAt = Math.max(state.phaseReadyAt, Date.now() + BOT_THINK_MS);
      return;
    }
    if (player.pendingSafe) {
      state.lastMove = movement.path.length > 0 ? movement : null;
      state.phase = "awaitingSafe";
      state.phaseReadyAt = Date.now() + (movement.path.length > 0 ? presentationDelay(movement, true) : 0);
      if (state.currentPlayerId === BOT_ID) state.phaseReadyAt = Math.max(state.phaseReadyAt, Date.now() + BOT_THINK_MS);
      return;
    }
    if (player.pendingQuiz) {
      state.lastMove = movement.path.length > 0 ? movement : null;
      state.phase = "awaitingQuiz";
      state.phaseReadyAt = Date.now() + (movement.path.length > 0 ? presentationDelay(movement, true) : 0);
      if (state.currentPlayerId === BOT_ID) state.phaseReadyAt = Math.max(state.phaseReadyAt, Date.now() + BOT_THINK_MS);
      return;
    }
    if (movement.path.length > 0) {
      state.lastMove = movement;
      movement.feedbackMs = SPECIAL_LANDING_FEEDBACK_MS;
      state.phase = "turnStart";
      state.phaseReadyAt = Date.now() + presentationDelay(movement, true);
      return;
    }
    // Tesouro, prisão e demais efeitos sem deslocamento também recebem feedback antes do dado.
    state.lastMove = null;
    state.phase = "turnStart";
    state.phaseReadyAt = Date.now();
    return;
  }
  if (player.pendingWordChallenge) {
    state.phase = "awaitingWord";
    if (state.currentPlayerId === BOT_ID) state.phaseReadyAt = Date.now() + BOT_THINK_MS;
    return;
  }
  if (player.pendingSafe) {
    state.phase = "awaitingSafe";
    if (state.currentPlayerId === BOT_ID) state.phaseReadyAt = Date.now() + BOT_THINK_MS;
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
  movement.feedbackMs = hadSpecialEffect ? SPECIAL_LANDING_FEEDBACK_MS : NORMAL_LANDING_FEEDBACK_MS;
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
  if (state.phase !== "awaitingQuiz" || state.currentPlayerId !== playerId || Date.now() < state.phaseReadyAt) return state;
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
    endTurn(next, false, SPECIAL_LANDING_FEEDBACK_MS);
  }
  return next;
}

function answerWord(state: BoardRaceState, playerId: string, answer: string): BoardRaceState {
  if (state.phase !== "awaitingWord" || state.currentPlayerId !== playerId || Date.now() < state.phaseReadyAt || typeof answer !== "string") return state;
  const pending = state.players[playerId]?.pendingWordChallenge;
  if (!pending) return state;
  const next = structuredClone(state);
  const correct = normalizeWordAnswer(answer) === normalizeWordAnswer(pending.answer);
  // Anagrama é o único desafio de tentativa livre: um erro atualiza o estado
  // compartilhado, mas preserva o pendente e o mesmo turno.
  if (!correct && pending.kind === "anagram") {
    next.players[playerId].pendingWordChallenge!.attempts = (pending.attempts ?? 0) + 1;
    if (playerId === BOT_ID) next.phaseReadyAt = Date.now() + BOT_THINK_MS;
    return next;
  }
  next.players[playerId].pendingWordChallenge = null;
  const label = pending.kind === "anagram" ? "Anagrama" : "Enigma";
  addLog(next, correct ? `${label} correto: o dado foi liberado.` : `${label} incorreto.`, correct ? "positive" : "negative", {
    kind: correct ? "wordCorrect" : "wordWrong", playerId, challengeKind: pending.kind, answer: correct ? undefined : pending.answer,
  });
  if (correct) {
    next.phase = "awaitingRoll";
    if (playerId === BOT_ID) next.phaseReadyAt = Date.now() + BOT_THINK_MS;
  } else {
    next.lastMove = null;
    endTurn(next, false, SPECIAL_LANDING_FEEDBACK_MS);
  }
  return next;
}

function giveUpWord(state: BoardRaceState, playerId: string): BoardRaceState {
  if (state.phase !== "awaitingWord" || state.currentPlayerId !== playerId || Date.now() < state.phaseReadyAt) return state;
  const pending = state.players[playerId]?.pendingWordChallenge;
  // O botão existe somente para o Anagrama; o Enigma mantém a regra de um
  // único palpite e revela a resposta quando ele falha.
  if (!pending || pending.kind !== "anagram") return state;
  const next = structuredClone(state);
  next.players[playerId].pendingWordChallenge = null;
  addLog(next, "Anagrama encerrado por desistência.", "negative", {
    kind: "wordWrong", playerId, challengeKind: "anagram", answer: pending.answer, gaveUp: true,
  });
  next.lastMove = null;
  endTurn(next, false, SPECIAL_LANDING_FEEDBACK_MS);
  return next;
}

function chooseSafe(state: BoardRaceState, playerId: string, optionIndex: number): BoardRaceState {
  if (state.phase !== "awaitingSafe" || state.currentPlayerId !== playerId || Date.now() < state.phaseReadyAt || !Number.isInteger(optionIndex)) return state;
  const pending = state.players[playerId]?.pendingSafe;
  if (!pending || optionIndex < 0 || optionIndex >= pending.options.length) return state;
  const next = structuredClone(state);
  const outcome = pending.options[optionIndex];
  const player = next.players[playerId];
  player.pendingSafe = null;
  if (outcome === "power") {
    const powerId = grantRandomPower(next, playerId, false);
    addLog(next, powerId ? "O cofre guardava um novo poder." : "O cofre tinha um poder, mas seu inventário está cheio.", powerId ? "positive" : "neutral", {
      kind: "safeResult", playerId, powerId: powerId ?? undefined, amount: 0,
    });
  } else if (outcome === "advance") {
    const amount = 2;
    const movement: BoardRaceMoveState = {
      serial: (next.lastMove?.serial ?? 0) + 1,
      playerId,
      from: player.position,
      to: player.position,
      path: [],
      cause: "advance",
      effectEventId: null,
      feedbackMs: SPECIAL_LANDING_FEEDBACK_MS,
    };
    moveBy(next, playerId, amount, movement);
    const destinationSpaceType = deferForcedDestination(next, playerId);
    addLog(next, `O cofre fez você avançar ${amount} casas.`, "positive", { kind: "safeResult", playerId, amount, destinationSpaceType: destinationSpaceType ?? undefined });
    movement.effectEventId = next.eventSerial;
    next.lastMove = movement;
    if (finishIfNeeded(next, playerId)) {
      next.phaseReadyAt = Date.now() + presentationDelay(movement, true);
      return next;
    }
  } else if (outcome === "penalty") {
    player.skipNextTurn = true;
    addLog(next, "O cofre tinha uma pequena trava: você perderá a próxima jogada.", "negative", { kind: "safeResult", playerId });
  } else {
    addLog(next, "O cofre estava vazio, mas a corrida continua.", "neutral", { kind: "safeResult", playerId });
  }
  if (outcome !== "advance") next.lastMove = null;
  endTurn(next, false, outcome === "advance" ? presentationDelay(next.lastMove!, true) : SPECIAL_LANDING_FEEDBACK_MS);
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
  if (powerId === "swap") {
    const ownPosition = nextPlayer.position;
    const opponentPosition = next.players[opponentId].position;
    nextPlayer.position = opponentPosition;
    next.players[opponentId].position = ownPosition;
    next.lastMove = {
      serial: (next.lastMove?.serial ?? 0) + 1,
      playerId,
      from: ownPosition,
      to: opponentPosition,
      path: [opponentPosition],
      cause: "swap",
      effectEventId: null,
      feedbackMs: SPECIAL_LANDING_FEEDBACK_MS,
    };
    next.phase = "moving";
    next.phaseReadyAt = Date.now() + MOVE_STEP_MS + SPECIAL_LANDING_FEEDBACK_MS;
    addLog(next, "Troca de Lugar: as peças trocaram de posição.", "positive", { kind: "powerUsed", playerId, targetPlayerId: opponentId, powerId });
    return next;
  }
  if (powerId === "magnet") {
    if (consumeShield(next, opponentId, "o Ímã")) return next;
    const target = next.players[opponentId];
    const from = target.position;
    const path: number[] = [];
    moveBy(next, opponentId, -2, { serial: 0, playerId: opponentId, from, to: from, path, cause: "magnet" });
    next.lastMove = {
      serial: (next.lastMove?.serial ?? 0) + 1,
      playerId: opponentId,
      from,
      to: target.position,
      path,
      cause: "magnet",
      effectEventId: null,
      feedbackMs: SPECIAL_LANDING_FEEDBACK_MS,
    };
    next.phase = "moving";
    next.phaseReadyAt = Date.now() + path.length * MOVE_STEP_MS + SPECIAL_LANDING_FEEDBACK_MS;
    addLog(next, `Ímã: o adversário recuou ${from - target.position} casas.`, "negative", { kind: "powerUsed", playerId, targetPlayerId: opponentId, powerId, amount: from - target.position });
    return next;
  }
  if (!consumeShield(next, opponentId, "a armadilha")) {
    next.players[opponentId].pendingRollPenalty = Math.max(next.players[opponentId].pendingRollPenalty, 2);
    addLog(next, "Armadilha lançada: -2 no próximo movimento adversário.", "negative", { kind: "powerUsed", playerId, targetPlayerId: opponentId, powerId });
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

  if (next.phase === "moving" && now >= next.phaseReadyAt) {
    next.phase = next.pendingMinigame ? "minigame" : "awaitingRoll";
    if (next.currentPlayerId === BOT_ID) next.phaseReadyAt = now + BOT_THINK_MS;
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

  if (next.currentPlayerId === BOT_ID && next.phase === "awaitingWord" && now >= next.phaseReadyAt) {
    const word = next.players[BOT_ID].pendingWordChallenge;
    if (word) return answerWord(next, BOT_ID, Math.random() < 0.68 ? word.answer : "resposta errada");
  }

  if (next.currentPlayerId === BOT_ID && next.phase === "awaitingSafe" && now >= next.phaseReadyAt) {
    const safe = next.players[BOT_ID].pendingSafe;
    if (safe) return chooseSafe(next, BOT_ID, randomInt(0, safe.options.length - 1));
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
    if (player.pendingWordChallenge) {
      const { answer: _answer, ...publicChallenge } = player.pendingWordChallenge;
      player.pendingWordChallenge = publicChallenge as typeof player.pendingWordChallenge;
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
    const pawnColors = createPawnColors(safeOrder, options?.pawnColors);
    const spaces = cloneBoardRaceSpaces();
    const now = Date.now();
    return {
      mode,
      boardVersion: 1,
      spaces,
      lastPosition: spaces.length - 1,
      playerOrder: safeOrder,
      pawnColors,
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
    if (action.type === "answerWord") return answerWord(state, playerId, action.answer);
    if (action.type === "giveUpWord") return giveUpWord(state, playerId);
    if (action.type === "chooseSafe") return chooseSafe(state, playerId, action.optionIndex);
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
      pawnColors: state.pawnColors,
    });
  }
}

export type { BoardRaceMinigameKind };
