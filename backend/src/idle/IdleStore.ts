import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  ACHIEVEMENTS,
  CLICK_BOOST_DURATIONS,
  IDLE_AREA_NAME,
  IDLE_CATALOG,
  IDLE_EVENT_MAX_ACTIVITY_MS,
  IDLE_EVENT_MIN_ACTIVITY_MS,
  IDLE_EVENT_VISIBLE_MS,
  IDLE_EVENT_WEIGHTS,
  IDLE_SCENES,
  KITTY_RELICS,
  IdleEventType,
  IdleModeId,
  MAX_IDLE_MONEY,
  OFFLINE_CAP_MS,
  PRODUCTION_BOOST_MS,
  RENEWABLE_OBJECTIVES,
  itemClickReward,
  itemProduction,
  itemUpgradeCost,
  kittyRelicCost,
} from "./idleConfig";
import {
  GameEnvironment,
  IdleActiveEvent,
  IdleClickBoostState,
  IdleItemStatistics,
  IdleModeSnapshot,
  IdleModeState,
  IdleModeStatistics,
  IdleOwnedItem,
  IdleSnapshot,
  IdleStoredData,
  ObjectiveMetric,
  ObjectivePeriodState,
} from "./types";
import { PET_DECORATION_IDS, PET_DECORATION_PRICES, PetDecorationId } from "../pets/petEconomy";

const DEFAULT_DATA_FILE = path.join(__dirname, "..", "..", "data", "idle-game.json");
const DEFAULT_DEV_DATA_FILE = path.join(__dirname, "..", "..", "data", "idle-game-dev.json");
const SAVE_DEBOUNCE_MS = 350;
const MAX_REWARDED_MATCHES = 1_000;
const CURRENT_SCHEMA_VERSION = 6;
const LEGACY_KITTY_ORDER = ["hello-kitty", "my-melody", "cinnamoroll", "pompompurin", "kuromi", "keroppi", "badtz-maru", "chococat", "pochacco", "little-twin-stars"];
const CLICK_COOLDOWN_MS = 125;
const MAX_BATCH_LEVELS = 10_000;
const INITIAL_BALANCE: Record<IdleModeId, number> = {
  farm: IDLE_CATALOG.farm[0].baseCost,
  kitty: IDLE_CATALOG.kitty[0].baseCost,
};
const ALL_METRICS: ObjectiveMetric[] = [
  "farmEntries", "kittyEntries", "farmUpgrades", "kittyUpgrades",
  "farmEarnings", "kittyEarnings", "minigames",
];

function safeMoney(value: number): number {
  if (!Number.isFinite(value)) return MAX_IDLE_MONEY;
  return Math.max(0, Math.min(MAX_IDLE_MONEY, Math.round(value * 1_000) / 1_000));
}

function safeCount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
}

function emptyProgress(): Record<ObjectiveMetric, number> {
  return { farmEntries: 0, kittyEntries: 0, farmUpgrades: 0, kittyUpgrades: 0, farmEarnings: 0, kittyEarnings: 0, minigames: 0 };
}

function zonedDateParts(now: number): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(now));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function dailyKey(now: number): string {
  const { year, month, day } = zonedDateParts(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function weeklyKey(now: number): string {
  const { year, month, day } = zonedDateParts(now);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekDay = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekDay);
  const weekYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

function nextEventDelay(): number {
  return Math.round(IDLE_EVENT_MIN_ACTIVITY_MS + Math.random() * (IDLE_EVENT_MAX_ACTIVITY_MS - IDLE_EVENT_MIN_ACTIVITY_MS));
}

function newPeriod(key: string): ObjectivePeriodState {
  return { key, progress: emptyProgress(), completed: {} };
}

function emptyItemStatistics(): IdleItemStatistics {
  return { passiveEarned: 0, clickEarned: 0, clicks: 0, largestClick: 0 };
}

function newStatistics(mode: IdleModeId, now: number): IdleModeStatistics {
  return {
    migrationStartedAt: now,
    todayKey: dailyKey(now),
    earnedToday: 0,
    passiveEarned: 0,
    clickEarned: 0,
    eventEarned: 0,
    offlineEarned: 0,
    activeTimeMs: 0,
    eventsCollected: 0,
    boostsCollected: 0,
    eventCounters: { money: 0, production2: 0, click2: 0, click3: 0, click5: 0, click10: 0 },
    largestClick: 0,
    highestProduction: 0,
    items: Object.fromEntries(IDLE_CATALOG[mode].map((item) => [item.id, emptyItemStatistics()])),
  };
}

function newMode(mode: IdleModeId, now: number): IdleModeState {
  const items: Record<string, IdleOwnedItem> = Object.fromEntries(
    IDLE_CATALOG[mode].map((item) => [item.id, { purchased: false, level: 0, purchasedAt: null }]),
  );
  return {
    kittyCatalogVersion: mode === "kitty" ? 2 : undefined,
    balance: INITIAL_BALANCE[mode],
    totalEarned: 0,
    totalUpgrades: 0,
    visits: 0,
    totalClicks: 0,
    lastSettledAt: now,
    items,
    ...(mode === "kitty" ? { relicLevels: {}, clickActivity: {} } : {}),
    unlockedAchievements: {},
    statistics: newStatistics(mode, now),
    activeEvent: null,
    productionBoost: null,
    clickBoost: null,
    eventActivityMs: 0,
    nextEventAtActivityMs: nextEventDelay(),
  };
}

function emptyData(now: number): IdleStoredData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    revision: 0,
    globalCoins: 0,
    globalLifetimeEarned: 0,
    modes: { farm: newMode("farm", now), kitty: newMode("kitty", now) },
    objectives: { daily: newPeriod(dailyKey(now)), weekly: newPeriod(weeklyKey(now)) },
    rewardedMatches: [],
    purchasedPetDecorations: [],
    updatedAt: now,
  };
}

function sanitizeItemStatistics(value: unknown): IdleItemStatistics {
  const input = value && typeof value === "object" ? value as Partial<IdleItemStatistics> : {};
  return {
    passiveEarned: safeMoney(Number(input.passiveEarned ?? 0)),
    clickEarned: safeMoney(Number(input.clickEarned ?? 0)),
    clicks: safeCount(input.clicks),
    largestClick: safeMoney(Number(input.largestClick ?? 0)),
  };
}

function sanitizeStatistics(mode: IdleModeId, value: unknown, now: number): IdleModeStatistics {
  const base = newStatistics(mode, now);
  if (!value || typeof value !== "object") return base;
  const input = value as Partial<IdleModeStatistics>;
  const key = typeof input.todayKey === "string" ? input.todayKey : dailyKey(now);
  base.migrationStartedAt = Number.isFinite(input.migrationStartedAt) ? Number(input.migrationStartedAt) : now;
  base.todayKey = key;
  base.earnedToday = key === dailyKey(now) ? safeMoney(Number(input.earnedToday ?? 0)) : 0;
  base.passiveEarned = safeMoney(Number(input.passiveEarned ?? 0));
  base.clickEarned = safeMoney(Number(input.clickEarned ?? 0));
  base.eventEarned = safeMoney(Number(input.eventEarned ?? 0));
  base.offlineEarned = safeMoney(Number(input.offlineEarned ?? 0));
  base.activeTimeMs = safeCount(input.activeTimeMs);
  base.eventsCollected = safeCount(input.eventsCollected);
  base.boostsCollected = safeCount(input.boostsCollected);
  base.largestClick = safeMoney(Number(input.largestClick ?? 0));
  base.highestProduction = safeMoney(Number(input.highestProduction ?? 0));
  for (const type of Object.keys(base.eventCounters) as IdleEventType[]) {
    base.eventCounters[type] = safeCount(input.eventCounters?.[type]);
  }
  for (const item of IDLE_CATALOG[mode]) base.items[item.id] = sanitizeItemStatistics(input.items?.[item.id]);
  return base;
}

function sanitizeEvent(value: unknown, now: number): IdleActiveEvent | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<IdleActiveEvent>;
  if (!IDLE_EVENT_WEIGHTS.some((entry) => entry.type === input.type)) return null;
  if (typeof input.id !== "string" || !Number.isFinite(input.spawnedAt) || !Number.isFinite(input.expiresAt)) return null;
  return Number(input.expiresAt) > now ? { id: input.id, type: input.type!, spawnedAt: Number(input.spawnedAt), expiresAt: Number(input.expiresAt) } : null;
}

function sanitizeBoost(value: unknown, now: number) {
  if (!value || typeof value !== "object") return null;
  const input = value as { startedAt?: unknown; expiresAt?: unknown; multiplier?: unknown };
  const expiresAt = Number(input.expiresAt);
  const startedAt = Number(input.startedAt);
  const multiplier = Number(input.multiplier);
  if (![2, 3, 5, 10].includes(multiplier) || !Number.isFinite(startedAt) || !Number.isFinite(expiresAt) || expiresAt <= now) return null;
  return { startedAt, expiresAt, multiplier };
}

function aggregateClickBoost(sources: Array<{ startedAt: number; expiresAt: number; multiplier: number }>, now: number): IdleClickBoostState | null {
  const active = sources.filter((source) => source.expiresAt > now && [2, 3, 5, 10].includes(source.multiplier));
  if (!active.length) return null;
  return {
    startedAt: Math.min(...active.map((source) => source.startedAt)),
    expiresAt: Math.max(...active.map((source) => source.expiresAt)),
    multiplier: active.reduce((sum, source) => sum + source.multiplier, 0),
    visualMultiplier: Math.max(...active.map((source) => source.multiplier)),
    sources: active.map((source) => ({ ...source })),
  };
}

function sanitizeClickBoost(value: unknown, now: number): IdleClickBoostState | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<IdleClickBoostState>;
  const rawSources = Array.isArray(input.sources) && input.sources.length ? input.sources : [value];
  const sources = rawSources
    .map((source) => sanitizeBoost(source, now))
    .filter((source): source is NonNullable<ReturnType<typeof sanitizeBoost>> => Boolean(source));
  return aggregateClickBoost(sources, now);
}

function sanitizeMode(mode: IdleModeId, value: unknown, now: number): IdleModeState {
  const base = newMode(mode, now);
  if (!value || typeof value !== "object") return base;
  const input = value as Partial<IdleModeState>;
  // Saves from the ten-character catalog keep their ordinal progression. Copy before
  // reading: several old IDs also occur in different positions in the new catalog.
  const legacy = mode === "kitty" && input.kittyCatalogVersion !== 2;
  const previousItems = input.items;
  const previousStats = input.statistics?.items;
  const migratedItems = legacy ? Object.fromEntries(IDLE_CATALOG.kitty.slice(0, 10).map((item, index) => [item.id, previousItems?.[LEGACY_KITTY_ORDER[index]]])) : previousItems;
  const migratedStats = legacy ? Object.fromEntries(IDLE_CATALOG.kitty.slice(0, 10).map((item, index) => [item.id, previousStats?.[LEGACY_KITTY_ORDER[index]]])) : previousStats;
  base.balance = safeMoney(Number(input.balance ?? base.balance));
  base.totalEarned = safeMoney(Number(input.totalEarned ?? 0));
  base.totalUpgrades = safeCount(input.totalUpgrades);
  base.visits = safeCount(input.visits);
  base.totalClicks = safeCount(input.totalClicks);
  const savedAt = Number(input.lastSettledAt);
  base.lastSettledAt = Number.isFinite(savedAt) ? Math.min(now, Math.max(0, savedAt)) : now;
  for (const definition of IDLE_CATALOG[mode]) {
    const saved = migratedItems?.[definition.id];
    if (!saved || typeof saved !== "object") continue;
    const purchased = Boolean(saved.purchased);
    base.items[definition.id] = {
      purchased,
      level: purchased ? Math.max(1, Math.min(10_000, Math.floor(Number(saved.level) || 1))) : 0,
      purchasedAt: purchased && Number.isFinite(saved.purchasedAt) ? Number(saved.purchasedAt) : null,
    };
  }
  if (input.unlockedAchievements && typeof input.unlockedAchievements === "object") {
    for (const definition of ACHIEVEMENTS.filter((item) => item.mode === mode)) {
      const at = definition.id === "kitty-all" && legacy ? NaN : Number(input.unlockedAchievements[definition.id]);
      if (Number.isFinite(at) && at > 0) base.unlockedAchievements[definition.id] = at;
    }
  }
  if (legacy) {
    IDLE_CATALOG.kitty.slice(0, 10).forEach((item, index) => {
      const owned = base.items[item.id];
      if (owned.purchased) base.unlockedAchievements[index === 0 ? "kitty-first" : `kitty-character-${index + 1}`] = owned.purchasedAt || now;
    });
  }
  base.statistics = sanitizeStatistics(mode, { ...input.statistics, items: migratedStats }, now);
  if (mode === "kitty") {
    base.relicLevels = Object.fromEntries(KITTY_RELICS.map((relic) => [relic.id, Math.max(0, Math.min(relic.maxLevel, safeCount(input.relicLevels?.[relic.id])))]));
    base.clickActivity = {};
    for (const account of ["andre", "flavia"]) {
      const saved = input.clickActivity?.[account];
      if (!saved || typeof saved !== "object") continue;
      const lastClickAt = Number(saved.lastClickAt);
      base.clickActivity[account] = {
        streak: Number.isFinite(lastClickAt) && now - lastClickAt < 5_000 ? Math.min(100_000, safeCount(saved.streak)) : 0,
        comboClicks: Number.isFinite(lastClickAt) && now - lastClickAt < 2_000 ? Math.min(40, safeCount(saved.comboClicks)) : 0,
        lastClickAt: Number.isFinite(lastClickAt) ? Math.min(now, Math.max(0, lastClickAt)) : 0,
        bestStreak: Math.min(100_000, safeCount(saved.bestStreak)), milestoneCount: safeCount(saved.milestoneCount),
      };
    }
  }
  base.activeEvent = sanitizeEvent(input.activeEvent, now);
  base.productionBoost = sanitizeBoost(input.productionBoost, now);
  base.clickBoost = sanitizeClickBoost(input.clickBoost, now);
  base.eventActivityMs = safeCount(input.eventActivityMs);
  base.nextEventAtActivityMs = Math.max(base.eventActivityMs + 1_000, safeCount(input.nextEventAtActivityMs) || base.nextEventAtActivityMs);
  return base;
}

function sanitizePeriod(value: unknown, fallback: ObjectivePeriodState): ObjectivePeriodState {
  if (!value || typeof value !== "object") return fallback;
  const input = value as Partial<ObjectivePeriodState>;
  if (input.key !== fallback.key) return fallback;
  const progress = emptyProgress();
  for (const metric of ALL_METRICS) progress[metric] = safeMoney(Number(input.progress?.[metric] ?? 0));
  const completed: Record<string, number> = {};
  if (input.completed && typeof input.completed === "object") {
    for (const objective of RENEWABLE_OBJECTIVES) {
      const at = Number(input.completed[objective.id]);
      if (Number.isFinite(at) && at > 0) completed[objective.id] = at;
    }
  }
  return { key: fallback.key, progress, completed };
}

function chooseEventType(): IdleEventType {
  let roll = Math.random() * IDLE_EVENT_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
  for (const entry of IDLE_EVENT_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return "money";
}

export class IdleStore {
  private data: IdleStoredData;
  private loadPromise: Promise<void> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savingNow = false;
  private saveAgainAfter = false;
  private listeners = new Set<(snapshot: IdleSnapshot) => void>();
  private lastClickAt = new Map<string, number>();
  private lastActivityAt = new Map<IdleModeId, number>();

  constructor(
    private readonly shouldPersist = true,
    private readonly now: () => number = Date.now,
    private readonly dataFile = DEFAULT_DATA_FILE,
    readonly environment: GameEnvironment = "real",
  ) {
    this.data = emptyData(this.now());
  }

  ready(): Promise<void> {
    if (!this.loadPromise) this.loadPromise = this.load();
    return this.loadPromise;
  }

  subscribe(listener: (snapshot: IdleSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async load() {
    if (!this.shouldPersist) return;
    try {
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
      const parsed = JSON.parse(await fs.readFile(this.dataFile, "utf-8")) as Partial<IdleStoredData>;
      const now = this.now();
      const base = emptyData(now);
      const schemaVersion = safeCount(parsed.schemaVersion);
      this.data = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        revision: safeCount(parsed.revision),
        globalCoins: safeMoney(Number(parsed.globalCoins ?? 0)),
        globalLifetimeEarned: safeMoney(Number(parsed.globalLifetimeEarned ?? 0)),
        modes: {
          farm: sanitizeMode("farm", parsed.modes?.farm, now),
          kitty: sanitizeMode("kitty", parsed.modes?.kitty, now),
        },
        objectives: {
          daily: sanitizePeriod(parsed.objectives?.daily, base.objectives.daily),
          weekly: sanitizePeriod(parsed.objectives?.weekly, base.objectives.weekly),
        },
        rewardedMatches: Array.isArray(parsed.rewardedMatches)
          ? parsed.rewardedMatches.filter((id): id is string => typeof id === "string").slice(-MAX_REWARDED_MATCHES)
          : [],
        // Before the shop existed every current decoration was already available/equipped.
        // Granting them during the one-time real migration preserves both rooms exactly.
        purchasedPetDecorations: schemaVersion < 4 && this.environment === "real"
          ? [...PET_DECORATION_IDS]
          : Array.isArray(parsed.purchasedPetDecorations)
            ? parsed.purchasedPetDecorations.filter((id): id is PetDecorationId => id in PET_DECORATION_PRICES)
            : [],
        updatedAt: Number.isFinite(parsed.updatedAt) ? Number(parsed.updatedAt) : now,
      };
      if (schemaVersion < CURRENT_SCHEMA_VERSION) this.scheduleSave();
    } catch {
      this.data = emptyData(this.now());
    }
  }

  private scheduleSave() {
    if (!this.shouldPersist || this.saveTimer) return;
    this.saveTimer = setTimeout(() => { this.saveTimer = null; void this.flush(); }, SAVE_DEBOUNCE_MS);
  }

  private async flush() {
    if (this.savingNow) { this.saveAgainAfter = true; return; }
    this.savingNow = true;
    try {
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
      const tmp = `${this.dataFile}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(this.data), "utf-8");
      await fs.rename(tmp, this.dataFile);
    } catch (error) {
      console.error(`Não foi possível salvar ${this.dataFile}:`, error);
    } finally {
      this.savingNow = false;
      if (this.saveAgainAfter) { this.saveAgainAfter = false; this.scheduleSave(); }
    }
  }

  private ensurePeriods(now: number): boolean {
    let changed = false;
    const nextDaily = dailyKey(now);
    const nextWeekly = weeklyKey(now);
    if (this.data.objectives.daily.key !== nextDaily) { this.data.objectives.daily = newPeriod(nextDaily); changed = true; }
    if (this.data.objectives.weekly.key !== nextWeekly) { this.data.objectives.weekly = newPeriod(nextWeekly); changed = true; }
    for (const mode of ["farm", "kitty"] as const) {
      const stats = this.data.modes[mode].statistics;
      if (stats.todayKey !== nextDaily) { stats.todayKey = nextDaily; stats.earnedToday = 0; changed = true; }
    }
    return changed;
  }

  private totalProduction(mode: IdleModeId): number {
    return IDLE_CATALOG[mode].reduce((sum, definition) => {
      const owned = this.data.modes[mode].items[definition.id];
      return sum + (owned?.purchased ? this.itemProduction(mode, definition, owned.level) : 0);
    }, 0);
  }

  private relicMultiplier(id: string): number {
    return 1 + (this.data.modes.kitty.relicLevels?.[id] ?? 0);
  }

  private itemProduction(mode: IdleModeId, definition: (typeof IDLE_CATALOG)[IdleModeId][number], level: number): number {
    const base = itemProduction(definition, level);
    return mode === "kitty" ? base * this.relicMultiplier(`kitty-scene-${definition.scene + 1}`) * this.relicMultiplier("kitty-all") : base;
  }

  private productionMultiplier(mode: IdleModeId, now: number): number {
    return (this.data.modes[mode].productionBoost?.expiresAt ?? 0) > now ? 2 : 1;
  }

  private clickMultiplier(mode: IdleModeId, now: number): number {
    const state = this.data.modes[mode];
    const production = (state.productionBoost?.expiresAt ?? 0) > now ? 2 : 1;
    const activeClickBoost = aggregateClickBoost(state.clickBoost?.sources ?? [], now);
    const rush = activeClickBoost?.multiplier ?? 1;
    return production * rush;
  }

  private objectiveValue(period: ObjectivePeriodState, metric: string): number {
    if (metric === "upgrades") return period.progress.farmUpgrades + period.progress.kittyUpgrades;
    if (metric === "earnings") return period.progress.farmEarnings + period.progress.kittyEarnings;
    return period.progress[metric as ObjectiveMetric] ?? 0;
  }

  private awardGlobal(amount: number) {
    this.data.globalCoins = safeMoney(this.data.globalCoins + amount);
    this.data.globalLifetimeEarned = safeMoney(this.data.globalLifetimeEarned + amount);
  }

  private evaluateObjectives(now: number) {
    for (const periodName of ["daily", "weekly"] as const) {
      const period = this.data.objectives[periodName];
      for (const objective of RENEWABLE_OBJECTIVES.filter((item) => item.period === periodName)) {
        if (period.completed[objective.id] || this.objectiveValue(period, objective.metric) < objective.target) continue;
        period.completed[objective.id] = now;
        this.awardGlobal(objective.reward);
      }
    }
  }

  private addMetric(metric: ObjectiveMetric, amount: number, now: number) {
    if (!(amount > 0)) return;
    for (const period of [this.data.objectives.daily, this.data.objectives.weekly]) {
      period.progress[metric] = safeMoney(period.progress[metric] + amount);
    }
    this.evaluateObjectives(now);
  }

  private achievementProgress(mode: IdleModeId, achievementId: string): { progress: number; target: number } {
    const definition = ACHIEVEMENTS.find((item) => item.id === achievementId && item.mode === mode);
    if (!definition) return { progress: 0, target: 1 };
    const state = this.data.modes[mode];
    const owned = Object.values(state.items).filter((item) => item.purchased);
    switch (definition.condition.type) {
      case "own": return { progress: state.items[definition.condition.itemId]?.purchased ? 1 : 0, target: 1 };
      case "ownedCount": return { progress: owned.length, target: definition.condition.target };
      case "production": return { progress: this.totalProduction(mode), target: definition.condition.target };
      case "level": return { progress: Math.max(0, ...owned.map((item) => item.level)), target: definition.condition.target };
      case "ownAll": return { progress: owned.length, target: IDLE_CATALOG[mode].length };
    }
  }

  private evaluateAchievements(mode: IdleModeId, now: number): boolean {
    let changed = false;
    const state = this.data.modes[mode];
    for (const achievement of ACHIEVEMENTS.filter((item) => item.mode === mode)) {
      if (state.unlockedAchievements[achievement.id]) continue;
      const { progress, target } = this.achievementProgress(mode, achievement.id);
      if (progress < target) continue;
      state.unlockedAchievements[achievement.id] = now;
      this.awardGlobal(achievement.reward);
      changed = true;
    }
    return changed;
  }

  private addModeEarning(mode: IdleModeId, amount: number, kind: "passive" | "click" | "event", now: number, itemId?: string, offline = false) {
    if (!(amount > 0)) return;
    const state = this.data.modes[mode];
    const stats = state.statistics;
    if (stats.todayKey !== dailyKey(now)) { stats.todayKey = dailyKey(now); stats.earnedToday = 0; }
    state.balance = safeMoney(state.balance + amount);
    state.totalEarned = safeMoney(state.totalEarned + amount);
    stats.earnedToday = safeMoney(stats.earnedToday + amount);
    if (kind === "passive") stats.passiveEarned = safeMoney(stats.passiveEarned + amount);
    else if (kind === "click") stats.clickEarned = safeMoney(stats.clickEarned + amount);
    else stats.eventEarned = safeMoney(stats.eventEarned + amount);
    if (offline) stats.offlineEarned = safeMoney(stats.offlineEarned + amount);
    if (itemId && stats.items[itemId]) {
      if (kind === "passive") stats.items[itemId].passiveEarned = safeMoney(stats.items[itemId].passiveEarned + amount);
      else if (kind === "click") stats.items[itemId].clickEarned = safeMoney(stats.items[itemId].clickEarned + amount);
    }
    this.addMetric(mode === "farm" ? "farmEarnings" : "kittyEarnings", amount, now);
  }

  private settle(mode: IdleModeId, now: number): { amount: number; elapsedMs: number } {
    const state = this.data.modes[mode];
    const elapsedMs = Math.max(0, Math.min(OFFLINE_CAP_MS, now - state.lastSettledAt));
    const from = now - elapsedMs;
    state.lastSettledAt = now;
    if (elapsedMs <= 0) return { amount: 0, elapsedMs: 0 };
    const offline = elapsedMs >= 60_000;
    const boost = state.productionBoost;
    const boostedMs = boost ? Math.max(0, Math.min(now, boost.expiresAt) - Math.max(from, boost.startedAt)) : 0;
    const effectiveSeconds = (elapsedMs + boostedMs) / 1_000;
    let total = 0;
    for (const definition of IDLE_CATALOG[mode]) {
      const owned = state.items[definition.id];
      if (!owned.purchased) continue;
      const amount = safeMoney(this.itemProduction(mode, definition, owned.level) * effectiveSeconds);
      total = safeMoney(total + amount);
      this.addModeEarning(mode, amount, "passive", now, definition.id, offline);
    }
    return { amount: total, elapsedMs };
  }

  private cleanupTimedState(now: number): boolean {
    let changed = false;
    for (const mode of ["farm", "kitty"] as const) {
      const state = this.data.modes[mode];
      if (state.activeEvent && state.activeEvent.expiresAt <= now) { state.activeEvent = null; changed = true; }
      if (state.productionBoost && state.productionBoost.expiresAt <= now) { state.productionBoost = null; changed = true; }
      if (state.clickBoost) {
        const previousCount = state.clickBoost.sources.length;
        const nextClickBoost = aggregateClickBoost(state.clickBoost.sources, now);
        if (!nextClickBoost || nextClickBoost.sources.length !== previousCount) {
          state.clickBoost = nextClickBoost;
          changed = true;
        }
      }
    }
    return changed;
  }

  private touch(now: number, notify = true) {
    this.data.revision += 1;
    this.data.updatedAt = now;
    this.scheduleSave();
    if (notify) {
      const snapshot = this.buildSnapshot(null);
      for (const listener of this.listeners) {
        try { listener(snapshot); } catch (error) { console.error("Falha ao sincronizar o idle game:", error); }
      }
    }
  }

  private upgradeQuote(mode: IdleModeId, itemId: string, limit: number, respectBalance: boolean) {
    const state = this.data.modes[mode];
    const definition = IDLE_CATALOG[mode].find((item) => item.id === itemId);
    const owned = definition ? state.items[itemId] : null;
    if (!definition || !owned?.purchased) return { count: 0, totalCost: 0 };
    let level = owned.level;
    let totalCost = 0;
    let count = 0;
    while (count < limit && level < 10_000) {
      const cost = itemUpgradeCost(definition, level);
      if (respectBalance && safeMoney(totalCost + cost) > state.balance) break;
      totalCost = safeMoney(totalCost + cost);
      level += 1;
      count += 1;
    }
    return { count, totalCost };
  }

  private modeSnapshot(mode: IdleModeId, now: number): IdleModeSnapshot {
    const state = this.data.modes[mode];
    const totalProduction = this.totalProduction(mode);
    state.statistics.highestProduction = Math.max(state.statistics.highestProduction, totalProduction);
    const items = IDLE_CATALOG[mode].map((definition, index) => {
      const owned = state.items[definition.id];
      const previous = index > 0 ? state.items[IDLE_CATALOG[mode][index - 1].id] : null;
      const one = this.upgradeQuote(mode, definition.id, 1, false);
      const ten = this.upgradeQuote(mode, definition.id, 10, false);
      const max = this.upgradeQuote(mode, definition.id, MAX_BATCH_LEVELS, true);
      return {
        ...owned,
        definition,
        production: owned.purchased ? this.itemProduction(mode, definition, owned.level) : this.itemProduction(mode, definition, 1),
        nextCost: owned.purchased ? itemUpgradeCost(definition, owned.level) : definition.baseCost,
        unlocked: index === 0 || Boolean(previous?.purchased),
        upgradeQuotes: { one, ten, max: max.count > 0 ? max : null },
        statistics: { ...state.statistics.items[definition.id] },
      };
    });
    return {
      id: mode,
      balance: state.balance,
      totalEarned: state.totalEarned,
      totalProduction,
      effectiveProduction: totalProduction * this.productionMultiplier(mode, now),
      clickMultiplier: this.clickMultiplier(mode, now),
      totalUpgrades: state.totalUpgrades,
      visits: state.visits,
      totalClicks: state.totalClicks,
      lastSettledAt: state.lastSettledAt,
      items,
      ...(mode === "kitty" ? {
        relics: KITTY_RELICS.map((relic) => {
          const level = state.relicLevels?.[relic.id] ?? 0;
          return { definition: relic, level, multiplier: 1 + level,
            nextCost: level < relic.maxLevel ? kittyRelicCost(relic, level) : null,
            unlocked: Boolean(state.items[IDLE_CATALOG.kitty[relic.unlockOrder].id]?.purchased) };
        }),
        clickActivity: { ...state.clickActivity },
      } : {}),
      achievements: ACHIEVEMENTS.filter((item) => item.mode === mode).map((achievement) => {
        const status = this.achievementProgress(mode, achievement.id);
        return { ...achievement, completedAt: state.unlockedAchievements[achievement.id] ?? null, ...status };
      }),
      scenes: IDLE_SCENES[mode].map(({ id: scene, name }) => ({
        id: scene,
        name,
        unlocked: scene === 0 || IDLE_CATALOG[mode].some((definition) => definition.scene === scene && state.items[definition.id]?.purchased),
      })),
      statistics: JSON.parse(JSON.stringify(state.statistics)) as IdleModeStatistics,
      activeEvent: state.activeEvent ? { ...state.activeEvent } : null,
      productionBoost: state.productionBoost ? { ...state.productionBoost } : null,
      clickBoost: (() => {
        const active = aggregateClickBoost(state.clickBoost?.sources ?? [], now);
        return active ? { ...active, sources: active.sources.map((source) => ({ ...source })) } : null;
      })(),
    };
  }

  private buildSnapshot(offlineReward: IdleSnapshot["offlineReward"]): IdleSnapshot {
    const now = this.now();
    const objectiveSnapshots = (periodName: "daily" | "weekly") => {
      const period = this.data.objectives[periodName];
      return RENEWABLE_OBJECTIVES.filter((item) => item.period === periodName).map((objective) => ({
        ...objective, progress: this.objectiveValue(period, objective.metric), completedAt: period.completed[objective.id] ?? null, periodKey: period.key,
      }));
    };
    return {
      revision: this.data.revision,
      environment: this.environment,
      areaName: this.environment === "dev" ? `${IDLE_AREA_NAME} DEV` : IDLE_AREA_NAME,
      globalCoins: this.data.globalCoins,
      globalLifetimeEarned: this.data.globalLifetimeEarned,
      purchasedPetDecorations: [...this.data.purchasedPetDecorations],
      updatedAt: this.data.updatedAt,
      offlineReward,
      modes: { farm: this.modeSnapshot("farm", now), kitty: this.modeSnapshot("kitty", now) },
      objectives: { daily: objectiveSnapshots("daily"), weekly: objectiveSnapshots("weekly") },
    };
  }

  getSnapshot(): IdleSnapshot {
    const now = this.now();
    const periodChanged = this.ensurePeriods(now);
    const timedStateChanged = this.cleanupTimedState(now);
    const farmAchievementsChanged = this.evaluateAchievements("farm", now);
    const kittyAchievementsChanged = this.evaluateAchievements("kitty", now);
    const changed = periodChanged || timedStateChanged || farmAchievementsChanged || kittyAchievementsChanged;
    if (changed) this.touch(now);
    return this.buildSnapshot(null);
  }

  enterMode(mode: IdleModeId): IdleSnapshot {
    const now = this.now();
    this.ensurePeriods(now);
    const settled = this.settle(mode, now);
    const state = this.data.modes[mode];
    state.visits += 1;
    this.addMetric(mode === "farm" ? "farmEntries" : "kittyEntries", 1, now);
    this.evaluateAchievements(mode, now);
    this.touch(now);
    return this.buildSnapshot(settled.elapsedMs >= 60_000 && settled.amount > 0 ? { mode, amount: settled.amount, elapsedMs: settled.elapsedMs } : null);
  }

  act(mode: IdleModeId, itemId: string, action: "buy" | "upgrade") {
    if (action === "upgrade") return this.upgradeMany(mode, itemId, 1);
    const now = this.now();
    this.ensurePeriods(now);
    const settled = this.settle(mode, now);
    const catalog = IDLE_CATALOG[mode];
    const index = catalog.findIndex((item) => item.id === itemId);
    const definition = catalog[index];
    const fail = (error: string) => {
      if (settled.amount > 0) this.touch(now);
      return { ok: false as const, error, snapshot: this.buildSnapshot(null) };
    };
    if (!definition) return fail("Item não encontrado.");
    const state = this.data.modes[mode];
    const owned = state.items[itemId];
    if (owned.purchased) return fail("Esse item já foi comprado.");
    if (index > 0 && !state.items[catalog[index - 1].id]?.purchased) return fail("Compre o item anterior primeiro.");
    if (state.balance < definition.baseCost) return fail("Dinheiro interno insuficiente.");
    state.balance = safeMoney(state.balance - definition.baseCost);
    state.items[itemId] = { purchased: true, level: 1, purchasedAt: now };
    this.evaluateAchievements(mode, now);
    this.touch(now);
    return { ok: true as const, snapshot: this.buildSnapshot(null) };
  }

  upgradeRelic(relicId: string) {
    const now = this.now();
    this.ensurePeriods(now);
    const settled = this.settle("kitty", now);
    const state = this.data.modes.kitty;
    const fail = (error: string) => {
      if (settled.amount > 0) this.touch(now);
      return { ok: false as const, error, snapshot: this.buildSnapshot(null) };
    };
    const relic = KITTY_RELICS.find((entry) => entry.id === relicId);
    if (!relic) return fail("Relíquia não encontrada.");
    if (!state.items[IDLE_CATALOG.kitty[relic.unlockOrder].id]?.purchased) return fail("Descubra o personagem desta relíquia primeiro.");
    const level = state.relicLevels?.[relicId] ?? 0;
    if (level >= relic.maxLevel) return fail("Esta relíquia já atingiu o nível máximo.");
    const price = kittyRelicCost(relic, level);
    if (state.balance < price) return fail("Dinheiro interno insuficiente.");
    state.balance = safeMoney(state.balance - price);
    state.relicLevels![relicId] = level + 1;
    this.evaluateAchievements("kitty", now);
    this.touch(now);
    return { ok: true as const, snapshot: this.buildSnapshot(null) };
  }

  upgradeMany(mode: IdleModeId, itemId: string, requestedCount: number | "max") {
    const now = this.now();
    this.ensurePeriods(now);
    const settled = this.settle(mode, now);
    const state = this.data.modes[mode];
    const definition = IDLE_CATALOG[mode].find((item) => item.id === itemId);
    const owned = definition ? state.items[itemId] : null;
    const requested = requestedCount === "max" ? MAX_BATCH_LEVELS : Math.max(1, Math.min(MAX_BATCH_LEVELS, Math.floor(requestedCount)));
    const fail = (error: string) => {
      if (settled.amount > 0) this.touch(now);
      return { ok: false as const, applied: 0, requested, totalCost: 0, error, snapshot: this.buildSnapshot(null) };
    };
    if (!definition || !owned?.purchased) return fail("Compre esse item antes de melhorar.");
    let applied = 0;
    let totalCost = 0;
    while (applied < requested && owned.level < 10_000) {
      const cost = itemUpgradeCost(definition, owned.level);
      if (safeMoney(totalCost + cost) > state.balance) break;
      totalCost = safeMoney(totalCost + cost);
      owned.level += 1;
      applied += 1;
    }
    if (applied === 0) return fail("Dinheiro interno insuficiente.");
    state.balance = safeMoney(state.balance - totalCost);
    state.totalUpgrades += applied;
    this.addMetric(mode === "farm" ? "farmUpgrades" : "kittyUpgrades", applied, now);
    this.evaluateAchievements(mode, now);
    this.touch(now);
    const snapshot = this.buildSnapshot(null);
    return applied < requested && requestedCount !== "max"
      ? { ok: false as const, applied, requested, totalCost, error: "Foram comprados todos os níveis possíveis com o saldo atual.", snapshot }
      : { ok: true as const, applied, requested, totalCost, snapshot };
  }

  click(mode: IdleModeId, itemId: string, accountId: string) {
    const now = this.now();
    this.ensurePeriods(now);
    const settled = this.settle(mode, now);
    const fail = (error: string) => {
      if (settled.amount > 0) this.touch(now);
      return { ok: false as const, error, snapshot: this.buildSnapshot(null) };
    };
    const clickKey = `${accountId}:${mode}`;
    if (now - (this.lastClickAt.get(clickKey) ?? -Infinity) < CLICK_COOLDOWN_MS) return fail("Toque rápido demais. Espere só um instante.");
    const definition = IDLE_CATALOG[mode].find((item) => item.id === itemId);
    const owned = definition ? this.data.modes[mode].items[itemId] : null;
    if (!definition || !owned?.purchased) return fail("Compre este item antes de coletar com ele.");
    this.lastClickAt.set(clickKey, now);
    const state = this.data.modes[mode];
    let milestone = 0;
    let bonus = 0;
    let comboMultiplier = 1;
    if (mode === "kitty") {
      const previous = state.clickActivity?.[accountId];
      const streak = now - (previous?.lastClickAt ?? -Infinity) < 5_000 ? (previous?.streak ?? 0) + 1 : 1;
      const comboClicks = now - (previous?.lastClickAt ?? -Infinity) < 2_000 ? Math.min(40, (previous?.comboClicks ?? 0) + 1) : 1;
      comboMultiplier = 1 + Math.min(1.2, (comboClicks - 1) * .03);
      milestone = streak % 50 === 0 ? streak : 0;
      if (milestone) bonus = safeMoney(this.totalProduction(mode) * (35 + Math.min(65, streak / 10)));
      state.clickActivity![accountId] = { streak, comboClicks, lastClickAt: now,
        bestStreak: Math.max(previous?.bestStreak ?? 0, streak), milestoneCount: (previous?.milestoneCount ?? 0) + (milestone ? 1 : 0) };
    }
    const multiplier = this.clickMultiplier(mode, now) * comboMultiplier * (mode === "kitty" ? this.relicMultiplier("kitty-click") : 1);
    const baseClick = mode === "kitty" ? Math.max(1, Math.floor(this.itemProduction(mode, definition, owned.level) * .55)) : itemClickReward(definition, owned.level);
    const reward = safeMoney(baseClick * multiplier);
    state.totalClicks += 1;
    state.statistics.items[itemId].clicks += 1;
    state.statistics.items[itemId].largestClick = Math.max(state.statistics.items[itemId].largestClick, reward);
    state.statistics.largestClick = Math.max(state.statistics.largestClick, reward);
    this.addModeEarning(mode, reward, "click", now, itemId);
    if (bonus > 0) this.addModeEarning(mode, bonus, "click", now);
    this.touch(now);
    return { ok: true as const, reward, multiplier, milestone, bonus, snapshot: this.buildSnapshot(null) };
  }

  recordActivity(mode: IdleModeId, elapsedMs: number): IdleSnapshot {
    const now = this.now();
    let changed = this.cleanupTimedState(now);
    const state = this.data.modes[mode];
    const claimedElapsed = Math.max(0, Math.min(10_000, Math.floor(elapsedMs)));
    const previousActivityAt = this.lastActivityAt.get(mode);
    const wallElapsed = previousActivityAt === undefined ? claimedElapsed : Math.max(0, now - previousActivityAt);
    const safeElapsed = Math.min(claimedElapsed, wallElapsed);
    this.lastActivityAt.set(mode, now);
    if (safeElapsed > 0) {
      state.statistics.activeTimeMs += safeElapsed;
      state.eventActivityMs += safeElapsed;
      changed = true;
    }
    if (!state.activeEvent && state.eventActivityMs >= state.nextEventAtActivityMs) {
      state.activeEvent = { id: randomUUID(), type: chooseEventType(), spawnedAt: now, expiresAt: now + IDLE_EVENT_VISIBLE_MS };
      state.nextEventAtActivityMs = state.eventActivityMs + nextEventDelay();
      changed = true;
    }
    if (changed) this.touch(now);
    return this.buildSnapshot(null);
  }

  collectEvent(mode: IdleModeId, eventId: string) {
    const now = this.now();
    const state = this.data.modes[mode];
    const event = state.activeEvent;
    if (!event || event.id !== eventId || event.expiresAt <= now) {
      if (event?.expiresAt && event.expiresAt <= now) { state.activeEvent = null; this.touch(now); }
      return { ok: false as const, error: "Esse evento já desapareceu.", snapshot: this.buildSnapshot(null) };
    }
    state.activeEvent = null;
    const stats = state.statistics;
    stats.eventsCollected += 1;
    stats.eventCounters[event.type] += 1;
    let reward = 0;
    if (event.type === "money") {
      const production = this.totalProduction(mode);
      reward = safeMoney(Math.max(INITIAL_BALANCE[mode], production * 45));
      this.addModeEarning(mode, reward, "event", now);
    } else if (event.type === "production2") {
      state.productionBoost = { startedAt: now, expiresAt: now + PRODUCTION_BOOST_MS, multiplier: 2 };
      stats.boostsCollected += 1;
    } else {
      const multiplier = Number(event.type.replace("click", ""));
      const source = { startedAt: now, expiresAt: now + CLICK_BOOST_DURATIONS[event.type], multiplier };
      const currentSources = aggregateClickBoost(state.clickBoost?.sources ?? [], now)?.sources ?? [];
      state.clickBoost = aggregateClickBoost([...currentSources, source], now);
      stats.boostsCollected += 1;
    }
    this.touch(now);
    return { ok: true as const, reward, eventType: event.type, snapshot: this.buildSnapshot(null) };
  }

  forceEvent(mode: IdleModeId, type: IdleEventType): IdleSnapshot {
    const now = this.now();
    this.data.modes[mode].activeEvent = { id: randomUUID(), type, spawnedAt: now, expiresAt: now + IDLE_EVENT_VISIBLE_MS };
    this.touch(now);
    return this.buildSnapshot(null);
  }

  addTestFunds(target: "global" | IdleModeId, amount: number): IdleSnapshot {
    return this.changeBalance(target, "add", amount);
  }

  changeBalance(target: "global" | IdleModeId, operation: "add" | "remove" | "set" | "zero", amount = 0): IdleSnapshot {
    const now = this.now();
    const current = target === "global" ? this.data.globalCoins : this.data.modes[target].balance;
    const next = operation === "zero" ? 0 : operation === "set" ? amount : operation === "remove" ? current - amount : current + amount;
    if (target === "global") this.data.globalCoins = safeMoney(next);
    else this.data.modes[target].balance = safeMoney(next);
    this.touch(now);
    return this.buildSnapshot(null);
  }

  devItemAction(mode: IdleModeId, itemId: string | "all", action: "unlock" | "lock" | "setLevel" | "resetLevels", level?: number): IdleSnapshot {
    const now = this.now();
    const ids = itemId === "all" ? IDLE_CATALOG[mode].map((item) => item.id) : [itemId];
    for (const id of ids) {
      const owned = this.data.modes[mode].items[id];
      if (!owned) continue;
      if (action === "unlock") { owned.purchased = true; owned.level = Math.max(1, owned.level); owned.purchasedAt ??= now; }
      if (action === "lock") { owned.purchased = false; owned.level = 0; owned.purchasedAt = null; }
      if (action === "setLevel") { owned.purchased = true; owned.level = Math.max(1, Math.min(10_000, Math.floor(level ?? 1))); owned.purchasedAt ??= now; }
      if (action === "resetLevels" && owned.purchased) owned.level = 1;
    }
    this.touch(now);
    return this.buildSnapshot(null);
  }

  devAchievementAction(mode: IdleModeId, achievementId: string | "all", completed: boolean): IdleSnapshot {
    const now = this.now();
    const state = this.data.modes[mode];
    const ids = achievementId === "all"
      ? ACHIEVEMENTS.filter((item) => item.mode === mode).map((item) => item.id)
      : [achievementId];
    for (const id of ids) {
      if (!ACHIEVEMENTS.some((item) => item.mode === mode && item.id === id)) continue;
      if (completed) state.unlockedAchievements[id] = now;
      else delete state.unlockedAchievements[id];
    }
    this.touch(now);
    return this.buildSnapshot(null);
  }

  simulateOffline(mode: IdleModeId, elapsedMs: number): IdleSnapshot {
    const state = this.data.modes[mode];
    state.lastSettledAt = Math.max(0, this.now() - Math.min(OFFLINE_CAP_MS, Math.max(0, elapsedMs)));
    return this.enterMode(mode);
  }

  resetMode(mode: IdleModeId) {
    const now = this.now();
    this.data.modes[mode] = newMode(mode, now);
    this.data.revision += 1;
    this.data.updatedAt = now;
    this.scheduleSave();
  }

  resetGlobalCoins() {
    this.data.globalCoins = 0;
    this.data.globalLifetimeEarned = 0;
    this.touch(this.now());
  }

  recordMinigameCompletion(rewardId: string, amount: number, advanceObjective: boolean): number {
    if (!rewardId || this.data.rewardedMatches.includes(rewardId)) return 0;
    const now = this.now();
    this.ensurePeriods(now);
    const reward = safeMoney(amount);
    this.data.rewardedMatches.push(rewardId);
    if (this.data.rewardedMatches.length > MAX_REWARDED_MATCHES) this.data.rewardedMatches.splice(0, this.data.rewardedMatches.length - MAX_REWARDED_MATCHES);
    if (reward > 0) this.awardGlobal(reward);
    if (advanceObjective) this.addMetric("minigames", 1, now);
    this.touch(now);
    return reward;
  }

  purchasePetDecoration(id: PetDecorationId) {
    if (this.data.purchasedPetDecorations.includes(id)) return { ok: true as const, alreadyOwned: true, snapshot: this.getSnapshot() };
    const price = PET_DECORATION_PRICES[id];
    if (this.data.globalCoins < price) return { ok: false as const, error: "Moedas globais insuficientes.", snapshot: this.getSnapshot() };
    this.data.globalCoins = safeMoney(this.data.globalCoins - price);
    this.data.purchasedPetDecorations.push(id);
    this.touch(this.now());
    return { ok: true as const, alreadyOwned: false, snapshot: this.buildSnapshot(null) };
  }

  ownsPetDecoration(id: string): boolean {
    return this.data.purchasedPetDecorations.includes(id);
  }

  setPetDecorationOwned(id: PetDecorationId, owned: boolean): IdleSnapshot {
    const set = new Set(this.data.purchasedPetDecorations);
    if (owned) set.add(id); else set.delete(id);
    this.data.purchasedPetDecorations = [...set];
    this.touch(this.now());
    return this.buildSnapshot(null);
  }

  setAllPetDecorationsOwned(owned: boolean): IdleSnapshot {
    this.data.purchasedPetDecorations = owned ? [...PET_DECORATION_IDS] : [];
    this.touch(this.now());
    return this.buildSnapshot(null);
  }

  resetPetPurchases(): IdleSnapshot {
    this.data.purchasedPetDecorations = [];
    this.touch(this.now());
    return this.buildSnapshot(null);
  }
}

export const idleStore = new IdleStore(true, Date.now, DEFAULT_DATA_FILE, "real");
export const idleDevStore = new IdleStore(true, Date.now, DEFAULT_DEV_DATA_FILE, "dev");
