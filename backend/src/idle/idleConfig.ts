import { GameId } from "../types";

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

export interface AchievementDefinition {
  id: string;
  mode: IdleModeId;
  title: string;
  description: string;
  iconItemId?: string;
  reward: number;
  condition:
    | { type: "own"; itemId: string }
    | { type: "ownedCount"; target: number }
    | { type: "production"; target: number }
    | { type: "level"; target: number }
    | { type: "ownAll" };
}

export interface RenewableObjectiveDefinition {
  id: string;
  period: "daily" | "weekly";
  title: string;
  description: string;
  metric: "farmEntries" | "kittyEntries" | "upgrades" | "earnings" | "minigames";
  target: number;
  reward: number;
}

export const IDLE_AREA_NAME = "Nosso Cantinho";
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1_000;
export const MAX_IDLE_MONEY = 1e300;

export const IDLE_CATALOG: Record<IdleModeId, IdleItemDefinition[]> = {
  farm: [
    { id: "garden", name: "Horta", asset: "/idle/farm/garden.webp", baseCost: 40, upgradeBaseCost: 80, baseProduction: 1.2, costGrowth: 1.62, productionGrowth: 1.18, unlockOrder: 0, scene: 0 },
    { id: "chicken-coop", name: "Galinheiro", asset: "/idle/farm/chicken-coop.webp", baseCost: 550, upgradeBaseCost: 720, baseProduction: 5, costGrowth: 1.63, productionGrowth: 1.185, unlockOrder: 1, scene: 0 },
    { id: "fruit-stand", name: "Barraca de frutas", asset: "/idle/farm/fruit-stand.webp", baseCost: 4_200, upgradeBaseCost: 5_200, baseProduction: 15, costGrowth: 1.64, productionGrowth: 1.19, unlockOrder: 2, scene: 0 },
    { id: "orchard", name: "Pomar", asset: "/idle/farm/orchard.webp", baseCost: 32_000, upgradeBaseCost: 39_000, baseProduction: 45, costGrowth: 1.64, productionGrowth: 1.19, unlockOrder: 3, scene: 0 },
    { id: "bakery", name: "Padaria", asset: "/idle/farm/bakery.webp", baseCost: 250_000, upgradeBaseCost: 300_000, baseProduction: 130, costGrowth: 1.65, productionGrowth: 1.195, unlockOrder: 4, scene: 1 },
    { id: "barn", name: "Celeiro", asset: "/idle/farm/barn.webp", baseCost: 2_000_000, upgradeBaseCost: 2_350_000, baseProduction: 380, costGrowth: 1.66, productionGrowth: 1.2, unlockOrder: 5, scene: 1 },
    { id: "windmill", name: "Moinho", asset: "/idle/farm/windmill.webp", baseCost: 16_000_000, upgradeBaseCost: 18_500_000, baseProduction: 1_100, costGrowth: 1.67, productionGrowth: 1.205, unlockOrder: 6, scene: 1 },
    { id: "market", name: "Mercadinho", asset: "/idle/farm/market.webp", baseCost: 130_000_000, upgradeBaseCost: 148_000_000, baseProduction: 3_300, costGrowth: 1.67, productionGrowth: 1.21, unlockOrder: 7, scene: 1 },
    { id: "greenhouse", name: "Estufa", asset: "/idle/farm/greenhouse.webp", baseCost: 1_100_000_000, upgradeBaseCost: 1_240_000_000, baseProduction: 10_000, costGrowth: 1.68, productionGrowth: 1.215, unlockOrder: 8, scene: 2 },
    { id: "main-farm", name: "Fazenda principal", asset: "/idle/farm/main-farm.webp", baseCost: 9_500_000_000, upgradeBaseCost: 10_500_000_000, baseProduction: 32_000, costGrowth: 1.69, productionGrowth: 1.22, unlockOrder: 9, scene: 2 },
  ],
  kitty: [
    { id: "hello-kitty", name: "Hello Kitty", asset: "/idle/characters/hello-kitty.webp", baseCost: 60, upgradeBaseCost: 120, baseProduction: 2, costGrowth: 1.62, productionGrowth: 1.18, unlockOrder: 0, scene: 0 },
    { id: "my-melody", name: "My Melody", asset: "/idle/characters/my-melody.webp", baseCost: 900, upgradeBaseCost: 1_150, baseProduction: 8, costGrowth: 1.63, productionGrowth: 1.185, unlockOrder: 1, scene: 0 },
    { id: "cinnamoroll", name: "Cinnamoroll", asset: "/idle/characters/cinnamoroll.webp", baseCost: 7_000, upgradeBaseCost: 8_600, baseProduction: 24, costGrowth: 1.64, productionGrowth: 1.19, unlockOrder: 2, scene: 0 },
    { id: "pompompurin", name: "Pompompurin", asset: "/idle/characters/pompompurin.webp", baseCost: 55_000, upgradeBaseCost: 66_000, baseProduction: 72, costGrowth: 1.64, productionGrowth: 1.19, unlockOrder: 3, scene: 0 },
    { id: "kuromi", name: "Kuromi", asset: "/idle/characters/kuromi.webp", baseCost: 440_000, upgradeBaseCost: 520_000, baseProduction: 210, costGrowth: 1.65, productionGrowth: 1.195, unlockOrder: 4, scene: 1 },
    { id: "keroppi", name: "Keroppi", asset: "/idle/characters/keroppi.webp", baseCost: 3_600_000, upgradeBaseCost: 4_200_000, baseProduction: 620, costGrowth: 1.66, productionGrowth: 1.2, unlockOrder: 5, scene: 1 },
    { id: "badtz-maru", name: "Badtz-Maru", asset: "/idle/characters/badtz-maru.webp", baseCost: 30_000_000, upgradeBaseCost: 34_500_000, baseProduction: 1_850, costGrowth: 1.67, productionGrowth: 1.205, unlockOrder: 6, scene: 1 },
    { id: "chococat", name: "Chococat", asset: "/idle/characters/chococat.webp", baseCost: 250_000_000, upgradeBaseCost: 284_000_000, baseProduction: 5_600, costGrowth: 1.67, productionGrowth: 1.21, unlockOrder: 7, scene: 1 },
    { id: "pochacco", name: "Pochacco", asset: "/idle/characters/pochacco.webp", baseCost: 2_100_000_000, upgradeBaseCost: 2_350_000_000, baseProduction: 17_000, costGrowth: 1.68, productionGrowth: 1.215, unlockOrder: 8, scene: 2 },
    { id: "little-twin-stars", name: "Little Twin Stars", asset: "/idle/characters/little-twin-stars.webp", baseCost: 18_000_000_000, upgradeBaseCost: 19_800_000_000, baseProduction: 54_000, costGrowth: 1.69, productionGrowth: 1.22, unlockOrder: 9, scene: 2 },
  ],
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: "farm-first-garden", mode: "farm", title: "Primeira colheita", description: "Tenha a primeira Horta", iconItemId: "garden", reward: 5, condition: { type: "own", itemId: "garden" } },
  { id: "farm-chicken-coop", mode: "farm", title: "Có-có compartilhado", description: "Compre o Galinheiro", iconItemId: "chicken-coop", reward: 15, condition: { type: "own", itemId: "chicken-coop" } },
  { id: "farm-bakery", mode: "farm", title: "Cheiro de pão", description: "Compre a Padaria", iconItemId: "bakery", reward: 25, condition: { type: "own", itemId: "bakery" } },
  { id: "farm-five", mode: "farm", title: "Fazendinha crescendo", description: "Tenha 5 produtores", reward: 35, condition: { type: "ownedCount", target: 5 } },
  { id: "farm-100", mode: "farm", title: "Cantinho produtivo", description: "Alcance 100/s", reward: 20, condition: { type: "production", target: 100 } },
  { id: "farm-1k", mode: "farm", title: "Renda farta", description: "Alcance 1K/s", reward: 35, condition: { type: "production", target: 1_000 } },
  { id: "farm-10k", mode: "farm", title: "Colheita dourada", description: "Alcance 10K/s", reward: 60, condition: { type: "production", target: 10_000 } },
  { id: "farm-level-10", mode: "farm", title: "Mãos experientes", description: "Leve um produtor ao nível 10", reward: 30, condition: { type: "level", target: 10 } },
  { id: "farm-all", mode: "farm", title: "Nosso império rural", description: "Compre todos os produtores", reward: 80, condition: { type: "ownAll" } },
  { id: "kitty-first", mode: "kitty", title: "Primeira amizade", description: "Tenha a Hello Kitty", iconItemId: "hello-kitty", reward: 5, condition: { type: "own", itemId: "hello-kitty" } },
  { id: "kitty-melody", mode: "kitty", title: "Doce melodia", description: "Desbloqueie My Melody", iconItemId: "my-melody", reward: 15, condition: { type: "own", itemId: "my-melody" } },
  { id: "kitty-three", mode: "kitty", title: "Turminha cozy", description: "Tenha 3 personagens", reward: 20, condition: { type: "ownedCount", target: 3 } },
  { id: "kitty-five", mode: "kitty", title: "Casa cheia", description: "Tenha 5 personagens", reward: 35, condition: { type: "ownedCount", target: 5 } },
  { id: "kitty-100", mode: "kitty", title: "Carinho que rende", description: "Alcance 100/s", reward: 20, condition: { type: "production", target: 100 } },
  { id: "kitty-1k", mode: "kitty", title: "Amizade valiosa", description: "Alcance 1K/s", reward: 35, condition: { type: "production", target: 1_000 } },
  { id: "kitty-10k", mode: "kitty", title: "Estrelas brilhantes", description: "Alcance 10K/s", reward: 60, condition: { type: "production", target: 10_000 } },
  { id: "kitty-level-10", mode: "kitty", title: "Melhores amigos", description: "Leve uma personagem ao nível 10", reward: 30, condition: { type: "level", target: 10 } },
  { id: "kitty-all", mode: "kitty", title: "Turma completa", description: "Tenha todos os personagens", reward: 80, condition: { type: "ownAll" } },
];

export const RENEWABLE_OBJECTIVES: RenewableObjectiveDefinition[] = [
  { id: "daily-farm-entry", period: "daily", title: "Bom dia, fazendinha!", description: "Entre na Fazendinha hoje", metric: "farmEntries", target: 1, reward: 5 },
  { id: "daily-kitty-entry", period: "daily", title: "Visita cheia de carinho", description: "Entre no Mundo da Hello Kitty hoje", metric: "kittyEntries", target: 1, reward: 5 },
  { id: "daily-upgrades", period: "daily", title: "Pequenas melhorias", description: "Faça 3 melhorias", metric: "upgrades", target: 3, reward: 10 },
  { id: "daily-earnings", period: "daily", title: "Rendendo juntinhos", description: "Ganhe 5K de dinheiro interno", metric: "earnings", target: 5_000, reward: 15 },
  { id: "daily-minigame", period: "daily", title: "Uma partida a dois", description: "Conclua 1 minigame", metric: "minigames", target: 1, reward: 10 },
  { id: "weekly-upgrades", period: "weekly", title: "Semana de evolução", description: "Faça 15 melhorias", metric: "upgrades", target: 15, reward: 40 },
  { id: "weekly-earnings", period: "weekly", title: "Cofrinho da semana", description: "Ganhe 500K de dinheiro interno", metric: "earnings", target: 500_000, reward: 60 },
  { id: "weekly-minigames", period: "weekly", title: "Dupla em ação", description: "Conclua 5 minigames", metric: "minigames", target: 5, reward: 50 },
];

export const MINIGAME_GLOBAL_REWARDS: Record<GameId, { completion: number; decisiveBonus: number }> = {
  colors: { completion: 6, decisiveBonus: 2 }, termo: { completion: 7, decisiveBonus: 2 },
  memory: { completion: 8, decisiveBonus: 3 }, airhockey: { completion: 8, decisiveBonus: 3 },
  quiz: { completion: 10, decisiveBonus: 3 }, whoami: { completion: 10, decisiveBonus: 3 },
  sudoku: { completion: 12, decisiveBonus: 3 }, crossword: { completion: 12, decisiveBonus: 3 },
  wordsearch: { completion: 12, decisiveBonus: 3 }, boardrace: { completion: 13, decisiveBonus: 4 },
  chess: { completion: 15, decisiveBonus: 5 }, puzzle: { completion: 16, decisiveBonus: 0 },
  drawguess: { completion: 15, decisiveBonus: 4 }, casino: { completion: 17, decisiveBonus: 4 },
  rpg: { completion: 20, decisiveBonus: 6 },
};

export function itemProduction(item: IdleItemDefinition, level: number): number {
  if (level <= 0) return 0;
  return item.baseProduction * Math.pow(item.productionGrowth, level - 1);
}

export function itemUpgradeCost(item: IdleItemDefinition, level: number): number {
  return Math.ceil(item.upgradeBaseCost * Math.pow(item.costGrowth, Math.max(0, level - 1)));
}

export function itemClickReward(item: IdleItemDefinition, level: number): number {
  return Math.max(1, Math.floor(itemProduction(item, level) * 0.08));
}
