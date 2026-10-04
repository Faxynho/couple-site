import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import IdleModeScreen from "@/components/idle/IdleModeScreen";
import { IdleSnapshot, RenewableObjectiveSnapshot } from "@/lib/idleTypes";

const names = ["Hello Kitty", "Dear Daniel", "My Melody", "Mimmy", "Cinnamoroll", "Pompompurin"];
let currentSnapshot: IdleSnapshot;

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/image", () => ({ default: ({ alt = "", src, className }: { alt?: string; src: string; className?: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} data-src={src} className={className} /> }));
vi.mock("@/lib/sound", () => ({ playSoundEffect: vi.fn() }));
vi.mock("@/hooks/useIdleGame", () => ({
  useIdleGame: () => ({
    snapshot: currentSnapshot, accountId: null, milestone: null, error: null, loading: false, displayedBalance: 2_400_000_000_000,
    busyItemId: null, pendingUpgrades: {}, act: vi.fn(async () => true), upgradeRelic: vi.fn(async () => true),
    clickItem: vi.fn(async () => null), buyUpgrades: vi.fn(async () => true),
  }),
}));

function objective(id: string, period: "daily" | "weekly", title: string, progress: number, target: number, reward: number, metric = "kittyClicks", completedAt: number | null = null): RenewableObjectiveSnapshot {
  return { id, period, title, description: `Descrição de ${title}`, metric, target, reward, progress, completedAt, periodKey: "2026-10-03", periodEndsAt: Date.now() + (period === "daily" ? 23.5 * 3_600_000 : (5 * 24 + 23) * 3_600_000) };
}

function makeSnapshot(): IdleSnapshot {
  const items = names.map((name, index) => ({
    purchased: index < 2, level: index < 2 ? 50 : 0, purchasedAt: index < 2 ? 2 : null,
    definition: { id: `c${index}`, name, asset: `/c${index}.webp`, baseCost: 10 ** (index + 1), upgradeBaseCost: 100, baseProduction: 1, costGrowth: 1.5, productionGrowth: 1.2, unlockOrder: index, scene: 0 },
    production: 2_400_000, nextCost: 1_000, unlocked: index <= 2,
    upgradeQuotes: { one: { count: 1, totalCost: 1_000 }, ten: { count: 10, totalCost: 10_000 }, max: { count: 10, totalCost: 10_000 } },
    statistics: { passiveEarned: 0, clickEarned: 0, clicks: 0, largestClick: 0 },
  }));
  const achievements = [
    { id: "kitty-first", mode: "kitty" as const, title: "Primeira amizade", description: "Desbloqueie Hello Kitty", iconItemId: "c0", reward: 5, condition: { type: "own" as const, itemId: "c0" }, completedAt: 5, progress: 1, target: 1 },
    { id: "kitty-three", mode: "kitty" as const, title: "Turminha cozy", description: "Tenha 3 personagens", reward: 20, condition: { type: "ownedCount" as const, target: 3 }, completedAt: null, progress: 2, target: 3 },
    { id: "kitty-level-200", mode: "kitty" as const, title: "Amizade lendária", description: "Leve um personagem ao nível 200", reward: 1500, condition: { type: "level" as const, target: 200 }, completedAt: null, progress: 54, target: 200 },
    { id: "kitty-clicks-25k", mode: "kitty" as const, title: "Chuva de carinho", description: "Faça 25K de cliques em personagens", reward: 350, condition: { type: "clicks" as const, target: 25_000 }, completedAt: null, progress: 20_000, target: 25_000 },
    { id: "kitty-relics-all", mode: "kitty" as const, title: "Colecionador de relíquias", description: "Desbloqueie todas as relíquias", reward: 500, condition: { type: "relicsOwned" as const }, completedAt: null, progress: 4, target: 9 },
  ];
  const kitty = {
    id: "kitty" as const, balance: 2.4e12, totalEarned: 0, totalProduction: 4_800_000, effectiveProduction: 4_800_000, clickMultiplier: 1,
    totalUpgrades: 0, visits: 1, totalClicks: 0, lastSettledAt: Date.now(), items, achievements,
    scenes: [{ id: 0, name: "Sala dos Abraços", unlocked: true }],
    statistics: { migrationStartedAt: Date.now(), todayKey: "2026-10-03", earnedToday: 0, passiveEarned: 0, clickEarned: 0, eventEarned: 0, offlineEarned: 0, activeTimeMs: 0, eventsCollected: 0, boostsCollected: 0, eventCounters: { money: 0, production2: 0, click2: 0, click3: 0, click5: 0, click10: 0 }, largestClick: 0, highestProduction: 0, items: {} },
    relics: [], clickActivity: {}, activeEvent: null, productionBoost: null, clickBoost: null,
  };
  const farmDaily = [objective("daily-farm-entry", "daily", "Bom dia, fazendinha!", 0, 1, 5, "farmEntries")];
  return {
    revision: 1, environment: "real", areaName: "Fazendinhas", globalCoins: 372, globalLifetimeEarned: 372, updatedAt: Date.now(), offlineReward: null,
    purchasedPetDecorations: [], modes: { kitty, farm: { ...kitty, id: "farm" as const } },
    objectives: { daily: farmDaily, weekly: [] },
    kittyObjectives: {
      daily: [
        objective("a", "daily", "Mãozinha carinhosa", 60, 60, 8, "kittyClicks", 9),
        objective("b", "daily", "Caça-tesouros", 1, 2, 10, "kittyEvents"),
        objective("c", "daily", "Hora de jogar", 0, 1, 10, "minigames"),
        objective("d", "daily", "Combo fofinho", 3, 15, 8, "kittyBestCombo"),
      ],
      weekly: [
        objective("e", "weekly", "Cofrinho da semana", 5, 100, 60, "kittyEarnings"),
        objective("f", "weekly", "Semana carinhosa", 0, 800, 45),
        objective("g", "weekly", "Mestres do turbo", 2, 8, 50, "kittyBoosts"),
      ],
    },
  };
}

describe("abas Melhorias e Conquistas do Mundo da Hello Kitty", () => {
  afterEach(() => cleanup());

  it("Melhorias: nome e nível no topo, dinheiro interno no lugar da moeda global, produção em destaque embaixo", () => {
    currentSnapshot = makeSnapshot();
    render(<IdleModeScreen mode="kitty" />);
    fireEvent.click(screen.getByRole("button", { name: "Melhorias" }));
    const header = screen.getByRole("banner");
    expect(within(header).getByText("Hello Kitty")).toBeInTheDocument();
    expect(within(header).getByText("Nível 50")).toBeInTheDocument();
    const money = within(header).getByLabelText("2,4T de dinheiro interno");
    expect(money.querySelector('[data-src="/idle/icons/game-money.webp"]')).toBeInTheDocument();
    expect(within(header).queryByLabelText(/moedas globais/)).not.toBeInTheDocument();
    expect(screen.queryByText("Dinheiro interno")).not.toBeInTheDocument();
    expect(screen.queryByText("Produção/s")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Produção de 2,4M por segundo")).toHaveTextContent("2,4M/s");
    expect(screen.getByText("Produção")).toBeInTheDocument();
    expect(document.querySelector('[data-src="/idle/icons/production.webp"]')).toBeInTheDocument();
    // seletor x1/x10/Máx. e as bolinhas continuam
    for (const label of ["x1", "x10", "Máx."]) expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Ver / })).toHaveLength(names.length);
    expect(screen.getByRole("button", { name: /Melhorar x1/ })).toBeInTheDocument();
  });

  it("Melhorias: botão Melhorar numa linha só, com o custo e o sprite dentro do próprio botão", () => {
    currentSnapshot = makeSnapshot();
    render(<IdleModeScreen mode="kitty" />);
    fireEvent.click(screen.getByRole("button", { name: "Melhorias" }));
    const button = screen.getByRole("button", { name: /Melhorar x1/ });
    expect(within(button).getByText("Melhorar x1")).toBeInTheDocument();
    expect(within(button).getByText("1K")).toBeInTheDocument();
    expect(button.querySelector("br")).toBeNull();
    expect(button.querySelector("small")).toBeNull();
    // texto e custo são irmãos na mesma linha flex do botão (nada em coluna)
    expect(within(button).getByText("Melhorar x1").parentElement).toBe(button);
    expect(within(button).getByText("1K").parentElement?.parentElement).toBe(button);
  });

  it("Melhorias: efeitos decorativos ficam só no painel da UI e são escondidos de leitores de tela", () => {
    currentSnapshot = makeSnapshot();
    render(<IdleModeScreen mode="kitty" />);
    fireEvent.click(screen.getByRole("button", { name: "Melhorias" }));
    const panel = screen.getByRole("button", { name: /Melhorar x1/ }).parentElement as HTMLElement;
    expect(panel.querySelectorAll('div[aria-hidden="true"] svg').length).toBeGreaterThanOrEqual(6);
    const carousel = document.querySelector("[data-tier]")?.closest("section");
    expect(carousel).toBeInTheDocument();
  });

  it("Melhorias: ao trocar de personagem pelas bolinhas, o topo acompanha (nome e selo)", () => {
    currentSnapshot = makeSnapshot();
    render(<IdleModeScreen mode="kitty" />);
    fireEvent.click(screen.getByRole("button", { name: "Melhorias" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver My Melody" }));
    const header = screen.getByRole("banner");
    expect(within(header).getByText("My Melody")).toBeInTheDocument();
    expect(within(header).getByText("Disponível")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver Mimmy" }));
    expect(within(header).getByText("Bloqueado")).toBeInTheDocument();
    expect(screen.getByText("4/6")).toBeInTheDocument();
  });

  it("Melhorias da Fazendinha continuam como antes (saldo e produção no resumo, moeda global no topo)", () => {
    currentSnapshot = makeSnapshot();
    render(<IdleModeScreen mode="farm" />);
    fireEvent.click(screen.getByRole("button", { name: "Melhorias" }));
    expect(screen.getByText("Dinheiro interno")).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).getByLabelText("372 moedas globais")).toBeInTheDocument();
  });

  it("Conquistas: missões diárias primeiro, depois semanais e permanentes, com moeda global no topo", () => {
    currentSnapshot = makeSnapshot();
    render(<IdleModeScreen mode="kitty" />);
    fireEvent.click(screen.getByRole("button", { name: "Conquistas" }));
    expect(within(screen.getByRole("banner")).getByLabelText("372 moedas globais")).toBeInTheDocument();
    const sections = screen.getAllByRole("region").map((region) => region.getAttribute("aria-label"));
    expect(sections.indexOf("Missões Diárias")).toBeLessThan(sections.indexOf("Missões Semanais"));
    expect(sections.indexOf("Missões Semanais")).toBeLessThan(sections.indexOf("Conquistas permanentes"));
    const daily = screen.getByRole("region", { name: "Missões Diárias" });
    const weekly = screen.getByRole("region", { name: "Missões Semanais" });
    expect(daily.querySelectorAll("[data-objective-id]")).toHaveLength(4);
    expect(weekly.querySelectorAll("[data-objective-id]")).toHaveLength(3);
    expect(within(daily).getByText("23h 30m")).toBeInTheDocument();
    expect(within(weekly).getByText("5d 23h")).toBeInTheDocument();
    expect(within(daily).getAllByText("Feita")).toHaveLength(1);
    expect(within(daily).getAllByText("Em progresso")).toHaveLength(3);
    expect(within(daily).getByLabelText("Progresso de Caça-tesouros")).toHaveAttribute("aria-valuenow", "1");
    expect(within(daily).getByText("1/2")).toBeInTheDocument();
    expect(within(daily).getByText("60/60")).toBeInTheDocument();
    expect(within(weekly).getByText("5/100")).toBeInTheDocument();
  });

  it("Conquistas: permanentes em cards, sem dinheiro interno no topo", () => {
    currentSnapshot = makeSnapshot();
    render(<IdleModeScreen mode="kitty" />);
    fireEvent.click(screen.getByRole("button", { name: "Conquistas" }));
    const permanent = screen.getByRole("region", { name: "Conquistas permanentes" });
    expect(within(permanent).getByText("1/5")).toBeInTheDocument();
    expect(permanent.querySelectorAll("[data-achievement-id]")).toHaveLength(5);
    expect(within(permanent).getByText("Primeira amizade")).toBeInTheDocument();
    expect(within(permanent).getByText("Feita")).toBeInTheDocument();
    expect(within(permanent).getByText("+20")).toBeInTheDocument();
    expect(screen.queryByLabelText(/de dinheiro interno/)).not.toBeInTheDocument();
  });

  it("Conquistas: novas conquistas permanentes aparecem com recompensa, progresso e arte própria", () => {
    currentSnapshot = makeSnapshot();
    render(<IdleModeScreen mode="kitty" />);
    fireEvent.click(screen.getByRole("button", { name: "Conquistas" }));
    const permanent = screen.getByRole("region", { name: "Conquistas permanentes" });
    const level = permanent.querySelector('[data-achievement-id="kitty-level-200"]') as HTMLElement;
    expect(within(level).getByText("Amizade lendária")).toBeInTheDocument();
    expect(within(level).getByText("Leve um personagem ao nível 200")).toBeInTheDocument();
    expect(within(level).getByText("+1500")).toBeInTheDocument();
    expect(level.querySelector("svg")).toBeInTheDocument(); // medalha
    const clicks = permanent.querySelector('[data-achievement-id="kitty-clicks-25k"]') as HTMLElement;
    expect(within(clicks).getByText("+350")).toBeInTheDocument();
    expect(clicks.querySelector('[data-src="/idle/relics/clique.webp"]')).toBeInTheDocument();
    const relics = permanent.querySelector('[data-achievement-id="kitty-relics-all"]') as HTMLElement;
    expect(relics.querySelector('[data-src="/idle/relics/todososmundos.webp"]')).toBeInTheDocument();
  });

  it("Conquistas: cai para a lista antiga se o servidor ainda não enviar as missões da Hello Kitty", () => {
    currentSnapshot = makeSnapshot();
    delete currentSnapshot.kittyObjectives;
    render(<IdleModeScreen mode="kitty" />);
    fireEvent.click(screen.getByRole("button", { name: "Conquistas" }));
    expect(screen.getByRole("region", { name: "Missões Diárias" }).querySelectorAll("[data-objective-id]")).toHaveLength(1);
  });

  it("Conquistas da Fazendinha continuam com a lista antiga", () => {
    currentSnapshot = makeSnapshot();
    render(<IdleModeScreen mode="farm" />);
    fireEvent.click(screen.getByRole("button", { name: "Conquistas" }));
    expect(screen.getByText("Objetivos diários")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Missões Diárias" })).not.toBeInTheDocument();
  });
});
