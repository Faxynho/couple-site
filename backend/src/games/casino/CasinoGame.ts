import { GameEngine } from "../../types";

export type CasinoLength = "quick" | "normal" | "long";
export type CasinoMode = "duel" | "soloBot";
export const CASINO_BOT_ID = "BOT" as const;
export type CasinoMiniGame = "mines" | "crash" | "roulette" | "slots" | "race" | "dice" | "hilo" | "fortune" | "plinko" | "briefcase";
export type CasinoPhase = "selecting" | "betting" | "playing" | "roundResult" | "lastChance" | "finished";

export const CASINO_LENGTH_TARGETS: Record<CasinoLength, number> = {
  quick: 2_000,
  normal: 5_000,
  long: 10_000,
};

export const CASINO_MINIGAMES: CasinoMiniGame[] = [
  "mines",
  "crash",
  "roulette",
  "slots",
  "race",
  "dice",
  "hilo",
  "fortune",
  "plinko",
  "briefcase",
];

export function isValidCasinoLength(value: unknown): value is CasinoLength {
  return value === "quick" || value === "normal" || value === "long";
}

export function isValidCasinoMiniGame(value: unknown): value is CasinoMiniGame {
  return typeof value === "string" && CASINO_MINIGAMES.includes(value as CasinoMiniGame);
}

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

interface MinesPlayerState {
  mineIndexes: number[];
  openedIndexes: number[];
  multiplier: number;
  exploded: boolean;
  explodedIndex: number | null;
  done: boolean;
}
export interface MinesMiniState {
  kind: "mines";
  gridSize: 25;
  mineCount: 5;
  players: Record<string, MinesPlayerState>;
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
interface SlotsPlayerState {
  /** Quantos giros já foram consumidos nesta aposta. Os dois primeiros erros não encerram a tentativa. */
  spinsUsed: number;
  /** Quantidade de giros vencedores; usada pelo BOT para decidir quando sacar. */
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
}
export interface SlotsMiniState {
  kind: "slots";
  players: Record<string, SlotsPlayerState>;
}

export const PLINKO_MULTIPLIERS = [12, 5, 3, 1.5, 1, 0.5, 0.2, 0.5, 1, 1.5, 3, 5, 12] as const;

interface PlinkoPlayerState {
  dropping: boolean;
  dropStartedAt: number | null;
  dropEndsAt: number | null;
  path: number[] | null;
  pendingBucket: number | null;
  bucketIndex: number | null;
  multiplier: number | null;
  revealEndsAt: number | null;
  done: boolean;
}

export interface PlinkoMiniState {
  kind: "plinko";
  rows: 12;
  multipliers: number[];
  players: Record<string, PlinkoPlayerState>;
}

export type BriefcaseValue = number | "lose";

interface BriefcasePlayerState {
  accumulatedMultiplier: number;
  awaitingDecision: boolean;
  done: boolean;
  cashed: boolean;
  openedCount: number;
  lastOpenedIndex: number | null;
}

export interface BriefcaseMiniState {
  kind: "briefcase";
  contents: Array<BriefcaseValue | null>;
  openedBy: Array<string | null>;
  startPlayerId: string;
  turnPlayerId: string | null;
  players: Record<string, BriefcasePlayerState>;
  lastOpenedIndex: number | null;
  lastOpenedBy: string | null;
  lastValue: BriefcaseValue | null;
  revealEndsAt: number | null;
}

export interface CasinoRacer {
  id: "crown" | "cherry" | "clover" | "star" | "diamond";
  label: string;
  odds: number;
  weight: number;
}

export const CASINO_RACERS: CasinoRacer[] = [
  { id: "crown", label: "Coroa Real", odds: 2.4, weight: 36 },
  { id: "cherry", label: "Cereja Veloz", odds: 3.2, weight: 26 },
  { id: "clover", label: "Trevo da Sorte", odds: 4.2, weight: 18 },
  { id: "star", label: "Estrela Dourada", odds: 5.5, weight: 12 },
  { id: "diamond", label: "Diamante Azul", odds: 8, weight: 8 },
];

export interface RaceMiniState {
  kind: "race";
  picks: Record<string, CasinoRacer["id"] | null>;
  startedAt: number | null;
  progress: Record<CasinoRacer["id"], number>;
  winner: CasinoRacer["id"] | null;
  durationsMs: Record<CasinoRacer["id"], number> | null;
}

interface DicePlayerState {
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
}
export interface DiceMiniState {
  kind: "dice";
  players: Record<string, DicePlayerState>;
}

export type CardSuit = "hearts" | "diamonds" | "clubs" | "spades";
export interface HiLoCard { rank: number; suit: CardSuit }
interface HiLoPlayerState {
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
}
export interface HiLoMiniState {
  kind: "hilo";
  players: Record<string, HiLoPlayerState>;
}

export interface FortuneSegment {
  label: string;
  multiplier: number;
  tone: "bad" | "neutral" | "good" | "jackpot";
}
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

export type CasinoMiniState =
  | MinesMiniState
  | CrashMiniState
  | RouletteMiniState
  | SlotsMiniState
  | RaceMiniState
  | DiceMiniState
  | HiLoMiniState
  | FortuneMiniState
  | PlinkoMiniState
  | BriefcaseMiniState
  | LastChanceMiniState;

export interface CasinoBotState {
  playerId: typeof CASINO_BOT_ID;
  /** Perfil interno sem dificuldade: varia levemente por partida para não parecer um script. */
  risk: number;
  /** Chave da decisão que o BOT está "pensando" neste instante. */
  decisionKey: string | null;
  /** Momento em que ele pode executar a decisão atual — dá ritmo humano às ações. */
  nextActionAt: number;
  /** Plano decidido antes do resultado existir; nunca consulta informação escondida. */
  plannedRound: number;
  plannedGame: CasinoMiniGame | null;
  minesCashoutAfter: number;
  crashCashoutAt: number;
}

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
  bot: CasinoBotState | null;
  revision: number;
}

export type CasinoAction =
  | { type: "vote"; game: CasinoMiniGame }
  | { type: "lockBet"; amount: number }
  | { type: "minesOpen"; index: number }
  | { type: "cashOut" }
  | { type: "crashCashOut" }
  | { type: "roulettePick"; bet: RouletteBet }
  | { type: "slotsSpin" }
  | { type: "racePick"; racerId: CasinoRacer["id"] }
  | { type: "diceRoll" }
  | { type: "diceContinue" }
  | { type: "hiloGuess"; direction: "higher" | "lower" }
  | { type: "hiloContinue" }
  | { type: "plinkoDrop" }
  | { type: "briefcaseOpen"; index: number }
  | { type: "briefcaseContinue" }
  | { type: "nextRound" }
  | { type: "lastChanceChoose"; side: LastChanceCoinSide }
  | { type: "lastChanceSpin" }
  | { type: "tick"; now?: number };

const SLOT_SYMBOLS: Array<{ id: SlotSymbolId; weight: number; pair: number; triple: number }> = [
  { id: "cherry", weight: 20, pair: 1.25, triple: 2.5 },
  { id: "strawberry", weight: 18, pair: 1.3, triple: 2.8 },
  { id: "plum", weight: 16, pair: 1.35, triple: 3.2 },
  { id: "clover", weight: 13, pair: 1.45, triple: 4 },
  { id: "heart-card", weight: 10, pair: 1.55, triple: 4.8 },
  { id: "club-card", weight: 9, pair: 1.6, triple: 5.5 },
  { id: "thunder", weight: 6, pair: 1.8, triple: 7 },
  { id: "star", weight: 5, pair: 2, triple: 9 },
  { id: "diamond", weight: 3, pair: 2.4, triple: 12 },
];

const RED_ROULETTE = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const DICE_MULTIPLIERS = [1.5, 2.2, 3.2, 5, 8];
const HI_LO_MAX_STREAK = 7;
const START_BALANCE = 1_000;
const SLOT_JACKPOT_MULTIPLIER = 50;
const SLOT_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const BRIEFCASE_VALUES: BriefcaseValue[] = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5, "lose", "lose"];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

function pickOfferedGames(): CasinoMiniGame[] {
  return shuffle(CASINO_MINIGAMES).slice(0, 3);
}


function botDelay(minMs: number, maxMs: number): number {
  return minMs + randomInt(Math.max(1, maxMs - minMs + 1));
}

function createBotState(now: number): CasinoBotState {
  return {
    playerId: CASINO_BOT_ID,
    risk: round2(0.46 + Math.random() * 0.18),
    decisionKey: null,
    nextActionAt: now + botDelay(650, 1_150),
    plannedRound: 0,
    plannedGame: null,
    minesCashoutAfter: 3,
    crashCashoutAt: 1.8,
  };
}

function botDecisionDelay(key: string): number {
  if (key.startsWith("crash:")) return botDelay(220, 480);
  if (key.startsWith("mines:")) return botDelay(420, 780);
  if (key.startsWith("dice:")) return botDelay(480, 850);
  if (key.startsWith("hilo:")) return botDelay(520, 950);
  if (key.startsWith("slots:")) return botDelay(480, 900);
  if (key.startsWith("plinko:")) return botDelay(520, 900);
  if (key.startsWith("briefcase:")) return botDelay(620, 1_050);
  if (key.startsWith("lastChance:")) return botDelay(650, 1_050);
  if (key.startsWith("nextRound:")) return botDelay(700, 1_250);
  return botDelay(650, 1_200);
}

function ensureBotMiniPlan(state: CasinoState, now: number): CasinoState {
  const bot = state.bot;
  if (!bot || state.mode !== "soloBot" || state.phase !== "playing" || !state.chosenGame) return state;
  if (bot.plannedRound === state.round && bot.plannedGame === state.chosenGame) return state;

  const next = cloneState(state);
  const nextBot = next.bot!;
  nextBot.plannedRound = next.round;
  nextBot.plannedGame = next.chosenGame;
  // O alvo do Mines é escolhido sem olhar as bombas. Em geral o BOT tenta
  // abrir 2–4 casas seguras antes de sacar; raramente arrisca uma quinta.
  nextBot.minesCashoutAfter = 2 + randomInt(3);
  if (nextBot.risk > 0.58 && Math.random() < 0.35) nextBot.minesCashoutAfter = 5;
  // O ponto de saque do Crash é decidido ANTES de saber o crashPoint.
  nextBot.crashCashoutAt = round2(Math.max(1.25, Math.min(2.65,
    1.25 + nextBot.risk * 1.45 + (Math.random() - 0.5) * 0.34
  )));
  nextBot.decisionKey = null;
  nextBot.nextActionAt = now + botDelay(450, 800);
  return touch(next);
}

function chooseBotBet(state: CasinoState): number {
  const bot = state.bot!;
  const player = state.players[CASINO_BOT_ID];
  const min = casinoMinimumBet(player.balance);
  if (min >= player.balance) return player.balance;
  const progress = player.balance / state.targetBalance;
  let ratio = 0.12 + bot.risk * 0.16;
  if (progress > 0.78) ratio *= 0.78;
  if (player.balance < 350) ratio *= 0.9;
  ratio *= 0.88 + Math.random() * 0.24;
  const raw = Math.round((player.balance * ratio) / 10) * 10;
  return Math.max(min, Math.min(player.balance, raw));
}

function chooseBotRouletteBet(): RouletteBet {
  const roll = Math.random();
  if (roll < 0.72) {
    const evenMoney: RouletteBet[] = [
      { kind: "red" }, { kind: "black" }, { kind: "odd" }, { kind: "even" }, { kind: "low" }, { kind: "high" },
    ];
    return evenMoney[randomInt(evenMoney.length)];
  }
  if (roll < 0.92) return { kind: "dozen", value: (randomInt(3) + 1) as 1 | 2 | 3 };
  return { kind: "number", value: randomInt(37) };
}

function chooseBotRacer(): CasinoRacer["id"] {
  // Usa só as odds impressas na mesa. Favoritos aparecem mais, mas o BOT às
  // vezes busca um multiplicador alto como uma pessoa comum faria.
  const roll = Math.random();
  if (roll < 0.34) return "crown";
  if (roll < 0.60) return "cherry";
  if (roll < 0.78) return "clover";
  if (roll < 0.91) return "star";
  return "diamond";
}

function chooseBotHiLoDirection(rank: number): "higher" | "lower" {
  if (rank <= 1) return "higher";
  if (rank >= 13) return "lower";
  const higher = 13 - rank;
  const lower = rank - 1;
  const safer: "higher" | "lower" = higher >= lower ? "higher" : "lower";
  const riskier: "higher" | "lower" = safer === "higher" ? "lower" : "higher";
  // Pequena chance de uma decisão menos ótima para o BOT não jogar como uma
  // calculadora perfeita; ainda assim ele nunca conhece a próxima carta.
  return Math.random() < 0.14 ? riskier : safer;
}

function botDecisionKey(state: CasinoState, now: number): string | null {
  if (state.mode !== "soloBot" || !state.bot || !state.players[CASINO_BOT_ID]) return null;
  const botPlayer = state.players[CASINO_BOT_ID];

  if (state.phase === "selecting") return botPlayer.vote ? null : `vote:${state.round}`;
  if (state.phase === "betting") return botPlayer.betLocked ? null : `bet:${state.round}`;
  if (state.phase === "roundResult") return state.roundReady[CASINO_BOT_ID] ? null : `nextRound:${state.round}`;

  if (state.phase === "lastChance") {
    const mini = state.miniState;
    if (!mini || mini.kind !== "lastChance" || !mini.eligibleIds.includes(CASINO_BOT_ID)) return null;
    if (mini.results[CASINO_BOT_ID] != null || mini.spinning[CASINO_BOT_ID]) return null;
    return mini.choices[CASINO_BOT_ID] ? `lastChance:spin:${state.round}` : `lastChance:choose:${state.round}`;
  }

  if (state.phase !== "playing" || !state.miniState) return null;
  const mini = state.miniState;
  if (mini.kind === "mines") {
    const p = mini.players[CASINO_BOT_ID];
    if (!p || p.done) return null;
    if (p.openedIndexes.length > 0 && p.openedIndexes.length >= state.bot.minesCashoutAfter) return `mines:cash:${p.openedIndexes.length}`;
    return `mines:open:${p.openedIndexes.length}`;
  }
  if (mini.kind === "crash") {
    if (mini.crashed || mini.cashouts[CASINO_BOT_ID] != null || now < mini.startedAt) return null;
    return mini.multiplier >= state.bot.crashCashoutAt ? `crash:cash:${state.round}` : null;
  }
  if (mini.kind === "roulette") {
    return !mini.spinning && !mini.selections[CASINO_BOT_ID] ? `roulette:pick:${state.round}` : null;
  }
  if (mini.kind === "slots") {
    const p = mini.players[CASINO_BOT_ID];
    if (!p || p.done || p.spinning) return null;
    return p.awaitingDecision ? `slots:decision:${p.streak}` : `slots:spin:${p.streak}`;
  }
  if (mini.kind === "race") {
    return !mini.startedAt && !mini.picks[CASINO_BOT_ID] ? `race:pick:${state.round}` : null;
  }
  if (mini.kind === "dice") {
    const p = mini.players[CASINO_BOT_ID];
    if (!p || p.done || p.rollingDie != null) return null;
    if (p.awaitingDecision) return `dice:decision:${p.wins}:${p.outcome}`;
    return `dice:roll:${p.revealedDiceCount}`;
  }
  if (mini.kind === "hilo") {
    const p = mini.players[CASINO_BOT_ID];
    if (!p || p.done || p.flipping) return null;
    if (p.awaitingDecision) return `hilo:decision:${p.streak}`;
    return `hilo:guess:${p.streak}:${p.currentCard.rank}`;
  }
  if (mini.kind === "plinko") {
    const p = mini.players[CASINO_BOT_ID];
    if (!p || p.done || p.dropping || p.revealEndsAt != null) return null;
    return `plinko:drop:${state.round}`;
  }
  if (mini.kind === "briefcase") {
    const p = mini.players[CASINO_BOT_ID];
    if (!p || p.done || mini.revealEndsAt != null) return null;
    if (p.awaitingDecision) return `briefcase:decision:${p.openedCount}:${p.accumulatedMultiplier}`;
    if (mini.turnPlayerId === CASINO_BOT_ID) return `briefcase:pick:${mini.openedBy.filter(Boolean).length}`;
  }
  return null;
}

function botActionForState(state: CasinoState): CasinoAction | null {
  const bot = state.bot;
  if (!bot) return null;
  const player = state.players[CASINO_BOT_ID];

  if (state.phase === "selecting") {
    // Voto é escolhido somente entre as três ofertas e não consulta o voto humano.
    return { type: "vote", game: state.offeredGames[randomInt(state.offeredGames.length)] };
  }
  if (state.phase === "betting") return { type: "lockBet", amount: chooseBotBet(state) };
  if (state.phase === "roundResult") return { type: "nextRound" };
  if (state.phase === "lastChance") {
    const mini = state.miniState;
    if (!mini || mini.kind !== "lastChance") return null;
    if (!mini.choices[CASINO_BOT_ID]) return { type: "lastChanceChoose", side: Math.random() < 0.5 ? "dollar" : "crown" };
    return { type: "lastChanceSpin" };
  }
  if (state.phase !== "playing" || !state.miniState) return null;

  const mini = state.miniState;
  if (mini.kind === "mines") {
    const p = mini.players[CASINO_BOT_ID];
    if (p.openedIndexes.length > 0 && p.openedIndexes.length >= bot.minesCashoutAfter) return { type: "cashOut" };
    // Deliberadamente NÃO usa mineIndexes. A casa é escolhida apenas dentre as
    // ainda fechadas; por isso o BOT pode explodir exatamente como uma pessoa.
    const closed = Array.from({ length: mini.gridSize }, (_, i) => i).filter((i) => !p.openedIndexes.includes(i));
    if (closed.length === 0) return { type: "cashOut" };
    return { type: "minesOpen", index: closed[randomInt(closed.length)] };
  }
  if (mini.kind === "crash") return { type: "crashCashOut" };
  if (mini.kind === "roulette") return { type: "roulettePick", bet: chooseBotRouletteBet() };
  if (mini.kind === "slots") {
    const p = mini.players[CASINO_BOT_ID];
    if (!p.awaitingDecision) return { type: "slotsSpin" };
    const cashChance = Math.max(0.22, Math.min(0.92, 0.24 + p.streak * 0.14 + Math.max(0, p.multiplier - 2) * 0.08 - bot.risk * 0.18));
    return Math.random() < cashChance ? { type: "cashOut" } : { type: "slotsSpin" };
  }
  if (mini.kind === "race") return { type: "racePick", racerId: chooseBotRacer() };
  if (mini.kind === "dice") {
    const p = mini.players[CASINO_BOT_ID];
    if (!p.awaitingDecision) return { type: "diceRoll" };
    if (p.outcome === "neutral") return Math.random() < (0.38 - bot.risk * 0.12) ? { type: "cashOut" } : { type: "diceContinue" };
    const cashChance = Math.max(0.30, Math.min(0.9, 0.30 + p.wins * 0.15 + Math.max(0, p.multiplier - 2) * 0.08 - bot.risk * 0.18));
    return Math.random() < cashChance ? { type: "cashOut" } : { type: "diceContinue" };
  }
  if (mini.kind === "hilo") {
    const p = mini.players[CASINO_BOT_ID];
    if (!p.awaitingDecision) return { type: "hiloGuess", direction: chooseBotHiLoDirection(p.currentCard.rank) };
    const cashChance = Math.max(0.28, Math.min(0.92, 0.28 + p.streak * 0.12 + Math.max(0, p.multiplier - 1.7) * 0.07 - bot.risk * 0.16));
    return Math.random() < cashChance ? { type: "cashOut" } : { type: "hiloContinue" };
  }
  if (mini.kind === "plinko") return { type: "plinkoDrop" };
  if (mini.kind === "briefcase") {
    const p = mini.players[CASINO_BOT_ID];
    if (p.awaitingDecision) {
      const cashChance = Math.max(0.16, Math.min(0.94,
        0.14 + p.accumulatedMultiplier * 0.16 + p.openedCount * 0.025 - bot.risk * 0.12
      ));
      return Math.random() < cashChance ? { type: "cashOut" } : { type: "briefcaseContinue" };
    }
    const closed = mini.openedBy
      .map((openedBy, index) => openedBy == null ? index : -1)
      .filter((index) => index >= 0);
    if (closed.length === 0) return null;
    // O BOT escolhe somente entre índices ainda fechados. Ele não consulta
    // contents, então não sabe onde está o "PERDEU" nem os multiplicadores.
    return { type: "briefcaseOpen", index: closed[randomInt(closed.length)] };
  }
  return null;
}

export function casinoMinimumBet(balance: number): number {
  if (balance <= 0) return 0;
  const tenPercentRounded = Math.ceil((balance * 0.1) / 10) * 10;
  return Math.min(balance, Math.max(10, tenPercentRounded));
}

function basePlayer(): CasinoPlayerState {
  return {
    balance: START_BALANCE,
    vote: null,
    roundBet: null,
    betLocked: false,
    roundDelta: 0,
    roundStatus: "idle",
    lastPayout: 0,
    lastMultiplier: 0,
    bestMultiplier: 0,
    totalWagered: 0,
    totalWon: 0,
    lastChanceUsed: false,
    lastChanceResult: null,
  };
}

function touch(state: CasinoState): CasinoState {
  state.revision += 1;
  return state;
}

function cloneState(state: CasinoState): CasinoState {
  return structuredClone(state);
}

function isExpectedPlayer(state: CasinoState, playerId: string): boolean {
  return state.expectedPlayers.includes(playerId) && Boolean(state.players[playerId]);
}

function allPlayers(state: CasinoState, predicate: (id: string) => boolean): boolean {
  return state.expectedPlayers.length > 0 && state.expectedPlayers.every(predicate);
}

function resetRoundPlayer(player: CasinoPlayerState) {
  player.vote = null;
  player.roundBet = null;
  player.betLocked = false;
  player.roundDelta = 0;
  player.roundStatus = "idle";
  player.lastPayout = 0;
  player.lastMultiplier = 0;
  player.lastChanceResult = null;
}

function payoutPlayer(state: CasinoState, playerId: string, multiplier: number, status: "won" | "cashed") {
  const player = state.players[playerId];
  const bet = player?.roundBet ?? 0;
  if (!player || bet <= 0) return;
  const payout = Math.max(0, Math.round(bet * multiplier));
  player.balance += payout;
  player.roundDelta += payout;
  player.lastPayout = payout;
  player.lastMultiplier = round2(multiplier);
  player.bestMultiplier = Math.max(player.bestMultiplier, round2(multiplier));
  player.totalWon += payout;
  player.roundStatus = status;
}

function losePlayer(state: CasinoState, playerId: string) {
  const player = state.players[playerId];
  if (!player) return;
  player.lastPayout = 0;
  player.lastMultiplier = 0;
  player.roundStatus = "lost";
}

function mineMultiplier(safeOpened: number, total = 25, mineCount = 5): number {
  const safe = total - mineCount;
  let survive = 1;
  for (let i = 0; i < safeOpened; i++) {
    survive *= (safe - i) / (total - i);
  }
  if (survive <= 0) return 50;
  return Math.min(50, Math.max(1.01, round2(0.96 / survive)));
}

function pickMines(): number[] {
  return shuffle(Array.from({ length: 25 }, (_, i) => i)).slice(0, 5).sort((a, b) => a - b);
}

function pickSlotSymbol(): SlotSymbolId {
  return weightedPick(SLOT_SYMBOLS).id;
}

function slotGridResult(symbols: SlotSymbolId[]): { factor: number; lines: number[]; jackpot: boolean } | null {
  if (symbols.length !== 9) return null;
  const lines: number[] = [];
  const lineFactors: number[] = [];
  SLOT_LINES.forEach((line, lineIndex) => {
    const [a, b, c] = line;
    const symbol = symbols[a];
    if (!symbol || symbol !== symbols[b] || symbol !== symbols[c]) return;
    const config = SLOT_SYMBOLS.find((item) => item.id === symbol);
    if (!config) return;
    lines.push(lineIndex);
    lineFactors.push(config.triple);
  });
  if (lines.length === 0) return null;
  const jackpot = lines.length >= 4;
  if (jackpot) return { factor: SLOT_JACKPOT_MULTIPLIER, lines, jackpot: true };

  const lineSum = lineFactors.reduce((sum, value) => sum + value, 0);
  const multiLineBonus = 1 + Math.max(0, lines.length - 1) * 0.25;
  return {
    factor: round2(Math.min(30, lineSum * multiLineBonus)),
    lines,
    jackpot: false,
  };
}

function randomDiceSets(): { green: number[]; red: number[] } {
  const values = shuffle(Array.from({ length: 11 }, (_, i) => i + 2));
  return {
    green: values.slice(0, 3).sort((a, b) => a - b),
    red: values.slice(3, 5).sort((a, b) => a - b),
  };
}

function plinkoPath(rows = 12): { path: number[]; bucket: number } {
  const path = Array.from({ length: rows }, () => (Math.random() < 0.5 ? -1 : 1));
  const bucket = path.reduce((rights, direction) => rights + (direction > 0 ? 1 : 0), 0);
  return { path, bucket };
}

function nextBriefcasePlayer(state: CasinoState, mini: BriefcaseMiniState, currentId: string): string | null {
  const currentIndex = state.expectedPlayers.indexOf(currentId);
  for (let offset = 1; offset <= state.expectedPlayers.length; offset += 1) {
    const id = state.expectedPlayers[(currentIndex + offset) % state.expectedPlayers.length];
    if (id && !mini.players[id]?.done) return id;
  }
  return null;
}

function drawCard(): HiLoCard {
  const suits: CardSuit[] = ["hearts", "diamonds", "clubs", "spades"];
  return { rank: randomInt(13) + 1, suit: suits[randomInt(suits.length)] };
}

function hiLoStepFactor(rank: number, direction: "higher" | "lower"): number | null {
  const favorable = direction === "higher" ? 13 - rank : rank - 1;
  if (favorable <= 0) return null;
  const probability = favorable / 13;
  return Math.max(1.03, round2(0.96 / probability));
}

function rouletteColor(number: number): "red" | "black" | "green" {
  if (number === 0) return "green";
  return RED_ROULETTE.has(number) ? "red" : "black";
}

function validRouletteBet(bet: RouletteBet): boolean {
  if (!bet || typeof bet !== "object" || typeof bet.kind !== "string") return false;
  if (["red", "black", "odd", "even", "low", "high"].includes(bet.kind)) return true;
  if (bet.kind === "dozen") return bet.value === 1 || bet.value === 2 || bet.value === 3;
  if (bet.kind === "number") return Number.isInteger(bet.value) && bet.value >= 0 && bet.value <= 36;
  return false;
}

function roulettePayout(bet: RouletteBet, number: number): number {
  const color = rouletteColor(number);
  switch (bet.kind) {
    case "red": return color === "red" ? 2 : 0;
    case "black": return color === "black" ? 2 : 0;
    case "odd": return number !== 0 && number % 2 === 1 ? 2 : 0;
    case "even": return number !== 0 && number % 2 === 0 ? 2 : 0;
    case "low": return number >= 1 && number <= 18 ? 2 : 0;
    case "high": return number >= 19 && number <= 36 ? 2 : 0;
    case "dozen": {
      const start = (bet.value - 1) * 12 + 1;
      return number >= start && number <= start + 11 ? 3 : 0;
    }
    case "number": return number === bet.value ? 36 : 0;
  }
}

function crashPoint(): number {
  const u = Math.max(0.015, Math.random());
  const point = 1.04 + -Math.log(u) * 1.75;
  return Math.min(20, Math.max(1.05, round2(point)));
}

function crashMultiplierAt(startedAt: number, now: number): number {
  if (now <= startedAt) return 1;
  return Math.min(20, round2(Math.exp((now - startedAt) / 6500)));
}

function initialMiniState(game: CasinoMiniGame, playerIds: string[], now: number): CasinoMiniState {
  if (game === "mines") {
    return {
      kind: "mines",
      gridSize: 25,
      mineCount: 5,
      players: Object.fromEntries(playerIds.map((id) => [id, {
        mineIndexes: pickMines(),
        openedIndexes: [],
        multiplier: 1,
        exploded: false,
        explodedIndex: null,
        done: false,
      }])),
    };
  }
  if (game === "crash") {
    return {
      kind: "crash",
      startedAt: now + 1400,
      multiplier: 1,
      crashPoint: crashPoint(),
      crashed: false,
      cashouts: Object.fromEntries(playerIds.map((id) => [id, null])),
    };
  }
  if (game === "roulette") {
    return {
      kind: "roulette",
      selections: Object.fromEntries(playerIds.map((id) => [id, null])),
      spinning: false,
      settling: false,
      spinStartedAt: null,
      spinEndsAt: null,
      settleEndsAt: null,
      resultNumber: null,
      resultColor: null,
    };
  }
  if (game === "slots") {
    return {
      kind: "slots",
      players: Object.fromEntries(playerIds.map((id) => [id, {
        spinsUsed: 0,
        streak: 0,
        multiplier: 1,
        lastSymbols: [],
        lastWinFactor: null,
        lastWinningLines: [],
        lastSpinWon: null,
        jackpotHit: false,
        awaitingDecision: false,
        spinning: false,
        spinStartedAt: null,
        spinEndsAt: null,
        pendingSymbols: null,
        pendingFactor: null,
        revealEndsAt: null,
        done: false,
      }])),
    };
  }
  if (game === "race") {
    const progress = Object.fromEntries(CASINO_RACERS.map((r) => [r.id, 0])) as RaceMiniState["progress"];
    return {
      kind: "race",
      picks: Object.fromEntries(playerIds.map((id) => [id, null])),
      startedAt: null,
      progress,
      winner: null,
      durationsMs: null,
    };
  }
  if (game === "dice") {
    return {
      kind: "dice",
      players: Object.fromEntries(playerIds.map((id) => {
        const sets = randomDiceSets();
        return [id, {
          ...sets,
          dice: [null, null],
          revealedDiceCount: 0,
          rollingDie: null,
          rollStartedAt: null,
          rollEndsAt: null,
          pendingDie: null,
          revealEndsAt: null,
          sum: null,
          outcome: null,
          wins: 0,
          multiplier: 1,
          awaitingDecision: false,
          done: false,
        }];
      })),
    };
  }
  if (game === "hilo") {
    return {
      kind: "hilo",
      players: Object.fromEntries(playerIds.map((id) => [id, {
        currentCard: drawCard(),
        previousCard: null,
        lastDirection: null,
        lastCorrect: null,
        streak: 0,
        multiplier: 1,
        awaitingDecision: false,
        done: false,
        flipping: false,
        flipStartedAt: null,
        flipEndsAt: null,
        revealEndsAt: null,
        pendingCard: null,
        pendingCorrect: null,
        pendingFactor: null,
      }])),
    };
  }
  if (game === "plinko") {
    return {
      kind: "plinko",
      rows: 12,
      multipliers: [...PLINKO_MULTIPLIERS],
      players: Object.fromEntries(playerIds.map((id) => [id, {
        dropping: false,
        dropStartedAt: null,
        dropEndsAt: null,
        path: null,
        pendingBucket: null,
        bucketIndex: null,
        multiplier: null,
        revealEndsAt: null,
        done: false,
      }])),
    };
  }
  if (game === "briefcase") {
    const contents = shuffle(BRIEFCASE_VALUES);
    const startPlayerId = playerIds[randomInt(playerIds.length)] ?? playerIds[0] ?? "";
    return {
      kind: "briefcase",
      contents,
      openedBy: Array.from({ length: contents.length }, () => null),
      startPlayerId,
      turnPlayerId: startPlayerId || null,
      players: Object.fromEntries(playerIds.map((id) => [id, {
        accumulatedMultiplier: 0,
        awaitingDecision: false,
        done: false,
        cashed: false,
        openedCount: 0,
        lastOpenedIndex: null,
      }])),
      lastOpenedIndex: null,
      lastOpenedBy: null,
      lastValue: null,
      revealEndsAt: null,
    };
  }
  return {
    kind: "fortune",
    spinStartedAt: now,
    // A animação visual dura ~4,35 s e o servidor segura a mesa mais um pouco
    // para garantir que ambos os clientes vejam a roda parada no alvo.
    spinEndsAt: now + 4_900,
    settleEndsAt: null,
    resultIndex: randomInt(FORTUNE_SEGMENTS.length),
    revealedIndex: null,
    settling: false,
  };
}

function beginRace(state: CasinoState, mini: RaceMiniState, now: number) {
  const winner = weightedPick(CASINO_RACERS);
  const winnerDuration = 5_000 + randomInt(650);
  const durations = {} as Record<CasinoRacer["id"], number>;
  for (const racer of CASINO_RACERS) {
    durations[racer.id] = racer.id === winner.id ? winnerDuration : winnerDuration + 250 + randomInt(1_900);
  }
  mini.startedAt = now + 900;
  mini.durationsMs = durations;
  mini.winner = winner.id;
  state.message = "Apostas fechadas. A corrida vai começar!";
}

function completeRound(state: CasinoState, summary: string): CasinoState {
  const game = state.chosenGame;
  if (!game) return state;

  const bets: Record<string, number> = {};
  const deltas: Record<string, number> = {};
  const balances: Record<string, number> = {};
  for (const id of state.expectedPlayers) {
    bets[id] = state.players[id]?.roundBet ?? 0;
    deltas[id] = state.players[id]?.roundDelta ?? 0;
    balances[id] = state.players[id]?.balance ?? 0;
  }
  state.history = [...state.history, { round: state.round, game, bets, deltas, balances, summary }].slice(-8);
  state.message = summary;

  const reached = state.expectedPlayers.filter((id) => (state.players[id]?.balance ?? 0) >= state.targetBalance);
  if (reached.length > 0) {
    let winnerId: string | null = null;
    if (reached.length === 1) {
      winnerId = reached[0];
    } else {
      const [a, b] = reached;
      const aBalance = state.players[a]?.balance ?? 0;
      const bBalance = state.players[b]?.balance ?? 0;
      winnerId = aBalance === bBalance ? null : aBalance > bBalance ? a : b;
    }
    state.phase = "finished";
    state.finishedAt = Date.now();
    state.winnerId = winnerId;
    state.finishReason = winnerId ? "target" : "draw";
    state.message = winnerId ? "A meta de fichas foi alcançada!" : "Os dois alcançaram a meta com o mesmo saldo.";
    return touch(state);
  }

  const broke = state.expectedPlayers.filter((id) => (state.players[id]?.balance ?? 0) <= 0);
  if (broke.length > 0) {
    const eligible = broke.filter((id) => !state.players[id]?.lastChanceUsed);
    if (eligible.length > 0) {
      state.phase = "lastChance";
      state.miniState = {
        kind: "lastChance",
        eligibleIds: eligible,
        choices: Object.fromEntries(eligible.map((id) => [id, null])),
        coinResults: Object.fromEntries(eligible.map((id) => [id, null])),
        results: Object.fromEntries(eligible.map((id) => [id, null])),
        spinning: Object.fromEntries(eligible.map((id) => [id, false])),
        spinStartedAt: Object.fromEntries(eligible.map((id) => [id, null])),
        spinEndsAt: Object.fromEntries(eligible.map((id) => [id, null])),
        revealEndsAt: Object.fromEntries(eligible.map((id) => [id, null])),
        pendingCoinResults: Object.fromEntries(eligible.map((id) => [id, null])),
      };
      state.message = eligible.length === 2 ? "Os dois quebraram. Última chance!" : "Falência! Uma última chance para voltar ao jogo.";
      return touch(state);
    }

    const alive = state.expectedPlayers.filter((id) => (state.players[id]?.balance ?? 0) > 0);
    state.phase = "finished";
    state.finishedAt = Date.now();
    state.winnerId = alive.length === 1 ? alive[0] : null;
    state.finishReason = alive.length === 1 ? "bankruptcy" : "draw";
    state.message = alive.length === 1 ? "O adversário ficou sem fichas e já usou a última chance." : "Os dois foram à falência.";
    return touch(state);
  }

  state.phase = "roundResult";
  state.roundReady = Object.fromEntries(state.expectedPlayers.map((id) => [id, false]));
  return touch(state);
}

function maybeCompleteIndividualRound(state: CasinoState): CasinoState {
  const mini = state.miniState;
  if (!mini) return state;
  let done = false;
  if (mini.kind === "mines") {
    done = allPlayers(state, (id) => Boolean(mini.players[id]?.done));
  } else if (mini.kind === "slots" || mini.kind === "dice" || mini.kind === "hilo" || mini.kind === "plinko") {
    done = allPlayers(state, (id) => Boolean(mini.players[id]?.done) && mini.players[id]?.revealEndsAt == null);
  } else if (mini.kind === "briefcase") {
    done = mini.revealEndsAt == null && allPlayers(state, (id) => Boolean(mini.players[id]?.done));
  } else if (mini.kind === "crash") {
    done = mini.crashed;
  }
  if (!done) return state;

  const labels: Record<CasinoMiniGame, string> = {
    mines: "Mines encerrado.",
    crash: `Crash em ${mini.kind === "crash" ? mini.multiplier.toFixed(2) : "—"}×.`,
    roulette: "Roleta encerrada.",
    slots: "Jackpot encerrado.",
    race: "Corrida encerrada.",
    dice: "Mesa de dados encerrada.",
    hilo: "Hi-Lo encerrado.",
    fortune: "Roda da Fortuna encerrada.",
    plinko: "Plinko encerrado.",
    briefcase: "Maletas encerradas.",
  };
  return completeRound(state, labels[state.chosenGame!]);
}

function handleMines(state: CasinoState, action: CasinoAction, playerId: string): CasinoState {
  const mini = state.miniState;
  if (!mini || mini.kind !== "mines") return state;
  const p = mini.players[playerId];
  if (!p || p.done) return state;

  if (action.type === "minesOpen") {
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= mini.gridSize || p.openedIndexes.includes(action.index)) return state;
    const next = cloneState(state);
    const nextMini = next.miniState as MinesMiniState;
    const nextP = nextMini.players[playerId];
    if (nextP.mineIndexes.includes(action.index)) {
      nextP.exploded = true;
      nextP.explodedIndex = action.index;
      nextP.done = true;
      losePlayer(next, playerId);
    } else {
      nextP.openedIndexes = [...nextP.openedIndexes, action.index].sort((a, b) => a - b);
      nextP.multiplier = mineMultiplier(nextP.openedIndexes.length, nextMini.gridSize, nextMini.mineCount);
      if (nextP.openedIndexes.length >= nextMini.gridSize - nextMini.mineCount) {
        payoutPlayer(next, playerId, nextP.multiplier, "won");
        nextP.done = true;
      }
    }
    touch(next);
    return maybeCompleteIndividualRound(next);
  }

  if (action.type === "cashOut" && p.openedIndexes.length > 0) {
    const next = cloneState(state);
    const nextP = (next.miniState as MinesMiniState).players[playerId];
    payoutPlayer(next, playerId, nextP.multiplier, "cashed");
    nextP.done = true;
    touch(next);
    return maybeCompleteIndividualRound(next);
  }
  return state;
}

function resolveCrashAt(state: CasinoState, now: number): CasinoState {
  const mini = state.miniState;
  if (!mini || mini.kind !== "crash" || mini.crashed || mini.crashPoint == null) return state;
  if (now < mini.startedAt) return state;
  const actual = crashMultiplierAt(mini.startedAt, now);
  const next = cloneState(state);
  const nextMini = next.miniState as CrashMiniState;
  if (actual >= (nextMini.crashPoint ?? 1.05)) {
    nextMini.multiplier = nextMini.crashPoint ?? actual;
    nextMini.crashed = true;
    for (const id of next.expectedPlayers) {
      if (nextMini.cashouts[id] == null) losePlayer(next, id);
    }
    touch(next);
    return maybeCompleteIndividualRound(next);
  }
  if (actual !== nextMini.multiplier) {
    nextMini.multiplier = actual;
    return touch(next);
  }
  return state;
}

function handleCrash(state: CasinoState, action: CasinoAction, playerId: string): CasinoState {
  const mini = state.miniState;
  if (!mini || mini.kind !== "crash") return state;
  if (action.type === "tick") return resolveCrashAt(state, typeof action.now === "number" ? action.now : Date.now());
  if (action.type !== "crashCashOut" || mini.crashed || mini.cashouts[playerId] != null) return state;

  const ticked = resolveCrashAt(state, Date.now());
  const activeMini = ticked.miniState;
  if (!activeMini || activeMini.kind !== "crash" || activeMini.crashed || activeMini.cashouts[playerId] != null) return ticked;
  const next = cloneState(ticked);
  const nextMini = next.miniState as CrashMiniState;
  nextMini.cashouts[playerId] = nextMini.multiplier;
  payoutPlayer(next, playerId, nextMini.multiplier, "cashed");
  touch(next);
  if (allPlayers(next, (id) => nextMini.cashouts[id] != null)) {
    return completeRound(next, "Os dois sacaram antes do Crash.");
  }
  return next;
}

function handleRoulette(state: CasinoState, action: CasinoAction, playerId: string): CasinoState {
  const mini = state.miniState;
  if (!mini || mini.kind !== "roulette") return state;

  if (action.type === "roulettePick" && !mini.spinning && !mini.settling && !mini.selections[playerId] && validRouletteBet(action.bet)) {
    const next = cloneState(state);
    const nextMini = next.miniState as RouletteMiniState;
    nextMini.selections[playerId] = action.bet;
    if (allPlayers(next, (id) => Boolean(nextMini.selections[id]))) {
      const now = Date.now();
      nextMini.spinning = true;
      nextMini.settling = false;
      nextMini.spinStartedAt = now;
      // O resultado é sorteado ANTES da animação começar. Depois que as duas
      // apostas estão travadas ninguém consegue alterar a aposta, então o
      // cliente pode receber o alvo apenas para animar uma única vez até a
      // casa correta, sem uma segunda "correção" visual no final.
      nextMini.resultNumber = randomInt(37);
      nextMini.resultColor = rouletteColor(nextMini.resultNumber);
      nextMini.spinEndsAt = now + 4_900;
      nextMini.settleEndsAt = null;
      next.message = "Apostas fechadas. A bolinha está girando...";
    }
    return touch(next);
  }

  if (action.type !== "tick") return state;
  const now = typeof action.now === "number" ? action.now : Date.now();

  // A roda já recebeu o alvo no começo do giro e faz UMA única animação até
  // ele. O servidor espera a animação terminar e só então aplica os pagamentos
  // e troca para a tela de resultado — sem fase intermediária de "settling".
  if (mini.spinning && mini.spinEndsAt && now >= mini.spinEndsAt && mini.resultNumber != null && mini.resultColor) {
    const next = cloneState(state);
    const nextMini = next.miniState as RouletteMiniState;
    nextMini.spinning = false;
    nextMini.settling = false;
    nextMini.spinEndsAt = null;
    nextMini.settleEndsAt = null;
    for (const id of next.expectedPlayers) {
      const bet = nextMini.selections[id];
      const multiplier = bet ? roulettePayout(bet, nextMini.resultNumber!) : 0;
      if (multiplier > 0) payoutPlayer(next, id, multiplier, "won");
      else losePlayer(next, id);
    }
    touch(next);
    return completeRound(next, `A roleta parou no ${nextMini.resultNumber} ${nextMini.resultColor}.`);
  }
  return state;
}

function handleSlots(state: CasinoState, action: CasinoAction, playerId: string): CasinoState {
  const mini = state.miniState;
  if (!mini || mini.kind !== "slots") return state;

  if (action.type === "tick") {
    const now = typeof action.now === "number" ? action.now : Date.now();
    let next: CasinoState | null = null;
    for (const id of state.expectedPlayers) {
      let currentP = (next?.miniState as SlotsMiniState | undefined)?.players[id] ?? mini.players[id];
      if (currentP?.done && currentP.revealEndsAt != null && now >= currentP.revealEndsAt) {
        if (!next) next = cloneState(state);
        (next.miniState as SlotsMiniState).players[id].revealEndsAt = null;
        currentP = (next.miniState as SlotsMiniState).players[id];
      }
      if (!currentP?.spinning || currentP.spinEndsAt == null || now < currentP.spinEndsAt) continue;
      if (!next) next = cloneState(state);
      const nextP = (next.miniState as SlotsMiniState).players[id];
      const symbols = nextP.pendingSymbols ?? [];
      const result = slotGridResult(symbols);
      const factor = result?.factor ?? null;

      nextP.spinsUsed += 1;
      nextP.lastSymbols = symbols;
      nextP.lastWinFactor = factor;
      nextP.lastWinningLines = result?.lines ?? [];
      nextP.lastSpinWon = factor != null;
      nextP.jackpotHit = Boolean(result?.jackpot);
      nextP.spinning = false;
      nextP.spinStartedAt = null;
      nextP.spinEndsAt = null;
      nextP.pendingSymbols = null;
      nextP.pendingFactor = null;
      nextP.revealEndsAt = null;

      if (factor == null) {
        nextP.awaitingDecision = false;
        // A aposta compra três chances de verdade. Errar no 1º ou 2º giro não
        // encerra a tentativa nem muda o saldo novamente — a aposta já está
        // reservada desde a entrada da mesa. A partir do 3º, um erro encerra.
        if (nextP.spinsUsed >= 3) {
          nextP.done = true;
          nextP.revealEndsAt = now + 950;
          losePlayer(next, id);
        }
      } else {
        nextP.streak += 1;
        nextP.multiplier = result?.jackpot
          ? SLOT_JACKPOT_MULTIPLIER
          : round2(Math.min(SLOT_JACKPOT_MULTIPLIER, nextP.multiplier + (factor - 1)));

        if (result?.jackpot) {
          payoutPlayer(next, id, SLOT_JACKPOT_MULTIPLIER, "won");
          nextP.done = true;
          nextP.awaitingDecision = false;
          nextP.revealEndsAt = now + 1_250;
        } else {
          // Qualquer vitória mantém o prêmio acumulado e permite sacar. Se já
          // consumiu as 3 chances, a vitória também libera exatamente mais um
          // giro; vencê-lo libera outro, sucessivamente, até errar ou sacar.
          nextP.awaitingDecision = true;
        }
      }
    }
    if (!next) return state;
    touch(next);
    return maybeCompleteIndividualRound(next);
  }

  const p = mini.players[playerId];
  if (!p || p.done || p.spinning) return state;

  if (action.type === "slotsSpin") {
    const next = cloneState(state);
    const nextP = (next.miniState as SlotsMiniState).players[playerId];
    const symbols: SlotSymbolId[] = Array.from({ length: 9 }, () => pickSlotSymbol());
    const result = slotGridResult(symbols);
    const now = Date.now();
    nextP.awaitingDecision = false;
    nextP.lastSpinWon = null;
    nextP.lastWinFactor = null;
    nextP.lastWinningLines = [];
    nextP.jackpotHit = false;
    nextP.spinning = true;
    nextP.spinStartedAt = now;
    // As três COLUNAS são rolos únicos. O servidor espera a terceira coluna
    // terminar antes de consolidar o resultado e liberar a próxima decisão.
    nextP.spinEndsAt = now + 2_850;
    nextP.pendingSymbols = symbols;
    nextP.pendingFactor = result?.factor ?? null;
    nextP.revealEndsAt = null;
    touch(next);
    return next;
  }

  if (action.type === "cashOut" && p.awaitingDecision && p.streak > 0) {
    const next = cloneState(state);
    const nextP = (next.miniState as SlotsMiniState).players[playerId];
    payoutPlayer(next, playerId, nextP.multiplier, "cashed");
    nextP.done = true;
    nextP.awaitingDecision = false;
    nextP.revealEndsAt = null;
    touch(next);
    return maybeCompleteIndividualRound(next);
  }
  return state;
}

function settlePlinkoDrop(next: CasinoState, playerId: string, now: number): void {
  const mini = next.miniState as PlinkoMiniState;
  const p = mini.players[playerId];
  if (!p?.dropping || p.pendingBucket == null) return;
  const bucket = p.pendingBucket;
  const multiplier = mini.multipliers[bucket] ?? 0;
  p.dropping = false;
  p.dropStartedAt = null;
  p.dropEndsAt = null;
  p.pendingBucket = null;
  p.bucketIndex = bucket;
  p.multiplier = multiplier;
  p.done = true;
  p.revealEndsAt = now + 900;
  if (multiplier > 0) payoutPlayer(next, playerId, multiplier, multiplier > 1 ? "won" : "cashed");
  else losePlayer(next, playerId);
}

function handlePlinko(state: CasinoState, action: CasinoAction, playerId: string): CasinoState {
  const mini = state.miniState;
  if (!mini || mini.kind !== "plinko") return state;

  if (action.type === "tick") {
    const now = typeof action.now === "number" ? action.now : Date.now();
    let next: CasinoState | null = null;
    for (const id of state.expectedPlayers) {
      let source = (next?.miniState as PlinkoMiniState | undefined)?.players[id] ?? mini.players[id];
      if (source?.dropping && source.dropEndsAt != null && now >= source.dropEndsAt) {
        if (!next) next = cloneState(state);
        settlePlinkoDrop(next, id, now);
        source = (next.miniState as PlinkoMiniState).players[id];
      }
      if (source?.done && source.revealEndsAt != null && now >= source.revealEndsAt) {
        if (!next) next = cloneState(state);
        (next.miniState as PlinkoMiniState).players[id].revealEndsAt = null;
      }
    }
    if (!next) return state;
    touch(next);
    return maybeCompleteIndividualRound(next);
  }

  const p = mini.players[playerId];
  if (!p || p.done || p.dropping || action.type !== "plinkoDrop") return state;
  const next = cloneState(state);
  const nextP = (next.miniState as PlinkoMiniState).players[playerId];
  const generated = plinkoPath((next.miniState as PlinkoMiniState).rows);
  const now = Date.now();
  nextP.dropping = true;
  nextP.dropStartedAt = now;
  nextP.dropEndsAt = now + 3_250;
  nextP.path = generated.path;
  nextP.pendingBucket = generated.bucket;
  nextP.bucketIndex = null;
  nextP.multiplier = null;
  nextP.revealEndsAt = null;
  return touch(next);
}

function cashBriefcasePlayer(next: CasinoState, playerId: string): void {
  const mini = next.miniState as BriefcaseMiniState;
  const p = mini.players[playerId];
  if (!p || p.done) return;
  if (p.accumulatedMultiplier > 0) {
    payoutPlayer(next, playerId, p.accumulatedMultiplier, p.accumulatedMultiplier > 1 ? "won" : "cashed");
  } else {
    losePlayer(next, playerId);
  }
  p.done = true;
  p.cashed = p.accumulatedMultiplier > 0;
  p.awaitingDecision = false;
}

function finishBriefcaseIfExhausted(next: CasinoState): CasinoState {
  const mini = next.miniState as BriefcaseMiniState;
  if (mini.openedBy.some((openedBy) => openedBy == null)) return next;
  for (const id of next.expectedPlayers) cashBriefcasePlayer(next, id);
  mini.turnPlayerId = null;
  return maybeCompleteIndividualRound(next);
}

function handleBriefcase(state: CasinoState, action: CasinoAction, playerId: string): CasinoState {
  const mini = state.miniState;
  if (!mini || mini.kind !== "briefcase") return state;

  if (action.type === "tick") {
    const now = typeof action.now === "number" ? action.now : Date.now();
    if (mini.revealEndsAt == null || now < mini.revealEndsAt) return state;
    const next = cloneState(state);
    const nextMini = next.miniState as BriefcaseMiniState;
    nextMini.revealEndsAt = null;
    touch(next);
    if (nextMini.openedBy.every((openedBy) => openedBy != null)) return finishBriefcaseIfExhausted(next);
    return maybeCompleteIndividualRound(next);
  }

  const p = mini.players[playerId];
  if (!p || p.done || mini.revealEndsAt != null) return state;

  if (action.type === "briefcaseOpen") {
    if (mini.turnPlayerId !== playerId || p.awaitingDecision) return state;
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= mini.contents.length) return state;
    if (mini.openedBy[action.index] != null) return state;
    const value = mini.contents[action.index];
    if (value == null) return state;

    const next = cloneState(state);
    const nextMini = next.miniState as BriefcaseMiniState;
    const nextP = nextMini.players[playerId];
    nextMini.openedBy[action.index] = playerId;
    nextMini.lastOpenedIndex = action.index;
    nextMini.lastOpenedBy = playerId;
    nextMini.lastValue = value;
    nextMini.revealEndsAt = Date.now() + 900;
    nextP.lastOpenedIndex = action.index;
    nextP.openedCount += 1;

    if (value === "lose") {
      nextP.done = true;
      nextP.awaitingDecision = false;
      losePlayer(next, playerId);
      nextMini.turnPlayerId = nextBriefcasePlayer(next, nextMini, playerId);
    } else {
      nextP.accumulatedMultiplier = round2(nextP.accumulatedMultiplier + value);
      nextP.awaitingDecision = true;
    }
    return touch(next);
  }

  if (action.type === "briefcaseContinue" && p.awaitingDecision && mini.turnPlayerId === playerId) {
    const next = cloneState(state);
    const nextMini = next.miniState as BriefcaseMiniState;
    nextMini.players[playerId].awaitingDecision = false;
    nextMini.turnPlayerId = nextBriefcasePlayer(next, nextMini, playerId);
    return touch(next);
  }

  if (action.type === "cashOut" && p.awaitingDecision && mini.turnPlayerId === playerId) {
    const next = cloneState(state);
    const nextMini = next.miniState as BriefcaseMiniState;
    cashBriefcasePlayer(next, playerId);
    nextMini.turnPlayerId = nextBriefcasePlayer(next, nextMini, playerId);
    touch(next);
    return maybeCompleteIndividualRound(next);
  }
  return state;
}

function handleRace(state: CasinoState, action: CasinoAction, playerId: string): CasinoState {
  const mini = state.miniState;
  if (!mini || mini.kind !== "race") return state;

  if (action.type === "racePick" && !mini.startedAt && !mini.picks[playerId] && CASINO_RACERS.some((r) => r.id === action.racerId)) {
    const next = cloneState(state);
    const nextMini = next.miniState as RaceMiniState;
    nextMini.picks[playerId] = action.racerId;
    if (allPlayers(next, (id) => Boolean(nextMini.picks[id]))) beginRace(next, nextMini, Date.now());
    return touch(next);
  }

  if (action.type === "tick" && mini.startedAt && mini.durationsMs && mini.winner) {
    const now = typeof action.now === "number" ? action.now : Date.now();
    if (now < mini.startedAt) return state;
    const elapsed = now - mini.startedAt;
    const next = cloneState(state);
    const nextMini = next.miniState as RaceMiniState;
    for (const racer of CASINO_RACERS) {
      const duration = nextMini.durationsMs![racer.id];
      const ratio = Math.min(1, Math.max(0, elapsed / duration));
      nextMini.progress[racer.id] = round2((1 - Math.pow(1 - ratio, 1.35)) * 100);
    }
    const winnerDuration = nextMini.durationsMs![nextMini.winner!];
    if (elapsed >= winnerDuration) {
      nextMini.progress[nextMini.winner!] = 100;
      for (const id of next.expectedPlayers) {
        const picked = nextMini.picks[id];
        const racer = CASINO_RACERS.find((r) => r.id === picked);
        if (picked === nextMini.winner && racer) payoutPlayer(next, id, racer.odds, "won");
        else losePlayer(next, id);
      }
      touch(next);
      const winner = CASINO_RACERS.find((r) => r.id === nextMini.winner)!;
      return completeRound(next, `${winner.label} venceu a corrida.`);
    }
    return touch(next);
  }
  return state;
}

function settleDiceValue(next: CasinoState, playerId: string, now: number): void {
  const nextP = (next.miniState as DiceMiniState).players[playerId];
  const value = nextP.pendingDie;
  const dieIndex = nextP.rollingDie;
  if (value == null || dieIndex == null) return;

  nextP.dice[dieIndex - 1] = value;
  nextP.revealedDiceCount = dieIndex;
  nextP.pendingDie = null;
  nextP.rollingDie = null;
  nextP.rollStartedAt = null;
  nextP.rollEndsAt = null;

  // O primeiro clique termina aqui. O segundo dado só existe depois que o
  // jogador apertar o botão novamente, como num lançamento de mesa de verdade.
  if (dieIndex === 1) return;

  const a = nextP.dice[0];
  const b = nextP.dice[1];
  if (a == null || b == null) return;
  const sum = a + b;
  nextP.sum = sum;
  if (nextP.green.includes(sum)) {
    nextP.outcome = "win";
    nextP.wins += 1;
    nextP.multiplier = DICE_MULTIPLIERS[Math.min(nextP.wins - 1, DICE_MULTIPLIERS.length - 1)];
    nextP.awaitingDecision = true;
    if (nextP.wins >= DICE_MULTIPLIERS.length) {
      payoutPlayer(next, playerId, nextP.multiplier, "won");
      nextP.done = true;
      nextP.awaitingDecision = false;
      nextP.revealEndsAt = now + 950;
    }
  } else if (nextP.red.includes(sum)) {
    nextP.outcome = "loss";
    nextP.done = true;
    nextP.awaitingDecision = false;
    nextP.revealEndsAt = now + 950;
    losePlayer(next, playerId);
  } else {
    // Neutro devolve a possibilidade de escolha: continuar com a mesma aposta
    // ou parar. Se parar antes de qualquer verde, 1x apenas devolve a aposta.
    nextP.outcome = "neutral";
    nextP.awaitingDecision = true;
  }
}

function handleDice(state: CasinoState, action: CasinoAction, playerId: string): CasinoState {
  const mini = state.miniState;
  if (!mini || mini.kind !== "dice") return state;

  if (action.type === "tick") {
    const now = typeof action.now === "number" ? action.now : Date.now();
    let next: CasinoState | null = null;
    for (const id of state.expectedPlayers) {
      let source = (next?.miniState as DiceMiniState | undefined)?.players[id] ?? mini.players[id];
      if (source?.done && source.revealEndsAt != null && now >= source.revealEndsAt) {
        if (!next) next = cloneState(state);
        (next.miniState as DiceMiniState).players[id].revealEndsAt = null;
        source = (next.miniState as DiceMiniState).players[id];
      }
      if (source?.rollingDie == null || source.rollEndsAt == null || now < source.rollEndsAt) continue;
      if (!next) next = cloneState(state);
      settleDiceValue(next, id, now);
    }
    if (!next) return state;
    touch(next);
    return maybeCompleteIndividualRound(next);
  }

  const p = mini.players[playerId];
  if (!p || p.done || p.rollingDie != null) return state;

  if (action.type === "diceRoll" && !p.awaitingDecision) {
    const next = cloneState(state);
    const nextP = (next.miniState as DiceMiniState).players[playerId];
    const nextDie: 1 | 2 = nextP.revealedDiceCount === 0 ? 1 : nextP.revealedDiceCount === 1 ? 2 : 1;
    if (nextDie === 1 && nextP.revealedDiceCount === 2) return state;
    const now = Date.now();
    nextP.pendingDie = randomInt(6) + 1;
    nextP.rollingDie = nextDie;
    nextP.rollStartedAt = now;
    // O valor já foi sorteado; a janela maior permite um giro 3D completo
    // terminando exatamente na face sorteada antes de o estado consolidar.
    nextP.rollEndsAt = now + 1_100;
    if (nextDie === 1) {
      nextP.dice = [null, null];
      nextP.revealedDiceCount = 0;
      nextP.sum = null;
      nextP.outcome = null;
    }
    return touch(next);
  }

  if (action.type === "diceContinue" && p.awaitingDecision && (p.outcome === "win" || p.outcome === "neutral")) {
    const next = cloneState(state);
    const nextP = (next.miniState as DiceMiniState).players[playerId];
    // Depois de um verde mudam os trios; depois de um neutro os mesmos números
    // permanecem, então a pessoa pode tentar de novo naquela mesa.
    if (nextP.outcome === "win") {
      const sets = randomDiceSets();
      nextP.green = sets.green;
      nextP.red = sets.red;
    }
    nextP.dice = [null, null];
    nextP.revealedDiceCount = 0;
    nextP.rollingDie = null;
    nextP.rollStartedAt = null;
    nextP.rollEndsAt = null;
    nextP.pendingDie = null;
    nextP.revealEndsAt = null;
    nextP.sum = null;
    nextP.outcome = null;
    nextP.awaitingDecision = false;
    return touch(next);
  }

  if (action.type === "cashOut" && p.awaitingDecision && (p.outcome === "win" || p.outcome === "neutral")) {
    const next = cloneState(state);
    const nextP = (next.miniState as DiceMiniState).players[playerId];
    payoutPlayer(next, playerId, nextP.multiplier, "cashed");
    nextP.done = true;
    nextP.awaitingDecision = false;
    nextP.revealEndsAt = null;
    touch(next);
    return maybeCompleteIndividualRound(next);
  }
  return state;
}

function settleHiLoFlip(next: CasinoState, playerId: string, now: number): void {
  const nextP = (next.miniState as HiLoMiniState).players[playerId];
  if (!nextP.flipping || nextP.pendingCard == null || nextP.pendingCorrect == null || nextP.pendingFactor == null) return;

  nextP.previousCard = nextP.currentCard;
  nextP.currentCard = nextP.pendingCard;
  nextP.lastCorrect = nextP.pendingCorrect;
  const correct = nextP.pendingCorrect;
  const factor = nextP.pendingFactor;
  nextP.pendingCard = null;
  nextP.pendingCorrect = null;
  nextP.pendingFactor = null;
  nextP.flipping = false;
  nextP.flipStartedAt = null;
  nextP.flipEndsAt = null;

  if (!correct) {
    nextP.done = true;
    nextP.awaitingDecision = false;
    nextP.revealEndsAt = now + 1_050;
    losePlayer(next, playerId);
    return;
  }

  nextP.streak += 1;
  nextP.multiplier = round2(nextP.multiplier * factor);
  nextP.awaitingDecision = true;
  if (nextP.streak >= HI_LO_MAX_STREAK) {
    payoutPlayer(next, playerId, nextP.multiplier, "won");
    nextP.done = true;
    nextP.awaitingDecision = false;
    nextP.revealEndsAt = now + 1_050;
  }
}

function handleHiLo(state: CasinoState, action: CasinoAction, playerId: string): CasinoState {
  const mini = state.miniState;
  if (!mini || mini.kind !== "hilo") return state;

  if (action.type === "tick") {
    const now = typeof action.now === "number" ? action.now : Date.now();
    let next: CasinoState | null = null;
    for (const id of state.expectedPlayers) {
      const source = (next?.miniState as HiLoMiniState | undefined)?.players[id] ?? mini.players[id];
      if (source?.flipping && source.flipEndsAt != null && now >= source.flipEndsAt) {
        if (!next) next = cloneState(state);
        settleHiLoFlip(next, id, now);
      }
      const latest = (next?.miniState as HiLoMiniState | undefined)?.players[id] ?? source;
      if (latest?.done && latest.revealEndsAt != null && now >= latest.revealEndsAt) {
        if (!next) next = cloneState(state);
        (next.miniState as HiLoMiniState).players[id].revealEndsAt = null;
      }
    }
    if (!next) return state;
    touch(next);
    const nextMini = next.miniState as HiLoMiniState;
    const allDoneAndRevealed = allPlayers(next, (id) => Boolean(nextMini.players[id]?.done) && nextMini.players[id]?.revealEndsAt == null);
    return allDoneAndRevealed ? maybeCompleteIndividualRound(next) : next;
  }

  const p = mini.players[playerId];
  if (!p || p.done || p.flipping) return state;

  if (action.type === "hiloGuess" && !p.awaitingDecision) {
    const factor = hiLoStepFactor(p.currentCard.rank, action.direction);
    if (factor == null) return state;
    const next = cloneState(state);
    const nextP = (next.miniState as HiLoMiniState).players[playerId];
    const nextCard = drawCard();
    const currentRank = nextP.currentCard.rank;
    const correct = action.direction === "higher" ? nextCard.rank > currentRank : nextCard.rank < currentRank;
    const tie = nextCard.rank === currentRank;
    const now = Date.now();
    nextP.lastDirection = action.direction;
    nextP.lastCorrect = null;
    nextP.awaitingDecision = false;
    nextP.flipping = true;
    nextP.flipStartedAt = now;
    // O cliente recebe a carta futura somente depois de a jogada estar
    // travada e usa esse tempo para fazer UMA virada: verso -> carta nova.
    nextP.flipEndsAt = now + 1_150;
    nextP.pendingCard = nextCard;
    nextP.pendingCorrect = correct && !tie;
    nextP.pendingFactor = factor;
    return touch(next);
  }

  if (action.type === "hiloContinue" && p.awaitingDecision && p.streak > 0) {
    const next = cloneState(state);
    const nextP = (next.miniState as HiLoMiniState).players[playerId];
    nextP.previousCard = null;
    nextP.lastDirection = null;
    nextP.lastCorrect = null;
    nextP.awaitingDecision = false;
    return touch(next);
  }

  if (action.type === "cashOut" && p.awaitingDecision && p.streak > 0) {
    const next = cloneState(state);
    const nextP = (next.miniState as HiLoMiniState).players[playerId];
    payoutPlayer(next, playerId, nextP.multiplier, "cashed");
    nextP.done = true;
    nextP.awaitingDecision = false;
    nextP.revealEndsAt = null;
    touch(next);
    return maybeCompleteIndividualRound(next);
  }
  return state;
}

function handleFortune(state: CasinoState, action: CasinoAction): CasinoState {
  const mini = state.miniState;
  if (!mini || mini.kind !== "fortune" || action.type !== "tick") return state;
  const now = typeof action.now === "number" ? action.now : Date.now();

  // O alvo é definido no nascimento da mesa e enviado ao cliente quando a
  // aposta já está travada. Assim a roda faz um único giro longo e termina
  // exatamente no setor sorteado. Não existe uma segunda animação corretiva.
  if (mini.revealedIndex == null && now >= mini.spinEndsAt && mini.resultIndex != null) {
    const next = cloneState(state);
    const nextMini = next.miniState as FortuneMiniState;
    const resultIndex = nextMini.resultIndex!;
    nextMini.revealedIndex = resultIndex;
    nextMini.settling = false;
    nextMini.settleEndsAt = null;
    const segment = FORTUNE_SEGMENTS[resultIndex];
    for (const id of next.expectedPlayers) {
      if (segment.multiplier > 0) payoutPlayer(next, id, segment.multiplier, segment.multiplier > 1 ? "won" : "cashed");
      else losePlayer(next, id);
    }
    touch(next);
    return completeRound(next, `A Roda da Fortuna parou em ${segment.label}.`);
  }
  return state;
}

function settleLastChance(next: CasinoState, playerId: string, now: number): CasinoState {
  const mini = next.miniState as LastChanceMiniState;
  const coin = mini.pendingCoinResults[playerId];
  const choice = mini.choices[playerId];
  if (!coin || !choice) return next;
  mini.spinning[playerId] = false;
  mini.spinStartedAt[playerId] = null;
  mini.spinEndsAt[playerId] = null;
  mini.pendingCoinResults[playerId] = null;
  mini.coinResults[playerId] = coin;
  const result: "revived" | "failed" = coin === choice ? "revived" : "failed";
  mini.results[playerId] = result;
  mini.revealEndsAt[playerId] = now + 1_300;
  next.players[playerId].lastChanceUsed = true;
  next.players[playerId].lastChanceResult = result;
  if (result === "revived") {
    next.players[playerId].balance = 500;
    next.players[playerId].roundDelta += 500;
  }
  return next;
}

function finishLastChanceIfReady(next: CasinoState): CasinoState {
  const mini = next.miniState as LastChanceMiniState;
  if (!mini.eligibleIds.every((id) => mini.results[id] != null && mini.revealEndsAt[id] == null)) return touch(next);
  const alive = next.expectedPlayers.filter((id) => (next.players[id]?.balance ?? 0) > 0);
  if (alive.length < next.expectedPlayers.length) {
    next.phase = "finished";
    next.finishedAt = Date.now();
    next.winnerId = alive.length === 1 ? alive[0] : null;
    next.finishReason = alive.length === 1 ? "bankruptcy" : "draw";
    next.message = alive.length === 1 ? "A última chance falhou. Falência definitiva." : "Os dois falharam na última chance.";
    return touch(next);
  }
  next.phase = "roundResult";
  next.roundReady = Object.fromEntries(next.expectedPlayers.map((id) => [id, false]));
  next.message = mini.eligibleIds.length === 2 ? "Os dois voltaram com 500 fichas!" : "Última chance acertada: de volta com 500 fichas!";
  return touch(next);
}

function handleLastChance(state: CasinoState, action: CasinoAction, playerId: string): CasinoState {
  const mini = state.miniState;
  if (state.phase !== "lastChance" || !mini || mini.kind !== "lastChance") return state;

  if (action.type === "tick") {
    const now = typeof action.now === "number" ? action.now : Date.now();
    let next: CasinoState | null = null;
    for (const id of mini.eligibleIds) {
      const source = (next?.miniState as LastChanceMiniState | undefined) ?? mini;
      if (source.spinning[id] && source.spinEndsAt[id] != null && now >= source.spinEndsAt[id]!) {
        if (!next) next = cloneState(state);
        settleLastChance(next, id, now);
      }
      const latest = (next?.miniState as LastChanceMiniState | undefined) ?? mini;
      if (latest.results[id] != null && latest.revealEndsAt[id] != null && now >= latest.revealEndsAt[id]!) {
        if (!next) next = cloneState(state);
        (next.miniState as LastChanceMiniState).revealEndsAt[id] = null;
      }
    }
    if (!next) return state;
    return finishLastChanceIfReady(next);
  }

  if (!mini.eligibleIds.includes(playerId) || mini.results[playerId] != null || mini.spinning[playerId]) return state;

  if (action.type === "lastChanceChoose") {
    if (action.side !== "dollar" && action.side !== "crown") return state;
    const next = cloneState(state);
    (next.miniState as LastChanceMiniState).choices[playerId] = action.side;
    next.message = "Escolha feita. Agora lance a moeda.";
    return touch(next);
  }

  if (action.type !== "lastChanceSpin" || !mini.choices[playerId]) return state;
  const next = cloneState(state);
  const nextMini = next.miniState as LastChanceMiniState;
  const now = Date.now();
  nextMini.spinning[playerId] = true;
  nextMini.spinStartedAt[playerId] = now;
  nextMini.spinEndsAt[playerId] = now + 2_050;
  nextMini.coinResults[playerId] = null;
  nextMini.pendingCoinResults[playerId] = Math.random() < 0.5 ? "dollar" : "crown";
  next.message = "A moeda da última chance está no ar...";
  return touch(next);
}

export class CasinoGame implements GameEngine<CasinoState, CasinoAction> {
  readonly id = "casino" as const;

  createInitialState(options?: Record<string, unknown>): CasinoState {
    const length = isValidCasinoLength(options?.difficulty) ? options!.difficulty as CasinoLength : "normal";
    const requestedMode: CasinoMode = options?.mode === "soloBot" ? "soloBot" : "duel";
    const rawIds = Array.isArray(options?.playerIds)
      ? (options!.playerIds as unknown[]).filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];
    const humanIds = rawIds.filter((id) => id !== CASINO_BOT_ID).slice(0, requestedMode === "soloBot" ? 1 : 2);
    const ids = requestedMode === "soloBot"
      ? [...humanIds, CASINO_BOT_ID].slice(0, 2)
      : humanIds.slice(0, 2);
    const now = Date.now();
    const players = Object.fromEntries(ids.map((id) => [id, basePlayer()]));
    return {
      mode: requestedMode,
      length,
      targetBalance: CASINO_LENGTH_TARGETS[length],
      startingBalance: START_BALANCE,
      expectedPlayers: ids,
      phase: "selecting",
      round: 1,
      offeredGames: pickOfferedGames(),
      chosenGame: null,
      players,
      miniState: null,
      roundReady: Object.fromEntries(ids.map((id) => [id, false])),
      history: [],
      message: requestedMode === "soloBot" ? "Escolha em segredo. O BOT também está avaliando as mesas." : "Escolham em segredo o próximo jogo.",
      startedAt: now,
      finishedAt: null,
      winnerId: null,
      finishReason: null,
      bot: requestedMode === "soloBot" ? createBotState(now) : null,
      revision: 1,
    };
  }

  private applyBotTick(state: CasinoState, now: number): CasinoState {
    if (state.mode !== "soloBot" || !state.bot || !state.players[CASINO_BOT_ID]) return state;

    const planned = ensureBotMiniPlan(state, now);
    if (planned !== state) return planned;

    const key = botDecisionKey(state, now);
    if (!key) return state;
    const bot = state.bot;
    if (bot.decisionKey !== key) {
      const next = cloneState(state);
      next.bot!.decisionKey = key;
      next.bot!.nextActionAt = now + botDecisionDelay(key);
      return touch(next);
    }
    if (now < bot.nextActionAt) return state;

    const action = botActionForState(state);
    if (!action) return state;
    const applied = this.applyAction(state, action, CASINO_BOT_ID);
    if (applied !== state && applied.bot) {
      applied.bot.decisionKey = null;
      applied.bot.nextActionAt = now + botDelay(350, 700);
    }
    return applied;
  }

  applyAction(state: CasinoState, action: CasinoAction, playerId: string): CasinoState {
    if (!state || state.phase === "finished" || !action || typeof action.type !== "string") return state;
    if (action.type !== "tick" && !isExpectedPlayer(state, playerId)) return state;

    if (action.type === "tick" && state.mode === "soloBot") {
      const now = typeof action.now === "number" ? action.now : Date.now();
      const botState = this.applyBotTick(state, now);
      if (botState !== state) return botState;
    }

    if (state.phase === "lastChance") return handleLastChance(state, action, playerId);

    if (state.phase === "selecting" && action.type === "vote" && isValidCasinoMiniGame(action.game)) {
      if (!state.offeredGames.includes(action.game) || state.players[playerId].vote) return state;
      const next = cloneState(state);
      next.players[playerId].vote = action.game;
      if (allPlayers(next, (id) => Boolean(next.players[id].vote))) {
        const votes = next.expectedPlayers.map((id) => next.players[id].vote!) as CasinoMiniGame[];
        next.chosenGame = votes.every((vote) => vote === votes[0]) ? votes[0] : votes[randomInt(votes.length)];
        next.phase = "betting";
        next.message = votes.every((vote) => vote === votes[0])
          ? "Escolha unânime! Façam suas apostas."
          : "Votos diferentes: o cassino sorteou entre as duas escolhas.";
      }
      return touch(next);
    }

    if (state.phase === "betting" && action.type === "lockBet") {
      const player = state.players[playerId];
      if (!player || player.betLocked || !Number.isFinite(action.amount)) return state;
      const amount = Math.floor(action.amount);
      const min = casinoMinimumBet(player.balance);
      if (amount < min || amount > player.balance) return state;
      const next = cloneState(state);
      const nextPlayer = next.players[playerId];
      nextPlayer.roundBet = amount;
      nextPlayer.betLocked = true;
      nextPlayer.roundStatus = "waiting";
      if (allPlayers(next, (id) => next.players[id].betLocked)) {
        for (const id of next.expectedPlayers) {
          const p = next.players[id];
          const bet = p.roundBet ?? 0;
          p.balance -= bet;
          p.roundDelta = -bet;
          p.totalWagered += bet;
          p.roundStatus = "playing";
        }
        next.phase = "playing";
        next.miniState = initialMiniState(next.chosenGame!, next.expectedPlayers, Date.now());
        next.message = null;
      }
      return touch(next);
    }

    if (state.phase === "playing") {
      const mini = state.miniState;
      if (!mini) return state;
      if (mini.kind === "mines") return handleMines(state, action, playerId);
      if (mini.kind === "crash") return handleCrash(state, action, playerId);
      if (mini.kind === "roulette") return handleRoulette(state, action, playerId);
      if (mini.kind === "slots") return handleSlots(state, action, playerId);
      if (mini.kind === "race") return handleRace(state, action, playerId);
      if (mini.kind === "dice") return handleDice(state, action, playerId);
      if (mini.kind === "hilo") return handleHiLo(state, action, playerId);
      if (mini.kind === "fortune") return handleFortune(state, action);
      if (mini.kind === "plinko") return handlePlinko(state, action, playerId);
      if (mini.kind === "briefcase") return handleBriefcase(state, action, playerId);
      return state;
    }

    if (state.phase === "roundResult" && action.type === "nextRound") {
      if (state.roundReady[playerId]) return state;
      const next = cloneState(state);
      next.roundReady[playerId] = true;
      if (allPlayers(next, (id) => next.roundReady[id])) {
        next.round += 1;
        next.phase = "selecting";
        next.offeredGames = pickOfferedGames();
        next.chosenGame = null;
        next.miniState = null;
        next.message = next.mode === "soloBot" ? "Nova rodada: você e o BOT receberam três mesas." : "Escolham em segredo o próximo jogo.";
        for (const id of next.expectedPlayers) resetRoundPlayer(next.players[id]);
        next.roundReady = Object.fromEntries(next.expectedPlayers.map((id) => [id, false]));
        if (next.bot) {
          next.bot.decisionKey = null;
          next.bot.nextActionAt = Date.now() + botDelay(650, 1_150);
          next.bot.plannedRound = 0;
          next.bot.plannedGame = null;
        }
      }
      return touch(next);
    }

    return state;
  }

  isSolved(state: CasinoState): boolean {
    return state.phase === "finished";
  }

  reset(state: CasinoState): CasinoState {
    const playerIds = state.mode === "soloBot"
      ? state.expectedPlayers.filter((id) => id !== CASINO_BOT_ID).slice(0, 1)
      : state.expectedPlayers;
    return this.createInitialState({ difficulty: state.length, mode: state.mode, playerIds });
  }
}

/**
 * Mascara tudo que ainda pode afetar uma decisão: bombas do Mines, ponto do
 * Crash, escolhas/apostas do rival e duração da corrida continuam secretos.
 * Alguns ALVOS VISUAIS (roleta, Fortuna, próprio dado/carta/slot) só são
 * enviados depois que a jogada correspondente já está irrevogavelmente
 * travada, permitindo uma animação única que termine exatamente no resultado.
 */
export function getCasinoStateForPlayer(state: CasinoState, playerId: string): CasinoState {
  const clone = structuredClone(state);
  // O plano interno do BOT (nível de risco, momento de agir e alvo de saque)
  // nunca faz parte da mesa pública. O cliente só vê as ações já realizadas.
  if (clone.mode === "soloBot" && playerId !== CASINO_BOT_ID) clone.bot = null;
  const bothVoted = clone.expectedPlayers.every((id) => Boolean(clone.players[id]?.vote));
  const bothBets = clone.expectedPlayers.every((id) => Boolean(clone.players[id]?.betLocked));
  for (const id of clone.expectedPlayers) {
    if (id !== playerId && !bothVoted) clone.players[id].vote = null;
    if (id !== playerId && !bothBets) clone.players[id].roundBet = null;
  }

  const mini = clone.miniState;
  if (!mini) return clone;
  if (mini.kind === "mines") {
    for (const [id, p] of Object.entries(mini.players)) {
      // As bombas nunca precisam sair do servidor. O jogador só recebe as
      // casas que ele mesmo abriu e se explodiu ou não.
      p.mineIndexes = [];
      if (id !== playerId) p.openedIndexes = [];
    }
  } else if (mini.kind === "crash") {
    if (!mini.crashed) mini.crashPoint = null;
  } else if (mini.kind === "roulette") {
    const allPicked = clone.expectedPlayers.every((id) => Boolean(mini.selections[id]));
    if (!allPicked) {
      for (const id of clone.expectedPlayers) if (id !== playerId) mini.selections[id] = null;
    }
    // Depois que as duas apostas estão fechadas, o número sorteado pode ser
    // enviado como ALVO VISUAL. Não existe mais nenhuma decisão que possa ser
    // alterada, e isso evita a antiga animação em duas etapas.
  } else if (mini.kind === "race") {
    const allPicked = clone.expectedPlayers.every((id) => Boolean(mini.picks[id]));
    if (!allPicked) {
      for (const id of clone.expectedPlayers) if (id !== playerId) mini.picks[id] = null;
    }
    mini.durationsMs = null;
    if (Object.values(mini.progress).every((value) => value < 100)) mini.winner = null;
  } else if (mini.kind === "slots") {
    for (const [id, p] of Object.entries(mini.players)) {
      // O próprio jogador pode receber a grade 3x3 já sorteada enquanto
      // as casas giram, exclusivamente para fazê-las parar no desenho certo.
      // O fator/pagamento continua oculto; o oponente não recebe os símbolos.
      if (p.spinning && id !== playerId) p.pendingSymbols = null;
      p.pendingFactor = null;
    }
  } else if (mini.kind === "dice") {
    for (const [id, p] of Object.entries(mini.players)) {
      // O valor futuro do dado só vai para o dono da jogada, que está travado
      // durante o lançamento. Assim o cubo pode girar e pousar na face correta.
      if (id !== playerId) p.pendingDie = null;
    }
  } else if (mini.kind === "hilo") {
    for (const [id, p] of Object.entries(mini.players)) {
      // A carta futura do próprio jogador alimenta a face traseira da MESMA
      // animação de flip. O acerto e o multiplicador permanecem secretos.
      if (id !== playerId) p.pendingCard = null;
      p.pendingCorrect = null;
      p.pendingFactor = null;
    }
  } else if (mini.kind === "plinko") {
    for (const [id, p] of Object.entries(mini.players)) {
      if (id !== playerId && p.dropping) {
        p.path = null;
        p.pendingBucket = null;
      }
    }
  } else if (mini.kind === "fortune") {
    // resultIndex é o alvo visual do giro único. Neste ponto as apostas já
    // estão fechadas, portanto não há ação que possa ser alterada com isso.
  } else if (mini.kind === "briefcase") {
    // O conteúdo de cada maleta só é revelado depois que alguém a abriu.
    // O BOT usa apenas openedBy para escolher e nunca consulta contents.
    mini.contents = mini.contents.map((value, index) => mini.openedBy[index] == null ? null : value);
  } else if (mini.kind === "lastChance") {
    for (const id of mini.eligibleIds) mini.pendingCoinResults[id] = null;
  }
  return clone;
}

export function casinoHiLoChoiceMultiplier(rank: number, direction: "higher" | "lower"): number | null {
  return hiLoStepFactor(rank, direction);
}
