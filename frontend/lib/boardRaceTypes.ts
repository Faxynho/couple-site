export type BoardRaceMode = "solo" | "duel";
export type BoardRacePawnColor = "blue" | "pink";
export type BoardSpaceType = "start" | "normal" | "advance" | "retreat" | "prison" | "quiz" | "minigame" | "surprise" | "treasure" | "anagram" | "riddle" | "safe" | "finish";
export type BoardRacePowerId = "boost" | "snare" | "shield" | "swap" | "magnet";
export type BoardRaceMinigameKind = "rpg" | "termo" | "memory" | "crossword" | "wordsearch";
export type BoardRacePhase = "turnStart" | "moving" | "awaitingQuiz" | "awaitingWord" | "awaitingSafe" | "awaitingRoll" | "minigame" | "finished";
export type BoardRaceEventKind = "landNormal" | "advance" | "retreat" | "prison" | "quizPending" | "quizCorrect" | "quizWrong" | "wordPending" | "wordCorrect" | "wordWrong" | "safePending" | "safeResult" | "minigameStart" | "minigameWin" | "minigameLoss" | "surprisePositive" | "surpriseNegative" | "extraTurn" | "powerGranted" | "powerUsed" | "shieldBlocked" | "lostTurn" | "finish";

export interface BoardSpace {
  index: number;
  type: BoardSpaceType;
  label: string;
}

export interface BoardRacePendingQuiz {
  id: string;
  category: string;
  difficulty: "medium";
  question: string;
  options: [string, string, string, string];
  assignedAt: number;
}

export interface BoardRacePlayerState {
  position: number;
  pendingSpaceIndex: number | null;
  skipNextTurn: boolean;
  powers: BoardRacePowerId[];
  shieldActive: boolean;
  rollBonus: number;
  pendingRollPenalty: number;
  pendingQuiz: BoardRacePendingQuiz | null;
  pendingWordChallenge: { id: string; kind: "anagram" | "riddle"; prompt: string; assignedAt: number; attempts: number } | null;
  pendingSafe: { id: string; assignedAt: number; options: ("power" | "advance" | "penalty" | "empty")[] } | null;
}

export interface BoardRaceState {
  mode: BoardRaceMode;
  boardVersion: number;
  spaces: BoardSpace[];
  lastPosition: number;
  playerOrder: string[];
  pawnColors: Record<string, BoardRacePawnColor>;
  currentPlayerId: string;
  players: Record<string, BoardRacePlayerState>;
  phase: BoardRacePhase;
  phaseReadyAt: number;
  dice: { value: number | null; total: number | null; rolledBy: string | null; serial: number };
  lastMove: { serial: number; playerId: string; from: number; to: number; path: number[]; pauseAfterSteps?: number[]; cause: string; effectEventId?: number | null; feedbackMs?: number } | null;
  pendingMinigame: {
    kind: BoardRaceMinigameKind;
    title: string;
    challengerId: string;
    playerIds: string[];
    state: unknown;
    startedAt: number;
    readyAt: number;
    expiresAt: number;
    botNextActionAt: number | null;
  } | null;
  winnerId: string | null;
  startedAt: number;
  finishedAt: number | null;
  turnNumber: number;
  eventSerial: number;
  eventLog: {
    id: number;
    message: string;
    tone: "neutral" | "positive" | "negative";
    kind?: BoardRaceEventKind;
    playerId?: string;
    targetPlayerId?: string;
    powerId?: BoardRacePowerId;
    spaceType?: BoardSpaceType;
    destinationSpaceType?: BoardSpaceType;
    amount?: number;
    challengeKind?: "anagram" | "riddle";
    answer?: string;
    gaveUp?: boolean;
  }[];
}

export const BOARD_RACE_POWER_INFO: Record<BoardRacePowerId, { name: string; emoji: string; category: string; description: string }> = {
  boost: { name: "Impulso +2", emoji: "🚀", category: "Movimentação", description: "Soma 2 ao seu próximo movimento." },
  snare: { name: "Armadilha -2", emoji: "🕸️", category: "Ataque", description: "Reduz o próximo movimento adversário." },
  shield: { name: "Escudo", emoji: "🛡️", category: "Defesa", description: "Cancela o próximo efeito negativo, exceto desafios." },
  swap: { name: "Troca de Lugar", emoji: "🔄", category: "Ataque", description: "Troca sua posição com a do adversário, sem ativar casas." },
  magnet: { name: "Ímã", emoji: "🧲", category: "Ataque", description: "Puxa o adversário 2 casas para trás; o Escudo bloqueia." },
};

export const BOARD_SPACE_INFO: Record<BoardSpaceType, { emoji: string; short: string; className: string }> = {
  start: { emoji: "🏁", short: "Início", className: "border-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/25" },
  normal: { emoji: "", short: "Normal", className: "border-surface/80 bg-surface/65" },
  advance: { emoji: "⬆️", short: "Avançar", className: "border-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/25" },
  retreat: { emoji: "⬇️", short: "Recuar", className: "border-orange-300 bg-orange-100/70 dark:bg-orange-900/25" },
  prison: { emoji: "🔒", short: "Prisão", className: "border-slate-400 bg-slate-200/70 dark:bg-slate-800/50" },
  quiz: { emoji: "❓", short: "Quiz", className: "border-sky-300 bg-sky-100/70 dark:bg-sky-900/25" },
  minigame: { emoji: "🎮", short: "Minijogo", className: "border-violet-300 bg-violet-100/70 dark:bg-violet-900/25" },
  surprise: { emoji: "✨", short: "Surpresa", className: "border-fuchsia-300 bg-fuchsia-100/70 dark:bg-fuchsia-900/25" },
  treasure: { emoji: "🎁", short: "Tesouro", className: "border-amber-300 bg-amber-100/70 dark:bg-amber-900/25" },
  anagram: { emoji: "ABC", short: "Anagrama", className: "border-cyan-300 bg-cyan-100/70 dark:bg-cyan-900/25" },
  riddle: { emoji: "💡", short: "Enigma", className: "border-indigo-300 bg-indigo-100/70 dark:bg-indigo-900/25" },
  safe: { emoji: "🧰", short: "Cofre", className: "border-yellow-300 bg-yellow-100/70 dark:bg-yellow-900/25" },
  finish: { emoji: "🏆", short: "Chegada", className: "border-yellow-400 bg-yellow-100/80 dark:bg-yellow-900/30" },
};
