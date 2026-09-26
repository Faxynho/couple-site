export type IdleModeId = "farm" | "kitty";

export interface IdleItemDefinition {
  id: string;
  name: string;
  asset: string;
  baseCost: number;
  upgradeBaseCost: number;
  baseProduction: number;
  costGrowth: number;
  productionGrowth: number;
  unlockOrder: number;
  scene: 0 | 1 | 2;
}

export interface IdleItemSnapshot {
  purchased: boolean;
  level: number;
  purchasedAt: number | null;
  definition: IdleItemDefinition;
  production: number;
  nextCost: number;
  unlocked: boolean;
}

export interface IdleAchievementSnapshot {
  id: string;
  mode: IdleModeId;
  title: string;
  description: string;
  iconItemId?: string;
  reward: number;
  completedAt: number | null;
  progress: number;
  target: number;
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
  achievements: IdleAchievementSnapshot[];
  scenes: Array<{ id: 0 | 1 | 2; name: string; unlocked: boolean }>;
}

export interface RenewableObjectiveSnapshot {
  id: string;
  period: "daily" | "weekly";
  title: string;
  description: string;
  metric: string;
  target: number;
  reward: number;
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
