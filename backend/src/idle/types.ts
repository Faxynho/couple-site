import { AchievementDefinition, IdleEventType, IdleItemDefinition, IdleModeId, RenewableObjectiveDefinition } from "./idleConfig";

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
  balance: number;
  totalEarned: number;
  totalUpgrades: number;
  visits: number;
  totalClicks: number;
  lastSettledAt: number;
  items: Record<string, IdleOwnedItem>;
  unlockedAchievements: Record<string, number>;
  statistics: IdleModeStatistics;
  activeEvent: IdleActiveEvent | null;
  productionBoost: IdleBoostState | null;
  clickBoost: IdleClickBoostState | null;
  eventActivityMs: number;
  nextEventAtActivityMs: number;
}

export type ObjectiveMetric =
  | "farmEntries"
  | "kittyEntries"
  | "farmUpgrades"
  | "kittyUpgrades"
  | "farmEarnings"
  | "kittyEarnings"
  | "minigames";

export interface ObjectivePeriodState {
  key: string;
  progress: Record<ObjectiveMetric, number>;
  completed: Record<string, number>;
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
  achievements: Array<AchievementDefinition & { completedAt: number | null; progress: number; target: number }>;
  scenes: Array<{ id: 0 | 1 | 2; name: string; unlocked: boolean }>;
  statistics: IdleModeStatistics;
  activeEvent: IdleActiveEvent | null;
  productionBoost: IdleBoostState | null;
  clickBoost: IdleBoostState | null;
}

export interface RenewableObjectiveSnapshot extends RenewableObjectiveDefinition {
  progress: number;
  completedAt: number | null;
  periodKey: string;
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
}
