import { QuizQuestion } from "../quiz/questions/types";

export type BoardRaceMode = "solo" | "duel";
export type BoardSpaceType =
  | "start"
  | "normal"
  | "advance"
  | "retreat"
  | "prison"
  | "quiz"
  | "minigame"
  | "surprise"
  | "treasure"
  | "finish";

export type BoardRacePowerId = "boost" | "snare" | "shield";
export type BoardRacePowerCategory = "movement" | "attack" | "defense";
export type BoardRaceMinigameKind = "rpg" | "termo" | "memory" | "crossword" | "wordsearch";
export type BoardRacePhase = "turnStart" | "moving" | "awaitingQuiz" | "awaitingRoll" | "minigame" | "finished";

export interface BoardSpace {
  index: number;
  type: BoardSpaceType;
  label: string;
}

export interface BoardRacePendingQuiz extends QuizQuestion {
  assignedAt: number;
}

export interface BoardRacePlayerState {
  position: number;
  /** Casa de evento alcançada por movimento forçado; é resolvida no próximo turno. */
  pendingSpaceIndex: number | null;
  skipNextTurn: boolean;
  powers: BoardRacePowerId[];
  shieldActive: boolean;
  rollBonus: number;
  pendingRollPenalty: number;
  pendingQuiz: BoardRacePendingQuiz | null;
}

export interface BoardRaceDiceState {
  value: number | null;
  total: number | null;
  rolledBy: string | null;
  serial: number;
}

export interface BoardRaceMoveState {
  serial: number;
  playerId: string;
  from: number;
  to: number;
  path: number[];
  pauseAfterSteps?: number[];
  cause: "dice" | "advance" | "retreat" | "surprise";
  effectEventId?: number | null;
  /** Janela autoritativa reservada para o feedback após este trajeto. */
  feedbackMs?: number;
}

export interface BoardRaceMinigameState {
  kind: BoardRaceMinigameKind;
  title: string;
  challengerId: string;
  playerIds: string[];
  state: unknown;
  startedAt: number;
  /** Instante autoritativo em que os dois clientes podem começar a jogar. */
  readyAt: number;
  expiresAt: number;
  botNextActionAt: number | null;
}

export type BoardRaceEventKind =
  | "landNormal"
  | "advance"
  | "retreat"
  | "prison"
  | "quizPending"
  | "quizCorrect"
  | "quizWrong"
  | "minigameStart"
  | "minigameWin"
  | "minigameLoss"
  | "surprisePositive"
  | "surpriseNegative"
  | "extraTurn"
  | "powerGranted"
  | "powerUsed"
  | "shieldBlocked"
  | "lostTurn"
  | "finish";

export interface BoardRaceLogEntry {
  id: number;
  message: string;
  tone: "neutral" | "positive" | "negative";
  kind?: BoardRaceEventKind;
  playerId?: string;
  targetPlayerId?: string;
  powerId?: BoardRacePowerId;
  spaceType?: BoardSpaceType;
  /** Casa especial alcançada por um avanço/recuo, anunciada no mesmo aviso. */
  destinationSpaceType?: BoardSpaceType;
  amount?: number;
}

export interface BoardRaceState {
  mode: BoardRaceMode;
  boardVersion: number;
  spaces: BoardSpace[];
  lastPosition: number;
  playerOrder: string[];
  currentPlayerId: string;
  players: Record<string, BoardRacePlayerState>;
  phase: BoardRacePhase;
  phaseReadyAt: number;
  dice: BoardRaceDiceState;
  lastMove: BoardRaceMoveState | null;
  pendingMinigame: BoardRaceMinigameState | null;
  winnerId: string | null;
  startedAt: number;
  finishedAt: number | null;
  turnNumber: number;
  eventSerial: number;
  eventLog: BoardRaceLogEntry[];
}

export type BoardRaceAction =
  | { type: "tick" }
  | { type: "roll" }
  | { type: "answerQuiz"; optionIndex: number }
  | { type: "usePower"; powerId: BoardRacePowerId; targetPlayerId?: string }
  | { type: "minigameAction"; action: unknown };
