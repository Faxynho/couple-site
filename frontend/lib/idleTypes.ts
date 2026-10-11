export type IdleModeId = "farm" | "kitty";
export type GameEnvironment = "real" | "dev";
export type IdleEventType = "money" | "production2" | "click2" | "click3" | "click5" | "click10";

export interface IdleItemDefinition {
  id: string; name: string; asset: string; baseCost: number; upgradeBaseCost: number;
  baseProduction: number; costGrowth: number; productionGrowth: number; unlockOrder: number; scene: number; clickShare?: number;
}
export interface IdleItemStatistics { passiveEarned: number; clickEarned: number; clicks: number; largestClick: number }
export interface IdleUpgradeQuote { count: number; totalCost: number }
export interface IdleItemSnapshot {
  purchased: boolean; level: number; purchasedAt: number | null; definition: IdleItemDefinition;
  production: number; nextCost: number; unlocked: boolean;
  upgradeQuotes: { one: IdleUpgradeQuote; ten: IdleUpgradeQuote; max: IdleUpgradeQuote | null };
  statistics: IdleItemStatistics;
}
export interface KittyRelicDefinition {
  id: string; name: string; asset: string; kind: "scene" | "click" | "global";
  scene?: number; unlockOrder: number; baseCost: number; maxLevel: number; description: string;
}
export interface KittyRelicSnapshot {
  definition: KittyRelicDefinition; level: number; multiplier: number; nextCost: number | null; unlocked: boolean;
}
export interface KittyClickActivity {
  streak: number; comboClicks: number; lastClickAt: number; bestStreak: number; milestoneCount: number;
}
export interface IdleAchievementSnapshot {
  id: string; mode: IdleModeId; title: string; description: string; iconItemId?: string; iconAsset?: string; reward: number;
  completedAt: number | null; progress: number; target: number;
}
export interface IdleBoostState { startedAt: number; expiresAt: number; multiplier: number }
export interface IdleClickBoostState extends IdleBoostState { visualMultiplier: number; sources: IdleBoostState[] }
export interface IdleActiveEvent { id: string; type: IdleEventType; spawnedAt: number; expiresAt: number }
export interface IdleEventCounters { money: number; production2: number; click2: number; click3: number; click5: number; click10: number }
export interface IdleModeStatistics {
  migrationStartedAt: number; todayKey: string; earnedToday: number; passiveEarned: number; clickEarned: number; eventEarned: number;
  offlineEarned: number; activeTimeMs: number; eventsCollected: number; boostsCollected: number;
  eventCounters: IdleEventCounters; largestClick: number; highestProduction: number;
  items: Record<string, IdleItemStatistics>;
}
export interface KittyDevItemSnapshot {
  name: string; level: number; maxLevel: number; nextCost: number | null; multiplier: number; nextMultiplier: number | null;
}
export interface KittyDevCharacterSnapshot {
  id: string; index: number; world: number; owned: boolean; level: number; stars: number;
  nextStarCost: number | null; starCosts: number[]; starRequirements: number[]; nextStarBonus: string | null; starBonuses: string[];
  clickItem: KittyDevItemSnapshot; stoneItem: KittyDevItemSnapshot;
  stoneYield: number; stoneYieldEffective: number; nextMilestoneLevel: number;
  productionMultiplier: number; clickMultiplier: number;
  awakening: { cost: number; bonus: number; asset: string; hasOwnSprite: boolean; awakened: boolean; unlocked: boolean; lockedReason: string | null; skinAwake: boolean } | null;
}
/** Mecânicas experimentais do Mundo da Hello Kitty. Só existe no ambiente DEV. */
export interface KittyDevSnapshot {
  stones: number; totalStones: number; lastWorld: number | null; days: number;
  characters: Record<string, KittyDevCharacterSnapshot>;
}
export interface IdleModeSnapshot {
  id: IdleModeId; balance: number; totalEarned: number; totalProduction: number; effectiveProduction: number;
  clickMultiplier: number; totalUpgrades: number; visits: number; totalClicks: number; lastSettledAt: number;
  items: IdleItemSnapshot[]; achievements: IdleAchievementSnapshot[];
  relics?: KittyRelicSnapshot[]; clickActivity?: Record<string, KittyClickActivity>;
  /** Presente somente no ambiente DEV do Mundo da Hello Kitty. */
  kittyDev?: KittyDevSnapshot;
  scenes: Array<{ id: number; name: string; unlocked: boolean }>;
  statistics: IdleModeStatistics; activeEvent: IdleActiveEvent | null;
  productionBoost: IdleBoostState | null; clickBoost: IdleClickBoostState | null;
}
export interface RenewableObjectiveSnapshot {
  id: string; period: "daily" | "weekly"; title: string; description: string; metric: string;
  target: number; reward: number; progress: number; completedAt: number | null; periodKey: string;
  /** Quando o período termina e a missão renova (ms). Ausente em respostas de servidores antigos. */
  periodEndsAt?: number;
}
export interface IdleSnapshot {
  revision: number; environment: GameEnvironment; experimentalFeatures?: string[]; areaName: string; globalCoins: number; globalLifetimeEarned: number;
  purchasedPetDecorations: string[]; updatedAt: number;
  offlineReward: { mode: IdleModeId; amount: number; elapsedMs: number } | null;
  modes: Record<IdleModeId, IdleModeSnapshot>;
  objectives: { daily: RenewableObjectiveSnapshot[]; weekly: RenewableObjectiveSnapshot[] };
  /** Missões sorteadas do Mundo da Hello Kitty (4 diárias e 3 semanais). Ausente em servidores antigos. */
  kittyObjectives?: { daily: RenewableObjectiveSnapshot[]; weekly: RenewableObjectiveSnapshot[] };
}
