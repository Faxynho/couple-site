import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useIdleGame } from "@/hooks/useIdleGame";
import { IdleSnapshot } from "@/lib/idleTypes";

const mocks = vi.hoisted(() => ({
  snapshot: null as IdleSnapshot | null,
  upgradeBatch: vi.fn(),
}));

vi.mock("@/lib/accountSession", () => ({ getActiveAccount: () => ({ type: "account", id: "andre" }) }));
vi.mock("@/lib/socket", () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }));
vi.mock("@/lib/idleApi", () => ({
  enterIdleMode: vi.fn(async () => mocks.snapshot),
  fetchIdleSnapshot: vi.fn(async () => mocks.snapshot),
  idleClick: vi.fn(),
  idleItemAction: vi.fn(),
  idleUpgradeBatch: (...args: unknown[]) => mocks.upgradeBatch(...args),
}));

function snapshot(balance = 5_000): IdleSnapshot {
  const definition = { id: "garden", name: "Horta", asset: "/garden.webp", baseCost: 40, upgradeBaseCost: 80, baseProduction: 1.2, costGrowth: 1.62, productionGrowth: 1.18, unlockOrder: 0, scene: 0 as const };
  const mode = {
    id: "farm" as const,
    balance,
    totalEarned: 0,
    totalProduction: 1.2,
    totalUpgrades: 0,
    visits: 1,
    totalClicks: 0,
    lastSettledAt: Date.now(),
    effectiveProduction: 1.2,
    clickMultiplier: 1,
    items: [{ purchased: true, level: 1, purchasedAt: Date.now(), definition, production: 1.2, nextCost: 80, unlocked: true,
      upgradeQuotes: { one: { count: 1, totalCost: 80 }, ten: { count: 10, totalCost: 800 }, max: { count: 10, totalCost: 800 } },
      statistics: { passiveEarned: 0, clickEarned: 0, clicks: 0, largestClick: 0 } }],
    achievements: [],
    scenes: [{ id: 0 as const, name: "Vale das Flores", unlocked: true }, { id: 1 as const, name: "Vila da Colheita", unlocked: false }, { id: 2 as const, name: "Mirante Dourado", unlocked: false }],
    statistics: { migrationStartedAt: Date.now(), todayKey: "2026-09-26", earnedToday: 0, passiveEarned: 0, clickEarned: 0, eventEarned: 0, offlineEarned: 0, activeTimeMs: 0, eventsCollected: 0, boostsCollected: 0, eventCounters: { money: 0, production2: 0, click2: 0, click3: 0, click5: 0, click10: 0 }, largestClick: 0, highestProduction: 1.2, items: {} },
    activeEvent: null,
    productionBoost: null,
    clickBoost: null,
  };
  return {
    revision: 1,
    environment: "real",
    areaName: "Fazendinhas",
    globalCoins: 0,
    globalLifetimeEarned: 0,
    updatedAt: Date.now(),
    offlineReward: null,
    purchasedPetDecorations: [],
    modes: { farm: mode, kitty: { ...mode, id: "kitty" as const } },
    objectives: { daily: [], weekly: [] },
  };
}

describe("melhorias rápidas do idle", () => {
  beforeEach(() => {
    mocks.snapshot = snapshot();
    mocks.upgradeBatch.mockReset();
    mocks.upgradeBatch.mockImplementation(async (_account: string, _mode: string, _item: string, count: number) => ({
      ok: true,
      applied: count,
      requested: count,
      snapshot: { ...mocks.snapshot!, revision: 2 },
    }));
  });

  afterEach(() => cleanup());

  it("agrupa taps consecutivos sem bloquear o botão", async () => {
    const { result } = renderHook(() => useIdleGame("farm"));
    await waitFor(() => expect(result.current.snapshot).not.toBeNull());
    await act(async () => {
      expect(await result.current.act("garden", "upgrade")).toBe(true);
      expect(await result.current.act("garden", "upgrade")).toBe(true);
      expect(await result.current.act("garden", "upgrade")).toBe(true);
      expect(await result.current.act("garden", "upgrade")).toBe(true);
    });
    expect(result.current.pendingUpgrades.garden).toBe(4);
    await waitFor(() => expect(mocks.upgradeBatch).toHaveBeenCalledWith("andre", "farm", "garden", 4, "real"));
  });

  it("aceita somente os taps financiáveis e avisa quando o saldo acaba", async () => {
    mocks.snapshot = snapshot(80);
    const { result } = renderHook(() => useIdleGame("farm"));
    await waitFor(() => expect(result.current.snapshot).not.toBeNull());
    await act(async () => {
      expect(await result.current.act("garden", "upgrade")).toBe(true);
      expect(await result.current.act("garden", "upgrade")).toBe(false);
    });
    expect(result.current.error).toBe("Dinheiro interno insuficiente.");
    await waitFor(() => expect(mocks.upgradeBatch).toHaveBeenCalledWith("andre", "farm", "garden", 1, "real"));
  });
});
