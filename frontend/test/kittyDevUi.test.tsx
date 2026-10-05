import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import IdleModeScreen from "@/components/idle/IdleModeScreen";
import { GameEnvironment, IdleSnapshot, KittyDevCharacterSnapshot } from "@/lib/idleTypes";

const names = ["Hello Kitty", "Dear Daniel", "My Melody", "Mimmy", "Cinnamoroll", "Pompompurin", "Cinnamoroll com laço azul", "Pochacco", "Tiny Chum", "Keroppi", "Tuxedosam", "Mocha", "Baku", "Badtz-Maru", "Chococat", "Kuromi", "My Sweet Piano", "Charmmy Kitty", "Hello Kitty anjo", "Kuromi anjo", "My Melody anjo noturno", "Hello Kitty de gala", "Kuromi celestial", "Little Twin Stars: Kiki e Lala"];
const ids = ["hello-kitty", "dear-daniel", "my-melody", "mimmy", "cinnamoroll", "pompompurin", "cinnamoroll-blue-bow", "pochacco", "tiny-chum", "keroppi", "tuxedosam", "mocha", "baku", "badtz-maru", "chococat", "kuromi", "my-sweet-piano", "charmmy-kitty", "hello-kitty-angel", "kuromi-angel", "my-melody-dark-angel", "hello-kitty-gala", "kuromi-celestial", "little-twin-stars"];
const sceneNames = ["Sala dos Abraços", "Jardim dos Sonhos", "Prado Encantado", "Refúgio da Kuromi", "Café das Estrelas", "Salão Celestial", "Santuário das Estrelas"];

let currentSnapshot: IdleSnapshot;
const applySnapshot = vi.fn();
const kittyDevSetWorld = vi.fn(async (world: number | null) => { void world; return currentSnapshot; });

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/image", () => ({ default: ({ alt = "", src, className }: { alt?: string; src: string; className?: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} data-src={src} className={className} /> }));
vi.mock("@/lib/sound", () => ({ playSoundEffect: vi.fn() }));
vi.mock("@/lib/idleApi", async (original) => ({
  ...(await original<typeof import("@/lib/idleApi")>()),
  kittyDevSetWorld: (world: number | null) => kittyDevSetWorld(world),
}));
vi.mock("@/hooks/useIdleGame", () => ({
  useIdleGame: () => ({
    snapshot: currentSnapshot, accountId: "andre", milestone: null, error: null, loading: false, displayedBalance: 1e12,
    busyItemId: null, pendingUpgrades: {}, act: vi.fn(async () => true), upgradeRelic: vi.fn(async () => true),
    clickItem: vi.fn(async () => null), buyUpgrades: vi.fn(async () => true), applySnapshot,
  }),
}));

function devCharacter(index: number, level: number, stars = 0): KittyDevCharacterSnapshot {
  const item = (name: string, lvl: number, max: number) => ({ name, level: lvl, maxLevel: max, nextCost: lvl < max ? 1e13 : null, multiplier: 1 + .35 * lvl, nextMultiplier: lvl < max ? 1 + .35 * (lvl + 1) : null });
  return {
    id: ids[index], index, world: index === 23 ? 6 : Math.floor(index / 4), owned: level > 0, level, stars,
    nextStarCost: stars < 5 ? 2 + stars : null, starCosts: [2, 3, 4, 5, 6], starRequirements: [31, 40, 49, 58, 67],
    nextStarBonus: stars < 5 ? "+25% de valor por clique" : null,
    starBonuses: ["+25% de valor por clique", "+15% de produção", "+40% de valor por clique", "+25% de produção", "+50% de produção e +25% por clique"],
    clickItem: item(`Item de clique ${index}`, 0, 8), stoneItem: item(`Item estelar ${index}`, 0, 5),
    stoneYield: 1, stoneYieldEffective: 1, nextMilestoneLevel: (Math.floor(level / 10) + 1) * 10, productionMultiplier: 1, clickMultiplier: 1,
    awakening: index === 0 ? { cost: 2e18, multiplier: 1000, asset: "/idle/characters/awake/awake-hello-kitty.webp", awakened: false, unlocked: stars >= 5 } : null,
  };
}

function makeSnapshot(environment: GameEnvironment, unlockedWorlds = 3, lastWorld: number | null = null, kittyStars = 0): IdleSnapshot {
  const items = names.map((name, index) => ({
    purchased: index < unlockedWorlds * 4 && index < 24, level: index < unlockedWorlds * 4 ? 42 : 0, purchasedAt: 2,
    definition: { id: ids[index], name, asset: `/idle/characters/v2/p${String(index + 1).padStart(2, "0")}.webp`, baseCost: 10, upgradeBaseCost: 100, baseProduction: 1, costGrowth: 1.5, productionGrowth: 1.27, unlockOrder: index, scene: index === 23 ? 6 : Math.floor(index / 4) },
    production: 1, nextCost: 10, unlocked: true,
    upgradeQuotes: { one: { count: 1, totalCost: 100 }, ten: { count: 10, totalCost: 1000 }, max: { count: 10, totalCost: 1000 } },
    statistics: { passiveEarned: 0, clickEarned: 0, clicks: 0, largestClick: 0 },
  }));
  const kitty = {
    id: "kitty" as const, balance: 1e12, totalEarned: 0, totalProduction: 1, effectiveProduction: 1, clickMultiplier: 1, totalUpgrades: 0, visits: 1, totalClicks: 0, lastSettledAt: Date.now(), items,
    achievements: [], scenes: sceneNames.map((name, id) => ({ id, name, unlocked: id < unlockedWorlds })),
    statistics: { migrationStartedAt: Date.now(), todayKey: "2026-10-05", earnedToday: 0, passiveEarned: 0, clickEarned: 0, eventEarned: 0, offlineEarned: 0, activeTimeMs: 0, eventsCollected: 0, boostsCollected: 0, eventCounters: { money: 0, production2: 0, click2: 0, click3: 0, click5: 0, click10: 0 } },
    relics: [], clickActivity: {}, activeEvent: null, productionBoost: null, clickBoost: null,
    ...(environment === "dev" ? { kittyDev: { stones: 7, totalStones: 7, lastWorld, characters: Object.fromEntries(ids.map((id, index) => [id, devCharacter(index, items[index].level, index === 0 ? kittyStars : 0)])) } } : {}),
  };
  return { revision: 1, environment, areaName: "Teste", globalCoins: 5, globalLifetimeEarned: 5, updatedAt: Date.now(), offlineReward: null, purchasedPetDecorations: [], modes: { kitty, farm: { ...kitty, id: "farm" as const } }, objectives: { daily: [], weekly: [] } } as unknown as IdleSnapshot;
}

describe("Mundo da Hello Kitty — mecânicas experimentais (DEV)", () => {
  beforeEach(() => { vi.useFakeTimers(); applySnapshot.mockClear(); kittyDevSetWorld.mockClear(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("DEV: a aba inicial mostra a seleção com 7 ilhas e as não liberadas ficam bloqueadas", () => {
    currentSnapshot = makeSnapshot("dev", 3);
    render(<IdleModeScreen mode="kitty" environment="dev" />);
    const map = screen.getByRole("region", { name: "Seleção de ilhas" });
    const islands = within(map).getAllByRole("button");
    expect(islands).toHaveLength(7);
    expect(islands.filter((island) => island.getAttribute("data-locked") === "yes")).toHaveLength(4);
    expect(screen.queryByText("Combo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Próximo cenário" })).not.toBeInTheDocument();
    expect(screen.getByText("Saldo")).toBeInTheDocument();
    expect(screen.getByText("Produção")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegação do jogo idle" })).toBeInTheDocument();
  });

  it("DEV: ilha bloqueada só mostra dica; ilha liberada viaja e abre o mundo, salvando a ilha", () => {
    currentSnapshot = makeSnapshot("dev", 3);
    render(<IdleModeScreen mode="kitty" environment="dev" />);
    fireEvent.click(screen.getByRole("button", { name: "Ilha 5 bloqueada" }));
    expect(screen.getByRole("status")).toHaveTextContent(/liberar esta ilha/);
    expect(kittyDevSetWorld).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Ilha 2: Jardim dos Sonhos/ }));
    expect(screen.getByRole("region", { name: "Seleção de ilhas" })).toBeInTheDocument(); // animação em andamento
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(screen.queryByRole("region", { name: "Seleção de ilhas" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jardim dos Sonhos" })).toBeInTheDocument();
    expect(kittyDevSetWorld).toHaveBeenCalledWith(1);
    expect(screen.getByText("Combo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir constelações deste mundo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Próximo cenário" })).not.toBeInTheDocument();
  });

  it("DEV: volta direto para a última ilha visitada e o botão de mundo leva à seleção", () => {
    currentSnapshot = makeSnapshot("dev", 3, 2);
    render(<IdleModeScreen mode="kitty" environment="dev" />);
    expect(screen.getByRole("heading", { name: "Prado Encantado" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Escolher outro mundo" }));
    expect(screen.getByRole("region", { name: "Seleção de ilhas" })).toBeInTheDocument();
    expect(kittyDevSetWorld).toHaveBeenCalledWith(null);
  });

  it("DEV: ilha salva que ainda está bloqueada cai na seleção em vez de abrir mundo bloqueado", () => {
    currentSnapshot = makeSnapshot("dev", 2, 5);
    render(<IdleModeScreen mode="kitty" environment="dev" />);
    expect(screen.getByRole("region", { name: "Seleção de ilhas" })).toBeInTheDocument();
  });

  it("DEV: constelações abrem com pedras, abas dos personagens do mundo e requisito de nível", () => {
    currentSnapshot = makeSnapshot("dev", 3, 0);
    currentSnapshot.modes.kitty.items[0].level = 20; // abaixo do requisito (31) da 1ª estrela
    render(<IdleModeScreen mode="kitty" environment="dev" />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir constelações deste mundo" }));
    const dialog = screen.getByRole("dialog", { name: /Constelações de Sala dos Abraços/ });
    expect(within(dialog).getAllByRole("tab")).toHaveLength(4);
    expect(within(dialog).getByLabelText("7 Pedras Estelares")).toBeInTheDocument();
    expect(within(dialog).getAllByRole("button", { name: /Estrela \d/ })).toHaveLength(5);
    expect(within(dialog).getByText(/Suba Hello Kitty até o nível 31/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Evoluir para o nível 1/ })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Voltar para o mundo" }));
    expect(screen.queryByRole("dialog", { name: /Constelações/ })).not.toBeInTheDocument();
  });

  it("DEV: na aba Melhorias aparecem estrelas e os dois itens bloqueados; Despertar só com 5 estrelas", () => {
    currentSnapshot = makeSnapshot("dev", 3, 0, 2);
    const view = render(<IdleModeScreen mode="kitty" environment="dev" />);
    fireEvent.click(screen.getByRole("button", { name: "Melhorias" }));
    expect(screen.getByRole("img", { name: "2 de 5 estrelas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Item de clique 0: bloqueado/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Item estelar 0: bloqueado/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Despertar/ })).not.toBeInTheDocument();
    currentSnapshot = makeSnapshot("dev", 3, 0, 5);
    view.rerender(<IdleModeScreen mode="kitty" environment="dev" />);
    expect(screen.getByRole("button", { name: /Despertar/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Item de clique 0/ }));
    expect(screen.getByRole("dialog", { name: "Item de clique 0" })).toBeInTheDocument();
  });

  it("MODO NORMAL: nada muda — sem seleção de ilhas, sem constelações, com troca de cenário e menu antigo", () => {
    currentSnapshot = makeSnapshot("real", 3);
    render(<IdleModeScreen mode="kitty" />);
    expect(screen.queryByRole("region", { name: "Seleção de ilhas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abrir constelações deste mundo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Escolher outro mundo" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo cenário" })).toBeInTheDocument();
    expect(screen.getByText("Combo x1.0")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Melhorias" }));
    expect(screen.queryByRole("img", { name: /de 5 estrelas/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Despertar/ })).not.toBeInTheDocument();
  });

  it("MODO NORMAL: mesmo com campo kittyDev presente por engano, a UI nova não aparece", () => {
    currentSnapshot = makeSnapshot("dev", 3);
    render(<IdleModeScreen mode="kitty" environment="real" />);
    expect(screen.queryByRole("region", { name: "Seleção de ilhas" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo cenário" })).toBeInTheDocument();
  });
});
