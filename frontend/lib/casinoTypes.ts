export type CasinoLength = "quick" | "normal" | "long";
export type CasinoMode = "duel" | "soloBot";
export type CasinoMiniGame = "mines" | "crash" | "roulette" | "slots" | "race" | "dice" | "hilo" | "fortune" | "plinko" | "briefcase";
export type CasinoPhase = "selecting" | "betting" | "playing" | "roundResult" | "lastChance" | "finished";

export const CASINO_LENGTHS: Record<CasinoLength, { label: string; emoji: string; hint: string; target: number }> = {
  quick: { label: "Rápida", emoji: "⚡", hint: "Meta 2.000", target: 2_000 },
  normal: { label: "Normal", emoji: "🎰", hint: "Meta 5.000", target: 5_000 },
  long: { label: "Longa", emoji: "👑", hint: "Meta 10.000", target: 10_000 },
};

export const CASINO_GAMES: Record<CasinoMiniGame, { label: string; emoji: string; short: string; accent: string }> = {
  mines: { label: "Mines", emoji: "💣", short: "Abra casas, aumente o multiplicador e saque antes da bomba.", accent: "emerald" },
  crash: { label: "Crash", emoji: "📈", short: "O multiplicador sobe até quebrar. Saque antes do estouro.", accent: "cyan" },
  roulette: { label: "Roleta", emoji: "🎡", short: "Uma bolinha, um número e apostas na mesma mesa.", accent: "red" },
  slots: { label: "Jackpot", emoji: "🎰", short: "Grade 3×3: forme linhas, acumule multiplicadores e busque o Jackpot.", accent: "violet" },
  race: { label: "Corrida", emoji: "🏁", short: "Escolha seu corredor, aposte e acompanhe a disputa ao vivo.", accent: "amber" },
  dice: { label: "Dados", emoji: "🎲", short: "Acerte os números verdes, fuja dos vermelhos e monte sua sequência.", accent: "blue" },
  hilo: { label: "Hi-Lo", emoji: "🃏", short: "Maior ou menor? Acerte cartas em sequência e saque na hora certa.", accent: "pink" },
  fortune: { label: "Roda da Fortuna", emoji: "✨", short: "Uma roda compartilhada com multiplicadores e um jackpot raro.", accent: "gold" },
  plinko: { label: "Plinko", emoji: "🔻", short: "Solte a bolinha, acompanhe as colisões e torça pelo multiplicador da borda.", accent: "cyan" },
  briefcase: { label: "Maletas", emoji: "💼", short: "Mesa compartilhada: cada maleta aberta muda as opções do adversário.", accent: "amber" },
};

export interface CasinoPlayerState {
  balance: number;
  vote: CasinoMiniGame | null;
  roundBet: number | null;
  betLocked: boolean;
  roundDelta: number;
  roundStatus: "idle" | "playing" | "won" | "lost" | "cashed" | "waiting";
  lastPayout: number;
  lastMultiplier: number;
  bestMultiplier: number;
  totalWagered: number;
  totalWon: number;
  lastChanceUsed: boolean;
  lastChanceResult: "revived" | "failed" | null;
}

export interface CasinoRoundHistory {
  round: number;
  game: CasinoMiniGame;
  bets: Record<string, number>;
  deltas: Record<string, number>;
  balances: Record<string, number>;
  summary: string;
}

export interface MinesMiniState {
  kind: "mines";
  gridSize: 25;
  mineCount: 5;
  players: Record<string, { mineIndexes: number[]; openedIndexes: number[]; multiplier: number; exploded: boolean; explodedIndex: number | null; done: boolean }>;
}

export interface CrashMiniState {
  kind: "crash";
  startedAt: number;
  multiplier: number;
  crashPoint: number | null;
  crashed: boolean;
  cashouts: Record<string, number | null>;
}

export type RouletteBet =
  | { kind: "red" | "black" | "odd" | "even" | "low" | "high" }
  | { kind: "dozen"; value: 1 | 2 | 3 }
  | { kind: "number"; value: number };
export interface RouletteMiniState {
  kind: "roulette";
  selections: Record<string, RouletteBet | null>;
  spinning: boolean;
  settling: boolean;
  spinStartedAt: number | null;
  spinEndsAt: number | null;
  settleEndsAt: number | null;
  resultNumber: number | null;
  resultColor: "red" | "black" | "green" | null;
}

export type SlotSymbolId = "cherry" | "strawberry" | "plum" | "clover" | "heart-card" | "club-card" | "thunder" | "star" | "diamond";
export interface SlotsMiniState {
  kind: "slots";
  players: Record<string, {
    spinsUsed: number;
    streak: number;
    multiplier: number;
    lastSymbols: SlotSymbolId[];
    lastWinFactor: number | null;
    lastWinningLines: number[];
    lastSpinWon: boolean | null;
    jackpotHit: boolean;
    awaitingDecision: boolean;
    spinning: boolean;
    spinStartedAt: number | null;
    spinEndsAt: number | null;
    pendingSymbols: SlotSymbolId[] | null;
    pendingFactor: number | null;
    revealEndsAt: number | null;
    done: boolean;
  }>;
}

export const SLOT_WIN_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export const PLINKO_MULTIPLIERS = [12, 5, 3, 1.5, 1, 0.5, 0.2, 0.5, 1, 1.5, 3, 5, 12] as const;
export interface PlinkoMiniState {
  kind: "plinko";
  rows: 12;
  multipliers: number[];
  players: Record<string, {
    dropping: boolean;
    dropStartedAt: number | null;
    dropEndsAt: number | null;
    path: number[] | null;
    pendingBucket: number | null;
    bucketIndex: number | null;
    multiplier: number | null;
    revealEndsAt: number | null;
    done: boolean;
  }>;
}

export type BriefcaseValue = number | "lose";
export interface BriefcaseMiniState {
  kind: "briefcase";
  contents: Array<BriefcaseValue | null>;
  openedBy: Array<string | null>;
  startPlayerId: string;
  turnPlayerId: string | null;
  players: Record<string, {
    accumulatedMultiplier: number;
    awaitingDecision: boolean;
    done: boolean;
    cashed: boolean;
    openedCount: number;
    lastOpenedIndex: number | null;
  }>;
  lastOpenedIndex: number | null;
  lastOpenedBy: string | null;
  lastValue: BriefcaseValue | null;
  revealEndsAt: number | null;
}

export type CasinoRacerId = "crown" | "cherry" | "clover" | "star" | "diamond";
export interface CasinoRacer { id: CasinoRacerId; label: string; odds: number; weight: number }
export const CASINO_RACERS: CasinoRacer[] = [
  { id: "crown", label: "Coroa Real", odds: 2.4, weight: 36 },
  { id: "cherry", label: "Cereja Veloz", odds: 3.2, weight: 26 },
  { id: "clover", label: "Trevo da Sorte", odds: 4.2, weight: 18 },
  { id: "star", label: "Estrela Dourada", odds: 5.5, weight: 12 },
  { id: "diamond", label: "Diamante Azul", odds: 8, weight: 8 },
];
export interface RaceMiniState {
  kind: "race";
  picks: Record<string, CasinoRacerId | null>;
  startedAt: number | null;
  progress: Record<CasinoRacerId, number>;
  winner: CasinoRacerId | null;
  durationsMs: null;
}

export interface DiceMiniState {
  kind: "dice";
  players: Record<string, {
    green: number[];
    red: number[];
    dice: [number | null, number | null];
    revealedDiceCount: 0 | 1 | 2;
    rollingDie: 1 | 2 | null;
    rollStartedAt: number | null;
    rollEndsAt: number | null;
    pendingDie: number | null;
    revealEndsAt: number | null;
    sum: number | null;
    outcome: "win" | "loss" | "neutral" | null;
    wins: number;
    multiplier: number;
    awaitingDecision: boolean;
    done: boolean;
  }>;
}

export type CardSuit = "hearts" | "diamonds" | "clubs" | "spades";
export interface HiLoCard { rank: number; suit: CardSuit }
export interface HiLoMiniState {
  kind: "hilo";
  players: Record<string, {
    currentCard: HiLoCard;
    previousCard: HiLoCard | null;
    lastDirection: "higher" | "lower" | null;
    lastCorrect: boolean | null;
    streak: number;
    multiplier: number;
    awaitingDecision: boolean;
    done: boolean;
    flipping: boolean;
    flipStartedAt: number | null;
    flipEndsAt: number | null;
    revealEndsAt: number | null;
    pendingCard: HiLoCard | null;
    pendingCorrect: boolean | null;
    pendingFactor: number | null;
  }>;
}

export interface FortuneSegment { label: string; multiplier: number; tone: "bad" | "neutral" | "good" | "jackpot" }
export const FORTUNE_SEGMENTS: FortuneSegment[] = [
  { label: "0×", multiplier: 0, tone: "bad" },
  { label: "1×", multiplier: 1, tone: "neutral" },
  { label: "0,5×", multiplier: 0.5, tone: "bad" },
  { label: "2×", multiplier: 2, tone: "good" },
  { label: "1,25×", multiplier: 1.25, tone: "neutral" },
  { label: "0×", multiplier: 0, tone: "bad" },
  { label: "3×", multiplier: 3, tone: "good" },
  { label: "1,5×", multiplier: 1.5, tone: "good" },
  { label: "0,75×", multiplier: 0.75, tone: "bad" },
  { label: "5×", multiplier: 5, tone: "good" },
  { label: "1×", multiplier: 1, tone: "neutral" },
  { label: "10×", multiplier: 10, tone: "jackpot" },
];
export interface FortuneMiniState {
  kind: "fortune";
  spinStartedAt: number;
  spinEndsAt: number;
  settleEndsAt: number | null;
  resultIndex: number | null;
  revealedIndex: number | null;
  settling: boolean;
}

export type LastChanceCoinSide = "dollar" | "crown";
export interface LastChanceMiniState {
  kind: "lastChance";
  eligibleIds: string[];
  choices: Record<string, LastChanceCoinSide | null>;
  coinResults: Record<string, LastChanceCoinSide | null>;
  results: Record<string, "revived" | "failed" | null>;
  spinning: Record<string, boolean>;
  spinStartedAt: Record<string, number | null>;
  spinEndsAt: Record<string, number | null>;
  revealEndsAt: Record<string, number | null>;
  pendingCoinResults: Record<string, LastChanceCoinSide | null>;
}

export type CasinoMiniState = MinesMiniState | CrashMiniState | RouletteMiniState | SlotsMiniState | RaceMiniState | DiceMiniState | HiLoMiniState | FortuneMiniState | PlinkoMiniState | BriefcaseMiniState | LastChanceMiniState;

export interface CasinoState {
  mode: CasinoMode;
  length: CasinoLength;
  targetBalance: number;
  startingBalance: number;
  expectedPlayers: string[];
  phase: CasinoPhase;
  round: number;
  offeredGames: CasinoMiniGame[];
  chosenGame: CasinoMiniGame | null;
  players: Record<string, CasinoPlayerState>;
  miniState: CasinoMiniState | null;
  roundReady: Record<string, boolean>;
  history: CasinoRoundHistory[];
  message: string | null;
  startedAt: number;
  finishedAt: number | null;
  winnerId: string | null;
  finishReason: "target" | "bankruptcy" | "draw" | null;
  revision: number;
}

export function casinoMinimumBet(balance: number): number {
  if (balance <= 0) return 0;
  return Math.min(balance, Math.max(10, Math.ceil((balance * 0.1) / 10) * 10));
}

export function formatCasinoChips(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString("pt-BR");
}

export function slotAsset(symbol: SlotSymbolId): string {
  return `/images/casino/slots/${symbol}.png`;
}

export function racerAsset(racer: CasinoRacerId): string {
  if (racer === "crown") return "/images/casino/coin.png";
  return `/images/casino/slots/${racer}.png`;
}

export function cardLabel(rank: number): string {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

export function cardSuitSymbol(suit: CardSuit): string {
  if (suit === "hearts") return "♥";
  if (suit === "diamonds") return "♦";
  if (suit === "clubs") return "♣";
  return "♠";
}

export function hiLoChoiceMultiplier(rank: number, direction: "higher" | "lower"): number | null {
  const favorable = direction === "higher" ? 13 - rank : rank - 1;
  if (favorable <= 0) return null;
  return Math.max(1.03, Math.round((0.96 / (favorable / 13)) * 100) / 100);
}
