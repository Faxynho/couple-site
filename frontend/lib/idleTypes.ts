export type IdleModeId = "farm" | "kitty";
export type GameEnvironment = "real" | "dev";
export type IdleEventType = "money" | "production2" | "click2" | "click3" | "click5" | "click10";

export interface IdleItemDefinition {
  id: string; name: string; asset: string; baseCost: number; upgradeBaseCost: number;
  baseProduction: number; costGrowth: number; productionGrowth: number; unlockOrder: number; scene: 0 | 1 | 2;
}
export interface IdleItemStatistics { passiveEarned: number; clickEarned: number; clicks: number; largestClick: number }
export interface IdleUpgradeQuote { count: number; totalCost: number }
export interface IdleItemSnapshot {
  purchased: boolean; level: number; purchasedAt: number | null; definition: IdleItemDefinition;
  production: number; nextCost: number; unlocked: boolean;
  upgradeQuotes: { one: IdleUpgradeQuote; ten: IdleUpgradeQuote; max: IdleUpgradeQuote | null };
  statistics: IdleItemStatistics;
}
export interface IdleAchievementSnapshot {
  id: string; mode: IdleModeId; title: string; description: string; iconItemId?: string; reward: number;
  completedAt: number | null; progress: number; target: number;
}
export interface IdleBoostState { startedAt: number; expiresAt: number; multiplier: number }
export interface IdleActiveEvent { id: string; type: IdleEventType; spawnedAt: number; expiresAt: number }
export interface IdleEventCounters { money: number; production2: number; click2: number; click3: number; click5: number; click10: number }
export interface IdleModeStatistics {
  migrationStartedAt: number; todayKey: string; earnedToday: number; passiveEarned: number; clickEarned: number; eventEarned: number;
  offlineEarned: number; activeTimeMs: number; eventsCollected: number; boostsCollected: number;
  eventCounters: IdleEventCounters; largestClick: number; highestProduction: number;
  items: Record<string, IdleItemStatistics>;
}
export interface IdleModeSnapshot {
  id: IdleModeId; balance: number; totalEarned: number; totalProduction: number; effectiveProduction: number;
  clickMultiplier: number; totalUpgrades: number; visits: number; totalClicks: number; lastSettledAt: number;
  items: IdleItemSnapshot[]; achievements: IdleAchievementSnapshot[];
  scenes: Array<{ id: 0 | 1 | 2; name: string; unlocked: boolean }>;
  statistics: IdleModeStatistics; activeEvent: IdleActiveEvent | null;
  productionBoost: IdleBoostState | null; clickBoost: IdleBoostState | null;
}
export interface RenewableObjectiveSnapshot {
  id: string; period: "daily" | "weekly"; title: string; description: string; metric: string;
  target: number; reward: number; progress: number; completedAt: number | null; periodKey: string;
}
export interface IdleSnapshot {
  revision: number; environment: GameEnvironment; areaName: string; globalCoins: number; globalLifetimeEarned: number;
  purchasedPetDecorations: string[]; updatedAt: number;
  offlineReward: { mode: IdleModeId; amount: number; elapsedMs: number } | null;
  modes: Record<IdleModeId, IdleModeSnapshot>;
  objectives: { daily: RenewableObjectiveSnapshot[]; weekly: RenewableObjectiveSnapshot[] };
}
