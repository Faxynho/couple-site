import { promises as fs } from "fs";
import path from "path";
import {
  ACHIEVEMENTS,
  IDLE_AREA_NAME,
  IDLE_CATALOG,
  IdleModeId,
  MAX_IDLE_MONEY,
  MINIGAME_GLOBAL_REWARDS,
  OFFLINE_CAP_MS,
  RENEWABLE_OBJECTIVES,
  itemProduction,
  itemUpgradeCost,
} from "./idleConfig";
import {
  IdleModeSnapshot,
  IdleModeState,
  IdleOwnedItem,
  IdleSnapshot,
  IdleStoredData,
  ObjectiveMetric,
  ObjectivePeriodState,
} from "./types";
import { GameId } from "../types";

const DEFAULT_DATA_FILE = path.join(__dirname, "..", "..", "data", "idle-game.json");
const SAVE_DEBOUNCE_MS = 500;
const MAX_REWARDED_MATCHES = 500;
const INITIAL_BALANCE: Record<IdleModeId, number> = { farm: 30, kitty: 60 };
const ALL_METRICS: ObjectiveMetric[] = [
  "farmEntries", "kittyEntries", "farmUpgrades", "kittyUpgrades",
  "farmEarnings", "kittyEarnings", "minigames",
];

function safeMoney(value: number): number {
  if (!Number.isFinite(value)) return MAX_IDLE_MONEY;
  return Math.max(0, Math.min(MAX_IDLE_MONEY, Math.round(value * 1_000) / 1_000));
}

function emptyProgress(): Record<ObjectiveMetric, number> {
  return {
    farmEntries: 0,
    kittyEntries: 0,
    farmUpgrades: 0,
    kittyUpgrades: 0,
    farmEarnings: 0,
    kittyEarnings: 0,
    minigames: 0,
  };
}

function zonedDateParts(now: number): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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

function newPeriod(key: string): ObjectivePeriodState {
  return { key, progress: emptyProgress(), completed: {} };
}

function newMode(mode: IdleModeId, now: number): IdleModeState {
  const items: Record<string, IdleOwnedItem> = {};
  for (const item of IDLE_CATALOG[mode]) {
    const purchased = Boolean(item.starter);
    items[item.id] = { purchased, level: purchased ? 1 : 0, purchasedAt: purchased ? now : null };
  }
  return {
    balance: INITIAL_BALANCE[mode],
    totalEarned: 0,
    totalUpgrades: 0,
    visits: 0,
    lastSettledAt: now,
    items,
    unlockedAchievements: {},
  };
}

function emptyData(now: number): IdleStoredData {
  return {
    revision: 0,
    globalCoins: 0,
    globalLifetimeEarned: 0,
    modes: { farm: newMode("farm", now), kitty: newMode("kitty", now) },
    objectives: { daily: newPeriod(dailyKey(now)), weekly: newPeriod(weeklyKey(now)) },
    rewardedMatches: [],
    updatedAt: now,
  };
}

function sanitizeMode(mode: IdleModeId, value: unknown, now: number): IdleModeState {
  const base = newMode(mode, now);
  if (!value || typeof value !== "object") return base;
  const input = value as Partial<IdleModeState>;
  base.balance = safeMoney(Number(input.balance ?? base.balance));
  base.totalEarned = safeMoney(Number(input.totalEarned ?? 0));
  base.totalUpgrades = Math.max(0, Math.floor(Number(input.totalUpgrades ?? 0)));
  base.visits = Math.max(0, Math.floor(Number(input.visits ?? 0)));
  const savedAt = Number(input.lastSettledAt);
  base.lastSettledAt = Number.isFinite(savedAt) ? Math.min(now, Math.max(0, savedAt)) : now;
  for (const definition of IDLE_CATALOG[mode]) {
    const saved = input.items?.[definition.id];
    if (!saved || typeof saved !== "object") continue;
    const purchased = Boolean(saved.purchased) || Boolean(definition.starter);
    const level = purchased ? Math.max(1, Math.min(10_000, Math.floor(Number(saved.level) || 1))) : 0;
    base.items[definition.id] = {
      purchased,
      level,
      purchasedAt: purchased && Number.isFinite(saved.purchasedAt) ? Number(saved.purchasedAt) : base.items[definition.id].purchasedAt,
    };
  }
  if (input.unlockedAchievements && typeof input.unlockedAchievements === "object") {
    for (const definition of ACHIEVEMENTS.filter((item) => item.mode === mode)) {
      const unlockedAt = Number(input.unlockedAchievements[definition.id]);
      if (Number.isFinite(unlockedAt) && unlockedAt > 0) base.unlockedAchievements[definition.id] = unlockedAt;
    }
  }
  return base;
}

function sanitizePeriod(value: unknown, fallback: ObjectivePeriodState): ObjectivePeriodState {
  if (!value || typeof value !== "object") return fallback;
  const input = value as Partial<ObjectivePeriodState>;
  if (input.key !== fallback.key) return fallback;
  const progress = emptyProgress();
  for (const metric of ALL_METRICS) {
    const amount = Number(input.progress?.[metric]);
    if (Number.isFinite(amount) && amount > 0) progress[metric] = amount;
  }
  const completed: Record<string, number> = {};
  if (input.completed && typeof input.completed === "object") {
    for (const objective of RENEWABLE_OBJECTIVES) {
      const at = Number(input.completed[objective.id]);
      if (Number.isFinite(at) && at > 0) completed[objective.id] = at;
    }
  }
  return { key: fallback.key, progress, completed };
}

export class IdleStore {
  private data: IdleStoredData;
  private loadPromise: Promise<void> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savingNow = false;
  private saveAgainAfter = false;
  private listeners = new Set<(snapshot: IdleSnapshot) => void>();

  constructor(
    private readonly shouldPersist = true,
    private readonly now: () => number = Date.now,
    private readonly dataFile = DEFAULT_DATA_FILE
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
      this.data = {
        revision: Math.max(0, Math.floor(Number(parsed.revision) || 0)),
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
        updatedAt: Number.isFinite(parsed.updatedAt) ? Number(parsed.updatedAt) : now,
      };
    } catch {
      this.data = emptyData(this.now());
    }
  }

  private scheduleSave() {
    if (!this.shouldPersist || this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flush();
    }, SAVE_DEBOUNCE_MS);
  }

  private async flush() {
    if (this.savingNow) {
      this.saveAgainAfter = true;
      return;
    }
    this.savingNow = true;
    try {
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
      const tmp = `${this.dataFile}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(this.data), "utf-8");
      await fs.rename(tmp, this.dataFile);
    } catch (error) {
      console.error("Não foi possível salvar backend/data/idle-game.json:", error);
    } finally {
      this.savingNow = false;
      if (this.saveAgainAfter) {
        this.saveAgainAfter = false;
        this.scheduleSave();
      }
    }
  }

  private ensurePeriods(now: number): boolean {
    let changed = false;
    const nextDaily = dailyKey(now);
    const nextWeekly = weeklyKey(now);
    if (this.data.objectives.daily.key !== nextDaily) {
      this.data.objectives.daily = newPeriod(nextDaily);
      changed = true;
    }
    if (this.data.objectives.weekly.key !== nextWeekly) {
      this.data.objectives.weekly = newPeriod(nextWeekly);
      changed = true;
    }
    return changed;
  }

  private totalProduction(mode: IdleModeId): number {
    return IDLE_CATALOG[mode].reduce((sum, definition) => {
      const owned = this.data.modes[mode].items[definition.id];
      return sum + (owned?.purchased ? itemProduction(definition, owned.level) : 0);
    }, 0);
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
        if (period.completed[objective.id]) continue;
        if (this.objectiveValue(period, objective.metric) < objective.target) continue;
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
      case "own":
        return { progress: state.items[definition.condition.itemId]?.purchased ? 1 : 0, target: 1 };
      case "ownedCount":
        return { progress: owned.length, target: definition.condition.target };
      case "production":
        return { progress: this.totalProduction(mode), target: definition.condition.target };
      case "level":
        return { progress: Math.max(0, ...owned.map((item) => item.level)), target: definition.condition.target };
      case "ownAll":
        return { progress: owned.length, target: IDLE_CATALOG[mode].length };
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

  private settle(mode: IdleModeId, now: number): { amount: number; elapsedMs: number } {
    const state = this.data.modes[mode];
    const elapsedMs = Math.max(0, Math.min(OFFLINE_CAP_MS, now - state.lastSettledAt));
    state.lastSettledAt = now;
    if (elapsedMs <= 0) return { amount: 0, elapsedMs: 0 };
    const amount = safeMoney(this.totalProduction(mode) * (elapsedMs / 1_000));
    state.balance = safeMoney(state.balance + amount);
    state.totalEarned = safeMoney(state.totalEarned + amount);
    this.addMetric(mode === "farm" ? "farmEarnings" : "kittyEarnings", amount, now);
    return { amount, elapsedMs };
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

  private modeSnapshot(mode: IdleModeId): IdleModeSnapshot {
    const state = this.data.modes[mode];
    const items = IDLE_CATALOG[mode].map((definition, index) => {
      const owned = state.items[definition.id];
      const previous = index > 0 ? state.items[IDLE_CATALOG[mode][index - 1].id] : null;
      return {
        ...owned,
        definition,
        production: owned.purchased ? itemProduction(definition, owned.level) : definition.baseProduction,
        nextCost: owned.purchased ? itemUpgradeCost(definition, owned.level) : definition.baseCost,
        unlocked: index === 0 || Boolean(previous?.purchased),
      };
    });
    return {
      id: mode,
      balance: state.balance,
      totalEarned: state.totalEarned,
      totalProduction: this.totalProduction(mode),
      totalUpgrades: state.totalUpgrades,
      visits: state.visits,
      lastSettledAt: state.lastSettledAt,
      items,
      achievements: ACHIEVEMENTS.filter((item) => item.mode === mode).map((achievement) => {
        const status = this.achievementProgress(mode, achievement.id);
        return {
          ...achievement,
          completedAt: state.unlockedAchievements[achievement.id] ?? null,
          progress: status.progress,
          target: status.target,
        };
      }),
    };
  }

  private buildSnapshot(offlineReward: IdleSnapshot["offlineReward"]): IdleSnapshot {
    const objectiveSnapshots = (periodName: "daily" | "weekly") => {
      const period = this.data.objectives[periodName];
      return RENEWABLE_OBJECTIVES.filter((item) => item.period === periodName).map((objective) => ({
        ...objective,
        progress: this.objectiveValue(period, objective.metric),
        completedAt: period.completed[objective.id] ?? null,
        periodKey: period.key,
      }));
    };
    return {
      revision: this.data.revision,
      areaName: IDLE_AREA_NAME,
      globalCoins: this.data.globalCoins,
      globalLifetimeEarned: this.data.globalLifetimeEarned,
      updatedAt: this.data.updatedAt,
      offlineReward,
      modes: { farm: this.modeSnapshot("farm"), kitty: this.modeSnapshot("kitty") },
      objectives: { daily: objectiveSnapshots("daily"), weekly: objectiveSnapshots("weekly") },
    };
  }

  getSnapshot(): IdleSnapshot {
    const now = this.now();
    const periodChanged = this.ensurePeriods(now);
    const farmChanged = this.evaluateAchievements("farm", now);
    const kittyChanged = this.evaluateAchievements("kitty", now);
    const changed = periodChanged || farmChanged || kittyChanged;
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
    return this.buildSnapshot(
      settled.elapsedMs >= 60_000 && settled.amount > 0
        ? { mode, amount: settled.amount, elapsedMs: settled.elapsedMs }
        : null
    );
  }

  act(mode: IdleModeId, itemId: string, action: "buy" | "upgrade"): { ok: true; snapshot: IdleSnapshot } | { ok: false; error: string; snapshot: IdleSnapshot } {
    const now = this.now();
    const periodChanged = this.ensurePeriods(now);
    const settled = this.settle(mode, now);
    const fail = (error: string) => {
      if (periodChanged || settled.amount > 0) this.touch(now);
      return { ok: false as const, error, snapshot: this.buildSnapshot(null) };
    };
    const catalog = IDLE_CATALOG[mode];
    const index = catalog.findIndex((item) => item.id === itemId);
    const definition = catalog[index];
    if (!definition) return fail("Item não encontrado.");
    const state = this.data.modes[mode];
    const owned = state.items[itemId];
    const unlocked = index === 0 || state.items[catalog[index - 1].id]?.purchased;

    if (action === "buy") {
      if (owned.purchased) return fail("Esse item já foi comprado.");
      if (!unlocked) return fail("Compre o item anterior primeiro.");
      if (state.balance < definition.baseCost) return fail("Dinheiro interno insuficiente.");
      state.balance = safeMoney(state.balance - definition.baseCost);
      state.items[itemId] = { purchased: true, level: 1, purchasedAt: now };
    } else {
      if (!owned.purchased) return fail("Compre esse item antes de melhorar.");
      const cost = itemUpgradeCost(definition, owned.level);
      if (state.balance < cost) return fail("Dinheiro interno insuficiente.");
      state.balance = safeMoney(state.balance - cost);
      owned.level += 1;
      state.totalUpgrades += 1;
      this.addMetric(mode === "farm" ? "farmUpgrades" : "kittyUpgrades", 1, now);
    }

    this.evaluateAchievements(mode, now);
    this.touch(now);
    return { ok: true, snapshot: this.buildSnapshot(null) };
  }

  recordMinigameCompletion(gameId: GameId, rewardId: string, decisive: boolean): number {
    if (this.data.rewardedMatches.includes(rewardId)) return 0;
    const now = this.now();
    this.ensurePeriods(now);
    const config = MINIGAME_GLOBAL_REWARDS[gameId];
    const reward = config.completion + (decisive ? config.decisiveBonus : 0);
    this.data.rewardedMatches.push(rewardId);
    if (this.data.rewardedMatches.length > MAX_REWARDED_MATCHES) {
      this.data.rewardedMatches.splice(0, this.data.rewardedMatches.length - MAX_REWARDED_MATCHES);
    }
    this.awardGlobal(reward);
    this.addMetric("minigames", 1, now);
    this.touch(now);
    return reward;
  }

  resetGlobalCoins() {
    const now = this.now();
    this.data.globalCoins = 0;
    this.touch(now);
  }

  resetMode(mode: IdleModeId) {
    const now = this.now();
    this.data.modes[mode] = newMode(mode, now);
    for (const period of [this.data.objectives.daily, this.data.objectives.weekly]) {
      if (mode === "farm") {
        period.progress.farmEntries = 0;
        period.progress.farmUpgrades = 0;
        period.progress.farmEarnings = 0;
      } else {
        period.progress.kittyEntries = 0;
        period.progress.kittyUpgrades = 0;
        period.progress.kittyEarnings = 0;
      }
      for (const objective of RENEWABLE_OBJECTIVES) {
        if (objective.metric === "upgrades" || objective.metric === "earnings" || objective.metric === `${mode}Entries`) {
          delete period.completed[objective.id];
        }
      }
    }
    this.touch(now);
  }
}

export const idleStore = new IdleStore();
