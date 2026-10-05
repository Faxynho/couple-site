import { AchievementDefinition, IdleEventType, IdleItemDefinition, IdleModeId, RenewableObjectiveDefinition } from "./idleConfig";
import type { KittyDevState } from "./kittyDevConfig";

export type GameEnvironment = "real" | "dev";

export interface IdleOwnedItem {
  purchased: boolean;
  level: number;
  purchasedAt: number | null;
}

export interface IdleItemStatistics {
  passiveEarned: number;
  clickEarned: number;
  clicks: number;
  largestClick: number;
}

export interface IdleBoostState {
  startedAt: number;
  expiresAt: number;
  multiplier: number;
}

export interface IdleClickBoostState extends IdleBoostState {
  visualMultiplier: number;
  sources: IdleBoostState[];
}

export interface IdleActiveEvent {
  id: string;
  type: IdleEventType;
  spawnedAt: number;
  expiresAt: number;
}

export interface IdleEventCounters {
  money: number;
  production2: number;
  click2: number;
  click3: number;
  click5: number;
  click10: number;
}

export interface IdleModeStatistics {
  migrationStartedAt: number;
  todayKey: string;
  earnedToday: number;
  passiveEarned: number;
  clickEarned: number;
  eventEarned: number;
  offlineEarned: number;
  activeTimeMs: number;
  eventsCollected: number;
  boostsCollected: number;
  eventCounters: IdleEventCounters;
  largestClick: number;
  highestProduction: number;
  items: Record<string, IdleItemStatistics>;
}

export interface IdleModeState {
  kittyCatalogVersion?: number;
  balance: number;
  totalEarned: number;
  totalUpgrades: number;
  visits: number;
  totalClicks: number;
  lastSettledAt: number;
  items: Record<string, IdleOwnedItem>;
  relicLevels?: Record<string, number>;
  clickActivity?: Record<string, KittyClickActivity>;
  /** Mecânicas experimentais (estrelas, itens, despertar, pedras). Existe SOMENTE no save do ambiente DEV. */
  dev?: KittyDevState;
  unlockedAchievements: Record<string, number>;
  statistics: IdleModeStatistics;
  activeEvent: IdleActiveEvent | null;
  productionBoost: IdleBoostState | null;
  clickBoost: IdleClickBoostState | null;
  eventActivityMs: number;
  nextEventAtActivityMs: number;
}

export interface KittyClickActivity {
  streak: number;
  comboClicks: number;
  lastClickAt: number;
  bestStreak: number;
  milestoneCount: number;
}

export interface KittyRelicSnapshot {
  definition: import("./idleConfig").KittyRelicDefinition;
  level: number;
  multiplier: number;
  nextCost: number | null;
  unlocked: boolean;
}

export type ObjectiveMetric =
  | "farmEntries"
  | "kittyEntries"
  | "farmUpgrades"
  | "kittyUpgrades"
  | "farmEarnings"
  | "kittyEarnings"
  | "minigames"
  | "kittyClicks"
  | "kittyEvents"
  | "kittyBoosts"
  | "kittyBestCombo"
  | "kittyMilestones"
  | "kittyDays";

/** Missões sorteadas do Mundo da Hello Kitty para o período (e metas calculadas na hora do sorteio). */
export interface KittyPeriodSelection {
  ids: string[];
  targets: Record<string, number>;
}

export interface ObjectivePeriodState {
  key: string;
  progress: Record<ObjectiveMetric, number>;
  completed: Record<string, number>;
  kitty?: KittyPeriodSelection;
}

export interface IdleStoredData {
  schemaVersion: number;
  revision: number;
  globalCoins: number;
  globalLifetimeEarned: number;
  modes: Record<IdleModeId, IdleModeState>;
  objectives: { daily: ObjectivePeriodState; weekly: ObjectivePeriodState };
  rewardedMatches: string[];
  purchasedPetDecorations: string[];
  updatedAt: number;
}

export interface IdleUpgradeQuote {
  count: number;
  totalCost: number;
}

export interface IdleItemSnapshot extends IdleOwnedItem {
  definition: IdleItemDefinition;
  production: number;
  nextCost: number;
  unlocked: boolean;
  upgradeQuotes: { one: IdleUpgradeQuote; ten: IdleUpgradeQuote; max: IdleUpgradeQuote | null };
  statistics: IdleItemStatistics;
}

export interface KittyDevItemSnapshot {
  name: string;
  level: number;
  maxLevel: number;
  /** Preço da próxima compra/melhoria; null no nível máximo. */
  nextCost: number | null;
  /** Multiplicador atual (clique) ou das pedras por marco (estelar). */
  multiplier: number;
  /** Multiplicador no próximo nível; null no nível máximo. */
  nextMultiplier: number | null;
}

export interface KittyDevCharacterSnapshot {
  id: string;
  index: number;
  /** Mundo/ilha (0–6) onde o personagem mora. */
  world: number;
  owned: boolean;
  level: number;
  stars: number;
  nextStarCost: number | null;
  /** Custo de cada um dos 5 níveis da constelação. */
  starCosts: number[];
  /** Nível mínimo do personagem para cada um dos 5 níveis da constelação. */
  starRequirements: number[];
  nextStarBonus: string | null;
  starBonuses: string[];
  clickItem: KittyDevItemSnapshot;
  stoneItem: KittyDevItemSnapshot;
  /** Pedras base por marco de 10 níveis (antes do item). */
  stoneYield: number;
  /** Pedras por marco já com o item estelar. */
  stoneYieldEffective: number;
  nextMilestoneLevel: number;
  /** Multiplicadores combinados (estrelas + despertar) já embutidos em `production` do item. */
  productionMultiplier: number;
  clickMultiplier: number;
  awakening: { cost: number; multiplier: number; asset: string; awakened: boolean; unlocked: boolean } | null;
}

export interface KittyDevSnapshot {
  stones: number;
  totalStones: number;
  lastWorld: number | null;
  characters: Record<string, KittyDevCharacterSnapshot>;
}

export interface IdleModeSnapshot {
  id: IdleModeId;
  balance: number;
  totalEarned: number;
  totalProduction: number;
  effectiveProduction: number;
  clickMultiplier: number;
  totalUpgrades: number;
  visits: number;
  totalClicks: number;
  lastSettledAt: number;
  items: IdleItemSnapshot[];
  relics?: KittyRelicSnapshot[];
  clickActivity?: Record<string, KittyClickActivity>;
  /** Presente somente no ambiente DEV do Mundo da Hello Kitty. */
  kittyDev?: KittyDevSnapshot;
  achievements: Array<AchievementDefinition & { completedAt: number | null; progress: number; target: number }>;
  scenes: Array<{ id: number; name: string; unlocked: boolean }>;
  statistics: IdleModeStatistics;
  activeEvent: IdleActiveEvent | null;
  productionBoost: IdleBoostState | null;
  clickBoost: IdleBoostState | null;
}

export interface RenewableObjectiveSnapshot extends RenewableObjectiveDefinition {
  progress: number;
  completedAt: number | null;
  periodKey: string;
  /** Instante (ms) em que o período termina e a missão renova (meia-noite de Brasília / segunda-feira). */
  periodEndsAt: number;
}

export interface IdleSnapshot {
  revision: number;
  environment: GameEnvironment;
  areaName: string;
  globalCoins: number;
  globalLifetimeEarned: number;
  purchasedPetDecorations: string[];
  updatedAt: number;
  offlineReward: { mode: IdleModeId; amount: number; elapsedMs: number } | null;
  modes: Record<IdleModeId, IdleModeSnapshot>;
  objectives: { daily: RenewableObjectiveSnapshot[]; weekly: RenewableObjectiveSnapshot[] };
  /** Missões sorteadas exibidas no Mundo da Hello Kitty (4 diárias e 3 semanais). */
  kittyObjectives: { daily: RenewableObjectiveSnapshot[]; weekly: RenewableObjectiveSnapshot[] };
}
