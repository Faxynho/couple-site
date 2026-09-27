import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import IdleModeScreen from "@/components/idle/IdleModeScreen";
import { IdleSnapshot } from "@/lib/idleTypes";

const names = ["Hello Kitty", "Dear Daniel", "My Melody", "Mimmy", "Cinnamoroll", "Pompompurin", "Cinnamoroll com laço azul", "Pochacco", "Tiny Chum", "Keroppi", "Tuxedosam", "Mocha", "Baku", "Badtz-Maru", "Chococat", "Kuromi", "My Sweet Piano", "Charmmy Kitty", "Hello Kitty anjo", "Kuromi anjo", "My Melody anjo noturno", "Hello Kitty de gala", "Kuromi celestial", "Little Twin Stars: Kiki e Lala"];
const ids = ["hello-kitty", "dear-daniel", "my-melody", "mimmy", "cinnamoroll", "pompompurin", "cinnamoroll-blue-bow", "pochacco", "tiny-chum", "keroppi", "tuxedosam", "mocha", "baku", "badtz-maru", "chococat", "kuromi", "my-sweet-piano", "charmmy-kitty", "hello-kitty-angel", "kuromi-angel", "my-melody-dark-angel", "hello-kitty-gala", "kuromi-celestial", "little-twin-stars"];
let currentSnapshot: IdleSnapshot;

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/image", () => ({ default: ({ alt = "", src, className }: { alt?: string; src: string; className?: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} data-src={src} className={className} /> }));
vi.mock("@/lib/sound", () => ({ playSoundEffect: vi.fn() }));
vi.mock("@/hooks/useIdleGame", () => ({
  useIdleGame: () => ({
    snapshot: currentSnapshot,
    error: null,
    loading: false,
    displayedBalance: 1e12,
    busyItemId: null,
    pendingUpgrades: {},
    act: vi.fn(async () => true),
    upgradeRelic: vi.fn(async () => true),
    clickItem: vi.fn(async () => null),
  }),
}));

function makeSnapshot(purchasedFirst = false, completedFirst = false): IdleSnapshot {
  const items = names.map((name, index) => ({
    purchased: index === 0 && purchasedFirst,
    level: index === 0 && purchasedFirst ? 1 : 0,
    purchasedAt: index === 0 && purchasedFirst ? 2 : null,
    definition: {
      id: ids[index], name, asset: `/idle/characters/v2/p${String(index + 1).padStart(2, "0")}.webp`,
      baseCost: 10 ** (index + 1), upgradeBaseCost: 100, baseProduction: index + 1,
      costGrowth: 1.62, productionGrowth: 1.18, unlockOrder: index, scene: index === 23 ? 6 : Math.floor(index / 4),
    },
    production: index + 1,
    nextCost: 10 ** (index + 1),
    unlocked: index === 0,
    upgradeQuotes: { one: { count: 1, totalCost: 100 }, ten: { count: 10, totalCost: 1_000 }, max: { count: 10, totalCost: 1_000 } },
    statistics: { passiveEarned: 0, clickEarned: 0, clicks: 0, largestClick: 0 },
  }));
  const achievement = {
    id: "kitty-first", mode: "kitty" as const, title: "Primeira amizade", description: "Tenha a Hello Kitty",
    iconItemId: "hello-kitty", reward: 5, condition: { type: "own" as const, itemId: "hello-kitty" },
    completedAt: completedFirst ? 2 : null, progress: completedFirst ? 1 : 0, target: 1,
  };
  const kitty = {
    id: "kitty" as const, balance: 1e12, totalEarned: 0, totalProduction: purchasedFirst ? 1 : 0,
    effectiveProduction: purchasedFirst ? 1 : 0, clickMultiplier: 1,
    totalUpgrades: 0, visits: 1, totalClicks: 0, lastSettledAt: Date.now(), items,
    achievements: [achievement],
    scenes: ["Sala dos Abraços", "Jardim dos Sonhos", "Prado Encantado", "Refúgio da Kuromi", "Café das Estrelas", "Salão Celestial", "Santuário das Estrelas"].map((name, id) => ({ id, name, unlocked: id === 0 })),
    statistics: { migrationStartedAt: Date.now(), todayKey: "2026-09-26", earnedToday: 0, passiveEarned: 0, clickEarned: 0, eventEarned: 0, offlineEarned: 0, activeTimeMs: 0, eventsCollected: 0, boostsCollected: 0, eventCounters: { money: 0, production2: 0, click2: 0, click3: 0, click5: 0, click10: 0 }, largestClick: 0, highestProduction: purchasedFirst ? 1 : 0, items: {} },
    relics: Array.from({ length: 9 }, (_, i) => ({
      definition: { id: `kitty-${i}`, name: i === 8 ? "Castelo das Maravilhas" : `Relíquia ${i + 1}`,
        asset: `/idle/relics/${i === 7 ? "clique" : i === 8 ? "todososmundos" : `mundo${i + 1}`}.webp`,
        kind: (i === 7 ? "click" : i === 8 ? "global" : "scene") as "scene" | "click" | "global",
        scene: i < 7 ? i : undefined, unlockOrder: i === 7 ? 1 : i === 8 ? 8 : Math.min(23, i * 4),
        baseCost: 180, maxLevel: 4, description: "Multiplica a produção." },
      level: 0, multiplier: 1, nextCost: 180, unlocked: i === 0 && purchasedFirst,
    })), clickActivity: {}, activeEvent: null, productionBoost: null, clickBoost: null,
  };
  return {
    revision: completedFirst ? 2 : 1, environment: "real", areaName: "Fazendinhas", globalCoins: 5, globalLifetimeEarned: 5,
    updatedAt: Date.now(), offlineReward: null,
    purchasedPetDecorations: [],
    modes: { kitty, farm: { ...kitty, id: "farm" as const } },
    objectives: { daily: [], weekly: [] },
  };
}

describe("apresentação visual e celebrações do idle", () => {
  afterEach(() => cleanup());

  it("exibe nove relíquias, oculta artes futuras e mantém a Fazendinha com quatro abas", () => {
    currentSnapshot = makeSnapshot(true);
    const view = render(<IdleModeScreen mode="kitty" />);
    fireEvent.click(screen.getByRole("button", { name: "Relíquias" }));
    expect(screen.getByRole("region", { name: "Relíquias da Hello Kitty" })).toBeInTheDocument();
    expect(screen.getAllByText("Tesouro misterioso")).toHaveLength(8);
    expect(screen.getByText("Relíquia 1")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Relíquia misteriosa" })).toHaveLength(8);
    view.rerender(<IdleModeScreen mode="farm" />);
    expect(screen.queryByRole("button", { name: "Relíquias" })).not.toBeInTheDocument();
  });

  it("apresenta os 24 personagens com progressão até o tier celestial", () => {
    currentSnapshot = makeSnapshot();
    const view = render(<IdleModeScreen mode="kitty" />);
    fireEvent.click(screen.getByRole("button", { name: "Melhorias" }));
    const expectedTiers = names.map((_, index) => Math.floor(index / 4) + 1);
    names.forEach((name, index) => {
      fireEvent.click(screen.getByRole("button", { name: `Ver ${name}` }));
      expect(screen.getByText(name)).toBeInTheDocument();
      const carousel = document.querySelector("[data-prestige]");
      expect(carousel).toHaveAttribute("data-prestige", String(index));
      expect(carousel).toHaveAttribute("data-tier", String(expectedTiers[index]));
    });
    expect(document.querySelector('[style*="tier-6-celestial.webp"]')).toBeInTheDocument();
    expect(document.querySelectorAll("[data-prestige] i")).toHaveLength(0); // personagens ainda bloqueados não emitem partículas
    expect(screen.getByText("24/24")).toBeInTheDocument();
    currentSnapshot = makeSnapshot();
    currentSnapshot.modes.kitty.items[23].purchased = true;
    view.rerender(<IdleModeScreen mode="kitty" />);
    expect(document.querySelectorAll("[data-prestige] i")).toHaveLength(28);
  });

  it("enfileira desbloqueio antes da conquista sem sobrepor os diálogos", async () => {
    currentSnapshot = makeSnapshot();
    const view = render(<IdleModeScreen mode="kitty" />);
    currentSnapshot = makeSnapshot(true, true);
    view.rerender(<IdleModeScreen mode="kitty" />);

    const unlock = await screen.findByRole("dialog", { name: "Novo personagem desbloqueado" });
    expect(unlock).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Conquista alcançada" })).not.toBeInTheDocument();
    fireEvent.click(unlock);
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Conquista alcançada" })).toBeInTheDocument());
    expect(screen.queryByRole("dialog", { name: "Novo personagem desbloqueado" })).not.toBeInTheDocument();
  });

  it("reinicia o feedback visual em todos os taps rápidos", async () => {
    currentSnapshot = makeSnapshot(true, true);
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ cancel } as unknown as Animation));
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
    render(<IdleModeScreen mode="kitty" />);
    const character = screen.getByRole("button", { name: "Coletar com Hello Kitty" });
    for (let tap = 0; tap < 12; tap += 1) fireEvent.click(character, { clientX: 180, clientY: 380 });
    expect(animate).toHaveBeenCalledTimes(12);
    expect(cancel).toHaveBeenCalledTimes(11);
  });
});
