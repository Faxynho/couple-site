import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import IdleModeScreen from "@/components/idle/IdleModeScreen";
import { IdleSnapshot } from "@/lib/idleTypes";

const names = ["Hello Kitty", "My Melody", "Cinnamoroll", "Pompompurin", "Kuromi", "Keroppi", "Badtz-Maru", "Chococat", "Pochacco", "Little Twin Stars"];
const ids = ["hello-kitty", "my-melody", "cinnamoroll", "pompompurin", "kuromi", "keroppi", "badtz-maru", "chococat", "pochacco", "little-twin-stars"];
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
    clickItem: vi.fn(async () => null),
  }),
}));

function makeSnapshot(purchasedFirst = false, completedFirst = false): IdleSnapshot {
  const items = names.map((name, index) => ({
    purchased: index === 0 && purchasedFirst,
    level: index === 0 && purchasedFirst ? 1 : 0,
    purchasedAt: index === 0 && purchasedFirst ? 2 : null,
    definition: {
      id: ids[index], name, asset: `/idle/characters/${ids[index]}.webp`,
      baseCost: 10 ** (index + 1), upgradeBaseCost: 100, baseProduction: index + 1,
      costGrowth: 1.62, productionGrowth: 1.18, unlockOrder: index, scene: (index < 4 ? 0 : index < 8 ? 1 : 2) as 0 | 1 | 2,
    },
    production: index + 1,
    nextCost: 10 ** (index + 1),
    unlocked: index === 0,
  }));
  const achievement = {
    id: "kitty-first", mode: "kitty" as const, title: "Primeira amizade", description: "Tenha a Hello Kitty",
    iconItemId: "hello-kitty", reward: 5, condition: { type: "own" as const, itemId: "hello-kitty" },
    completedAt: completedFirst ? 2 : null, progress: completedFirst ? 1 : 0, target: 1,
  };
  const kitty = {
    id: "kitty" as const, balance: 1e12, totalEarned: 0, totalProduction: purchasedFirst ? 1 : 0,
    totalUpgrades: 0, visits: 1, totalClicks: 0, lastSettledAt: Date.now(), items,
    achievements: [achievement],
    scenes: [{ id: 0 as const, name: "Sala dos Abraços", unlocked: true }, { id: 1 as const, name: "Cantinho Encantado", unlocked: false }, { id: 2 as const, name: "Sótão das Estrelas", unlocked: false }],
  };
  return {
    revision: completedFirst ? 2 : 1, areaName: "Fazendinhas", globalCoins: 5, globalLifetimeEarned: 5,
    updatedAt: Date.now(), offlineReward: null,
    modes: { kitty, farm: { ...kitty, id: "farm" as const } },
    objectives: { daily: [], weekly: [] },
  };
}

describe("apresentação visual e celebrações do idle", () => {
  afterEach(() => cleanup());

  it("apresenta os dez personagens com progressão até o tier celestial", () => {
    currentSnapshot = makeSnapshot();
    render(<IdleModeScreen mode="kitty" />);
    fireEvent.click(screen.getByRole("button", { name: "Melhorias" }));
    const expectedTiers = [1, 1, 2, 2, 3, 3, 4, 4, 5, 6];
    names.forEach((name, index) => {
      fireEvent.click(screen.getByRole("button", { name: `Ver ${name}` }));
      expect(screen.getByText(name)).toBeInTheDocument();
      const carousel = document.querySelector("[data-prestige]");
      expect(carousel).toHaveAttribute("data-prestige", String(index));
      expect(carousel).toHaveAttribute("data-tier", String(expectedTiers[index]));
    });
    expect(document.querySelector('[data-src="/idle/rarity/tier-6-celestial.webp"]')).toBeInTheDocument();
    expect(document.querySelectorAll("[data-prestige] i")).toHaveLength(12);
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
