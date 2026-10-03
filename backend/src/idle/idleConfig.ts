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
  scene: number;
  clickShare?: number;
}

export interface KittyRelicDefinition {
  id: string;
  name: string;
  asset: string;
  kind: "scene" | "click" | "global";
  scene?: number;
  unlockOrder: number;
  baseCost: number;
  maxLevel: number;
  description: string;
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

export const IDLE_AREA_NAME = "Fazendinhas";
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1_000;
export const MAX_IDLE_MONEY = 1e300;
export const IDLE_EVENT_MIN_ACTIVITY_MS = 50_000;
export const IDLE_EVENT_MAX_ACTIVITY_MS = 110_000;
export const IDLE_EVENT_VISIBLE_MS = 60_000;
export const PRODUCTION_BOOST_MS = 90_000;
export const CLICK_BOOST_DURATIONS = { click2: 60_000, click3: 45_000, click5: 30_000, click10: 20_000 } as const;
export type IdleEventType = "money" | "production2" | keyof typeof CLICK_BOOST_DURATIONS;
export const IDLE_EVENT_WEIGHTS: ReadonlyArray<{ type: IdleEventType; weight: number }> = [
  { type: "money", weight: 35 },
  { type: "production2", weight: 25 },
  { type: "click2", weight: 20 },
  { type: "click3", weight: 11 },
  { type: "click5", weight: 6 },
  { type: "click10", weight: 3 },
];

export const IDLE_SCENES: Record<IdleModeId, Array<{ id: number; name: string }>> = {
  farm: [
    { id: 0, name: "Vale das Flores" },
    { id: 1, name: "Vila da Colheita" },
    { id: 2, name: "Mirante Dourado" },
  ],
  kitty: [
    { id: 0, name: "Sala dos Abraços" },
    { id: 1, name: "Jardim dos Sonhos" },
    { id: 2, name: "Prado Encantado" },
    { id: 3, name: "Refúgio da Kuromi" },
    { id: 4, name: "Café das Estrelas" },
    { id: 5, name: "Salão Celestial" },
    { id: 6, name: "Santuário das Estrelas" },
  ],
};

// P1–P24: ordem oficial do ZIP. Mantenha IDs únicos para preservar saves após a migração.
// A cena vem da posição (4 por cena, com 3 na sexta e 1 na última).
// Preço do próximo personagem = produção BASE do anterior × horas de espera de referência.
// Melhorias, cliques e eventos encurtam esse tempo; as horas não são um bloqueio temporal.
export const KITTY_CHARACTER_SEQUENCE = [
  { id: "hello-kitty", name: "Hello Kitty", asset: "/idle/characters/v2/p01.webp", scene: 0 }, // P1
  { id: "dear-daniel", name: "Dear Daniel", asset: "/idle/characters/v2/p02.webp", scene: 0 }, // P2
  { id: "my-melody", name: "My Melody", asset: "/idle/characters/v2/p03.webp", scene: 0 }, // P3
  { id: "mimmy", name: "Mimmy", asset: "/idle/characters/v2/p04.webp", scene: 0 }, // P4
  { id: "cinnamoroll", name: "Cinnamoroll", asset: "/idle/characters/v2/p05.webp", scene: 1 }, // P5
  { id: "pompompurin", name: "Pompompurin", asset: "/idle/characters/v2/p06.webp", scene: 1 }, // P6
  { id: "cinnamoroll-blue-bow", name: "Cinnamoroll com laço azul", asset: "/idle/characters/v2/p07.webp", scene: 1 }, // P7
  { id: "pochacco", name: "Pochacco", asset: "/idle/characters/v2/p08.webp", scene: 1 }, // P8
  { id: "tiny-chum", name: "Tiny Chum", asset: "/idle/characters/v2/p09.webp", scene: 2 }, // P9
  { id: "keroppi", name: "Keroppi", asset: "/idle/characters/v2/p10.webp", scene: 2 }, // P10
  { id: "tuxedosam", name: "Tuxedosam", asset: "/idle/characters/v2/p11.webp", scene: 2 }, // P11
  { id: "mocha", name: "Mocha", asset: "/idle/characters/v2/p12.webp", scene: 2 }, // P12
  { id: "baku", name: "Baku", asset: "/idle/characters/v2/p13.webp", scene: 3 }, // P13
  { id: "badtz-maru", name: "Badtz-Maru", asset: "/idle/characters/v2/p14.webp", scene: 3 }, // P14
  { id: "chococat", name: "Chococat", asset: "/idle/characters/v2/p15.webp", scene: 3 }, // P15
  { id: "kuromi", name: "Kuromi", asset: "/idle/characters/v2/p16.webp", scene: 3 }, // P16
  { id: "my-sweet-piano", name: "My Sweet Piano", asset: "/idle/characters/v2/p17.webp", scene: 4 }, // P17
  { id: "charmmy-kitty", name: "Charmmy Kitty", asset: "/idle/characters/v2/p18.webp", scene: 4 }, // P18
  { id: "hello-kitty-angel", name: "Hello Kitty anjo", asset: "/idle/characters/v2/p19.webp", scene: 4 }, // P19
  { id: "kuromi-angel", name: "Kuromi anjo", asset: "/idle/characters/v2/p20.webp", scene: 4 }, // P20
  { id: "my-melody-dark-angel", name: "My Melody anjo noturno", asset: "/idle/characters/v2/p21.webp", scene: 5 }, // P21
  { id: "hello-kitty-gala", name: "Hello Kitty de gala", asset: "/idle/characters/v2/p22.webp", scene: 5 }, // P22
  { id: "kuromi-celestial", name: "Kuromi celestial", asset: "/idle/characters/v2/p23.webp", scene: 5 }, // P23
  { id: "little-twin-stars", name: "Little Twin Stars: Kiki e Lala", asset: "/idle/characters/v2/p24.webp", scene: 6 }, // P24: cena final exclusiva
 ] as const;

// P1–P17 mantêm os preços atuais para preservar o ritmo já vivido pelos jogadores.
  // A partir de P18, a campanha entra no late game com marcos explícitos e
  // intervalos maiores entre personagens. Isso altera somente compras futuras:
  // IDs, níveis, produção e moedas já salvas não são resetados.
  //
  // Curva de teste planejada:
  // P18 114T → P19 650T → P20 2Q → P21 6Q → P22 15Q → P23 35Q → P24 75Q.
  const KITTY_LATE_GAME_COSTS: Record<number, number> = {
    17: 114_000_000_000_000, // P18 Charmmy Kitty: 114 trilhões
    18: 650_000_000_000_000, // P19 Hello Kitty anjo: 650 trilhões
    19: 2_000_000_000_000_000, // P20 Kuromi anjo: 2 quadrilhões
    20: 6_000_000_000_000_000, // P21 My Melody anjo noturno: 6 quadrilhões
    21: 15_000_000_000_000_000, // P22 Hello Kitty de gala: 15 quadrilhões
    22: 35_000_000_000_000_000, // P23 Kuromi celestial: 35 quadrilhões
    23: 75_000_000_000_000_000, // P24 Little Twin Stars: 75 quadrilhões
  };

function kittyCharacter(index: number): IdleItemDefinition {
  const character = KITTY_CHARACTER_SEQUENCE[index];
  const previousProduction = 2 * Math.pow(2.7, index - 1);
  const lateGameFactor = 1 + .4 * Math.min(1, Math.max(0, (index - 3) / 2));
  // A curva original permanece intacta até P17.
  const relicCurve = Math.pow(1.13, Math.max(0, index - 4));
  const generatedCost = index === 0 ? 60 : Math.ceil(previousProduction * (1.5 * index * lateGameFactor * 3600) * relicCurve);
  const baseCost = KITTY_LATE_GAME_COSTS[index] ?? generatedCost;
  return {
    ...character, unlockOrder: index, baseCost,
    upgradeBaseCost: index === 0 ? 105 : Math.ceil(baseCost * .11),
    baseProduction: 2 * Math.pow(2.7, index),
    // Aumenta gradualmente o preço das melhorias no fim sem alterar níveis existentes.
    costGrowth: index >= 17 ? 1.68 : 1.52,
    productionGrowth: 1.27, clickShare: .75,
  };
}

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
  kitty: KITTY_CHARACTER_SEQUENCE.map((_, index) => kittyCharacter(index)),
};

// Relíquias afetam apenas as sete cenas da Hello Kitty. A partir da cena 5,
// o preço inicial acompanha o próximo marco de personagem para que a escolha
// "personagem × melhoria × relíquia" continue relevante no late game.
const RELIC_NAMES = [
  "Laço dos Abraços", "Morango dos Sonhos", "Patinha do Prado",
  "Varinha do Refúgio", "Doçura Estelar", "Chá das Nuvens", "Coração Celestial",
] as const;

// A relíquia global permanece desbloqueada no P9, mas os níveis seguintes viram
// investimentos de peso: o nível 2 compete diretamente com P18 e o nível 3
// permanece como uma compra de fim de campanha, próxima de P23.
const GLOBAL_RELIC_COSTS = [
  Math.ceil(IDLE_CATALOG.kitty[8].baseCost * 6),
  Math.ceil(IDLE_CATALOG.kitty[17].baseCost),
  Math.ceil(IDLE_CATALOG.kitty[22].baseCost * .7),
] as const;

// As demais relíquias preservam o preço de entrada, mas abrem mais distância
// entre níveis. Isso mantém a primeira compra atraente e transforma níveis 3/4
// em investimentos que competem de verdade com personagens e upgrades.
const STANDARD_RELIC_COST_MULTIPLIERS = [1, 7, 50, 350] as const;

export const KITTY_RELICS: KittyRelicDefinition[] = [
  ...RELIC_NAMES.map((name, scene) => ({
    id: `kitty-scene-${scene + 1}`, name, asset: `/idle/relics/mundo${scene + 1}.webp`,
    kind: "scene" as const, scene, unlockOrder: Math.min(scene * 4, 23),
    baseCost: scene === 0
      ? 180
      : scene <= 3
        ? Math.ceil(IDLE_CATALOG.kitty[scene * 4].baseCost * .55)
        : scene === 4
          ? Math.ceil(IDLE_CATALOG.kitty[17].baseCost * .55) // cena 5: P18
          : scene === 5
            ? Math.ceil(IDLE_CATALOG.kitty[21].baseCost * .55) // cena 6: P22
            : Math.ceil(IDLE_CATALOG.kitty[23].baseCost * .55), // cena 7: P24
    maxLevel: 4,
    description: `Multiplica a produção de ${IDLE_SCENES.kitty[scene].name}.`,
  })),
  { id: "kitty-click", name: "Toque de Carinho", asset: "/idle/relics/clique.webp", kind: "click", unlockOrder: 1,
    baseCost: 420, maxLevel: 4, description: "Multiplica as moedas recebidas ao tocar personagens." },
  { id: "kitty-all", name: "Castelo das Maravilhas", asset: "/idle/relics/todososmundos.webp", kind: "global", unlockOrder: 8,
    // P9 continua sendo o gatilho de desbloqueio; o custo inicial agora acompanha o caixa real dessa fase.
    baseCost: GLOBAL_RELIC_COSTS[0], maxLevel: 3,
    description: "Multiplica a produção das sete cenas da Hello Kitty." },
];

export function kittyRelicCost(relic: KittyRelicDefinition, level: number): number {
  if (relic.kind === "global") {
    const boundedLevel = Math.max(0, Math.min(GLOBAL_RELIC_COSTS.length - 1, level));
    return GLOBAL_RELIC_COSTS[boundedLevel];
  }
  const boundedLevel = Math.max(0, Math.min(STANDARD_RELIC_COST_MULTIPLIERS.length - 1, level));
  return Math.ceil(relic.baseCost * STANDARD_RELIC_COST_MULTIPLIERS[boundedLevel]);
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: "farm-first-garden", mode: "farm", title: "Primeira colheita", description: "Tenha a primeira Horta", iconItemId: "garden", reward: 5, condition: { type: "own", itemId: "garden" } },
  { id: "farm-chicken-coop", mode: "farm", title: "Có-có compartilhado", description: "Compre o Galinheiro", iconItemId: "chicken-coop", reward: 8, condition: { type: "own", itemId: "chicken-coop" } },
  { id: "farm-fruit-stand", mode: "farm", title: "Feirinha colorida", description: "Compre a Barraca de frutas", iconItemId: "fruit-stand", reward: 10, condition: { type: "own", itemId: "fruit-stand" } },
  { id: "farm-orchard", mode: "farm", title: "Frutas do vale", description: "Compre o Pomar", iconItemId: "orchard", reward: 12, condition: { type: "own", itemId: "orchard" } },
  { id: "farm-bakery", mode: "farm", title: "Cheiro de pão", description: "Compre a Padaria", iconItemId: "bakery", reward: 15, condition: { type: "own", itemId: "bakery" } },
  { id: "farm-barn", mode: "farm", title: "Celeiro abastecido", description: "Compre o Celeiro", iconItemId: "barn", reward: 18, condition: { type: "own", itemId: "barn" } },
  { id: "farm-windmill", mode: "farm", title: "Bons ventos", description: "Compre o Moinho", iconItemId: "windmill", reward: 22, condition: { type: "own", itemId: "windmill" } },
  { id: "farm-market", mode: "farm", title: "Vila movimentada", description: "Compre o Mercadinho", iconItemId: "market", reward: 28, condition: { type: "own", itemId: "market" } },
  { id: "farm-greenhouse", mode: "farm", title: "Cultivo o ano inteiro", description: "Compre a Estufa", iconItemId: "greenhouse", reward: 35, condition: { type: "own", itemId: "greenhouse" } },
  { id: "farm-main-farm", mode: "farm", title: "Coração da fazenda", description: "Compre a Fazenda principal", iconItemId: "main-farm", reward: 50, condition: { type: "own", itemId: "main-farm" } },
  { id: "farm-five", mode: "farm", title: "Fazendinha crescendo", description: "Tenha 5 produtores", reward: 35, condition: { type: "ownedCount", target: 5 } },
  { id: "farm-100", mode: "farm", title: "Cantinho produtivo", description: "Alcance 100/s", reward: 20, condition: { type: "production", target: 100 } },
  { id: "farm-1k", mode: "farm", title: "Renda farta", description: "Alcance 1K/s", reward: 35, condition: { type: "production", target: 1_000 } },
  { id: "farm-10k", mode: "farm", title: "Colheita dourada", description: "Alcance 10K/s", reward: 60, condition: { type: "production", target: 10_000 } },
  { id: "farm-level-10", mode: "farm", title: "Mãos experientes", description: "Leve um produtor ao nível 10", reward: 30, condition: { type: "level", target: 10 } },
  { id: "farm-all", mode: "farm", title: "Nosso império rural", description: "Compre todos os produtores", reward: 80, condition: { type: "ownAll" } },
  // Uma conquista por personagem, com ID estável para saves novos.
  ...KITTY_CHARACTER_SEQUENCE.map((character, index): AchievementDefinition => ({
    id: index === 0 ? "kitty-first" : `kitty-character-${index + 1}`,
    mode: "kitty", title: index === 0 ? "Primeira amizade" : `Amizade ${index + 1}`,
    description: `Desbloqueie ${character.name}`, iconItemId: character.id,
    reward: Math.min(50, 5 + Math.floor(index * 1.9)), condition: { type: "own", itemId: character.id },
  })),
  { id: "kitty-three", mode: "kitty", title: "Turminha cozy", description: "Tenha 3 personagens", reward: 20, condition: { type: "ownedCount", target: 3 } },
  { id: "kitty-five", mode: "kitty", title: "Casa cheia", description: "Tenha 5 personagens", reward: 35, condition: { type: "ownedCount", target: 5 } },
  { id: "kitty-twelve", mode: "kitty", title: "Metade do caminho", description: "Tenha 12 personagens", reward: 55, condition: { type: "ownedCount", target: 12 } },
  { id: "kitty-twenty", mode: "kitty", title: "Constelação de amigos", description: "Tenha 20 personagens", reward: 75, condition: { type: "ownedCount", target: 20 } },
  { id: "kitty-100", mode: "kitty", title: "Carinho que rende", description: "Alcance 100/s", reward: 20, condition: { type: "production", target: 100 } },
  { id: "kitty-1k", mode: "kitty", title: "Amizade valiosa", description: "Alcance 1K/s", reward: 35, condition: { type: "production", target: 1_000 } },
  { id: "kitty-10k", mode: "kitty", title: "Estrelas brilhantes", description: "Alcance 10K/s", reward: 60, condition: { type: "production", target: 10_000 } },
  { id: "kitty-1m", mode: "kitty", title: "Luz do santuário", description: "Alcance 1M/s", reward: 80, condition: { type: "production", target: 1_000_000 } },
  { id: "kitty-1b", mode: "kitty", title: "Brilho infinito", description: "Alcance 1B/s", reward: 100, condition: { type: "production", target: 1_000_000_000 } },
  { id: "kitty-level-10", mode: "kitty", title: "Melhores amigos", description: "Leve um personagem ao nível 10", reward: 30, condition: { type: "level", target: 10 } },
  { id: "kitty-all", mode: "kitty", title: "Turma completa", description: "Tenha os 24 personagens", reward: 100, condition: { type: "ownAll" } },
];

export const RENEWABLE_OBJECTIVES: RenewableObjectiveDefinition[] = [
  { id: "daily-farm-entry", period: "daily", title: "Bom dia, fazendinha!", description: "Entre na Fazendinha hoje", metric: "farmEntries", target: 1, reward: 5 },
  { id: "daily-kitty-entry", period: "daily", title: "Visita cheia de carinho", description: "Entre no Mundo da Hello Kitty hoje", metric: "kittyEntries", target: 1, reward: 5 },
  { id: "daily-upgrades", period: "daily", title: "Pequenas melhorias", description: "Faça 3 melhorias", metric: "upgrades", target: 3, reward: 10 },
  { id: "daily-earnings", period: "daily", title: "Rendendo juntinhos", description: "Ganhe 5K de dinheiro interno", metric: "earnings", target: 5_000, reward: 15 },
  { id: "daily-minigame", period: "daily", title: "Hora de jogar", description: "Conclua 1 minigame", metric: "minigames", target: 1, reward: 10 },
  { id: "weekly-upgrades", period: "weekly", title: "Semana de evolução", description: "Faça 15 melhorias", metric: "upgrades", target: 15, reward: 40 },
  { id: "weekly-earnings", period: "weekly", title: "Cofrinho da semana", description: "Ganhe 500K de dinheiro interno", metric: "earnings", target: 500_000, reward: 60 },
  { id: "weekly-minigames", period: "weekly", title: "Dupla em ação", description: "Conclua 5 minigames", metric: "minigames", target: 5, reward: 50 },
];

export const MINIGAME_GLOBAL_REWARDS: Record<GameId, Record<string, number>> = {
  colors: { easy: 8, hard: 13 },
  termo: { one: 8, single: 8, dueto: 13, quarteto: 20, "1": 8, "2": 13, "4": 20 },
  memory: { easy: 8, medium: 13, hard: 19 },
  airhockey: { easy: 10, medium: 16, hard: 23 },
  quiz: { easy: 10, medium: 16, hard: 23 },
  whoami: { easy: 10, medium: 15, hard: 21 },
  sudoku: { easy: 12, medium: 19, hard: 28 },
  crossword: { easy: 12, medium: 19, hard: 28 },
  wordsearch: { easy: 10, medium: 16, hard: 23 },
  puzzle: { easy: 12, medium: 20, hard: 30 },
  chess: { easy: 12, medium: 20, hard: 30 },
  boardrace: { geral: 18 },
  drawguess: { "4": 16, "6": 22, "8": 28 },
  casino: { quick: 16, normal: 24, long: 34 },
  rpg: { geral: 24 },
};

export function minigameGlobalReward(gameId: GameId, rank: string): number {
  const table = MINIGAME_GLOBAL_REWARDS[gameId];
  return table[rank] ?? table.medium ?? table.normal ?? table.geral ?? Object.values(table)[0] ?? 0;
}

export function itemProduction(item: IdleItemDefinition, level: number): number {
  if (level <= 0) return 0;
  return item.baseProduction * Math.pow(item.productionGrowth, level - 1);
}

export function itemUpgradeCost(item: IdleItemDefinition, level: number): number {
  return Math.ceil(item.upgradeBaseCost * Math.pow(item.costGrowth, Math.max(0, level - 1)));
}

export function itemClickReward(item: IdleItemDefinition, level: number): number {
  return Math.max(1, Math.floor(itemProduction(item, level) * (item.clickShare ?? .22)));
}
