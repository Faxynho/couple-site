import { AchievementDefinition, IdleItemDefinition, IdleModeId, RenewableObjectiveDefinition } from "./idleConfig";

export interface IdleOwnedItem {
  purchased: boolean;
  level: number;
  purchasedAt: number | null;
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
  updatedAt: number;
}

export interface IdleItemSnapshot extends IdleOwnedItem {
  definition: IdleItemDefinition;
  production: number;
  nextCost: number;
  unlocked: boolean;
}

export interface IdleModeSnapshot {
  id: IdleModeId;
  balance: number;
  totalEarned: number;
  totalProduction: number;
  totalUpgrades: number;
  visits: number;
  totalClicks: number;
  lastSettledAt: number;
  items: IdleItemSnapshot[];
  achievements: Array<AchievementDefinition & { completedAt: number | null; progress: number; target: number }>;
  scenes: Array<{ id: 0 | 1 | 2; unlocked: boolean }>;
}

export interface RenewableObjectiveSnapshot extends RenewableObjectiveDefinition {
  progress: number;
  completedAt: number | null;
  periodKey: string;
}

export interface IdleSnapshot {
  revision: number;
  areaName: string;
  globalCoins: number;
  globalLifetimeEarned: number;
  updatedAt: number;
  offlineReward: { mode: IdleModeId; amount: number; elapsedMs: number } | null;
  modes: Record<IdleModeId, IdleModeSnapshot>;
  objectives: { daily: RenewableObjectiveSnapshot[]; weekly: RenewableObjectiveSnapshot[] };
}
