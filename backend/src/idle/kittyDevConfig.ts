// NOME LEGADO: este arquivo faz parte do jogo normal E do DEV (não é experimental). Ver CLAUDE.md e experimental.ts.
/**
 * Mecânicas EXPERIMENTAIS do Mundo da Hello Kitty — existem somente no ambiente DEV (conta "andre").
 * Nada aqui é importado pelo fluxo do jogo real: o IdleStore só consulta estas funções quando
 * `environment === "dev"` e `mode === "kitty"`.
 *
 * Todos os números de balanceamento ficam neste arquivo para facilitar o ajuste fino durante os testes.
 *
 * Âncoras de balanceamento (curva atual do jogo, sem alterá-la):
 *  - Produção base do personagem i: 2 × 2,7^i   · crescimento por nível: ×1,27
 *  - Custo do nível: upgradeBase × 1,52^(n-1) (1,68 a partir do P18)  → o custo cresce mais rápido que a produção,
 *    então a produção total "estaciona" e os níveis dos primeiros personagens ficam entre 50 e 90.
 *  - Simulação gulosa de progressão (jogador ativo): ~80 Pedras Estelares na 1ª semana, ~180 no dia 60 e ~280 em 1 ano
 *    (sem item de pedra). Com o item de pedra no nível máximo o teto de oferta sobe ~2,75×.
 *  - As pedras chegam cedo (~80 na 1ª semana, vindas dos níveis baixos) e depois só pelos níveis altos; por isso cada
 *    nível de estrela exige também um NÍVEL MÍNIMO do personagem (constellationLevelRequirement), calibrado pelo nível
 *    em que cada personagem "estaciona" na simulação (~90−2·i nos 17 primeiros, ~24 nos 7 últimos).
 *  - Custo total de TODAS as constelações ≈ 390 pedras. Pela simulação (PROJECAO-DE-PROGRESSO.md) fechar as 24 leva
 *    ~14 meses para quem joga bastante e ~18–24 meses para quem joga menos (nem 15 dias, nem 4 anos).
 *  - Despertar: preço e multiplicador pensados para a Hello Kitty valer ~+15–20% da produção total por volta do dia
 *    90–150, pagando-se em ~5 dias (veja AWAKENING_DEFINITIONS). Os próximos personagens precisam de calibragem própria.
 */
import { IDLE_CATALOG, KITTY_CHARACTER_SEQUENCE } from "./idleConfig";

export const KITTY_CHARACTER_COUNT = KITTY_CHARACTER_SEQUENCE.length;

// ---------------------------------------------------------------------------
// Pedra Estelar (moeda nova)
// ---------------------------------------------------------------------------
/** A cada N níveis do personagem ele rende pedras estelares. */
export const STONE_MILESTONE_EVERY_LEVELS = 10;

/** Pedras por marco de 10 níveis: 1 nos primeiros personagens até 5 nos últimos (escalonado). */
export function stoneYieldForIndex(index: number): number {
  if (index < 5) return 1;   // P1–P5
  if (index < 10) return 2;  // P6–P10
  if (index < 15) return 3;  // P11–P15
  if (index < 20) return 4;  // P16–P20
  return 5;                  // P21–P24
}

// ---------------------------------------------------------------------------
// Estrelas / Constelação (5 níveis por personagem)
// ---------------------------------------------------------------------------
export const KITTY_STAR_MAX = 5;

export interface ConstellationBonus {
  /** Multiplicador sobre o valor do clique do personagem. */
  click: number;
  /** Multiplicador sobre a produção do personagem. */
  production: number;
  label: string;
}

/** Bônus individuais de cada nível (os efeitos se acumulam). */
export const CONSTELLATION_BONUSES: ConstellationBonus[] = [
  { click: 1.25, production: 1.75, label: "+75% de produção e +25% por clique" },
  { click: 1, production: 2.0, label: "+100% de produção" },
  { click: 1.4, production: 2.4, label: "+140% de produção e +40% por clique" },
  { click: 1, production: 2.8, label: "+180% de produção" },
  { click: 1.6, production: 3.8, label: "+280% de produção e +60% por clique" },
];

/** Nível de referência em que o personagem `index` "estaciona" na curva atual do jogo. */
export function characterReferenceLevel(index: number): number {
  if (index === 0) return 100; // a Hello Kitty já começa alta (nível ~60) e tem a constelação mais longa
  return index < 17 ? 90 - 2 * index : 24;
}

export const LEVEL_REQUIREMENT_FRACTION: number[] = [0.35, 0.47, 0.58, 0.68, 0.76];

/** Nível mínimo do personagem para comprar o nível `level` (1–5) da constelação dele. */
export function constellationLevelRequirement(index: number, level: number): number {
  const fraction = LEVEL_REQUIREMENT_FRACTION[Math.max(0, Math.min(KITTY_STAR_MAX - 1, level - 1))];
  return Math.max(10, Math.round(characterReferenceLevel(index) * fraction));
}

const CONSTELLATION_BASE_COSTS = [2, 2, 3, 3, 4] as const; // 14 pedras por constelação no 1º personagem

/** Pedras necessárias para comprar o nível `level` (1–5) da constelação do personagem `index`. */
export function constellationCost(index: number, level: number): number {
  const base = CONSTELLATION_BASE_COSTS[Math.max(0, Math.min(KITTY_STAR_MAX - 1, level - 1))];
  // Personagens mais avançados custam até +30% (P24), pois também rendem mais pedras por marco.
  return Math.max(1, Math.round(base * (1 + 0.3 * index / Math.max(1, KITTY_CHARACTER_COUNT - 1))));
}

export function constellationProductionMultiplier(stars: number): number {
  let result = 1;
  for (let level = 1; level <= Math.min(KITTY_STAR_MAX, stars); level++) result *= CONSTELLATION_BONUSES[level - 1].production;
  return result;
}

export function constellationClickMultiplier(stars: number): number {
  let result = 1;
  for (let level = 1; level <= Math.min(KITTY_STAR_MAX, stars); level++) result *= CONSTELLATION_BONUSES[level - 1].click;
  return result;
}

// ---------------------------------------------------------------------------
// Itens exclusivos (2 por personagem)
// ---------------------------------------------------------------------------
export const CLICK_ITEM_MAX_LEVEL = 8;
export const STONE_ITEM_MAX_LEVEL = 5;
/** Cada nível do item de clique soma +35% ao valor do clique daquele personagem. */
export const CLICK_ITEM_BONUS_PER_LEVEL = 0.35;
/** Cada nível do item estelar soma +35% às pedras que o personagem rende por marco. */
export const STONE_ITEM_BONUS_PER_LEVEL = 0.35;

/**
 * Régua de preço dos itens e do despertar: 1e13 × 1,8^i (P1 = 10T … P24 ≈ 7,4Qi).
 * É uma régua de PROGRESSÃO: o item do personagem i custa o que o jogador está acostumado a gastar
 * quando chega perto de desbloquear aquele patamar da campanha.
 */
export function itemPriceRuler(index: number): number {
  return 1e13 * Math.pow(1.8, index);
}

/** Preço do nível `level` (1 = compra, 2+ = melhorias) do item de clique. */
export function clickItemCost(index: number, level: number): number {
  return Math.ceil(itemPriceRuler(index) * 0.5 * Math.pow(1.9, Math.max(0, level - 1)));
}

/** Preço do nível `level` (1 = compra, 2+ = melhorias) do item de pedra estelar. */
export function stoneItemCost(index: number, level: number): number {
  return Math.ceil(itemPriceRuler(index) * 1.0 * Math.pow(2.6, Math.max(0, level - 1)));
}

export function clickItemMultiplier(level: number): number {
  return 1 + CLICK_ITEM_BONUS_PER_LEVEL * Math.max(0, Math.min(CLICK_ITEM_MAX_LEVEL, level));
}

export function stoneItemMultiplier(level: number): number {
  return 1 + STONE_ITEM_BONUS_PER_LEVEL * Math.max(0, Math.min(STONE_ITEM_MAX_LEVEL, level));
}

/** Nomes temáticos dos dois itens de cada personagem (mesma ordem de KITTY_CHARACTER_SEQUENCE). */
export const KITTY_ITEM_NAMES: Array<{ click: string; stone: string }> = [
  { click: "Varinha de Laço", stone: "Estrelinha do Desejo" },      // P1 Hello Kitty
  { click: "Câmera Dourada", stone: "Mapa das Estrelas" },          // P2 Dear Daniel
  { click: "Capuz Encantado", stone: "Cesta de Estrelas" },         // P3 My Melody
  { click: "Laço Gêmeo", stone: "Fitinha Estelar" },                // P4 Mimmy
  { click: "Nuvem Fofinha", stone: "Orelha Cintilante" },           // P5 Cinnamoroll
  { click: "Pudim de Ouro", stone: "Boina Estelar" },               // P6 Pompompurin
  { click: "Laço Azul Mágico", stone: "Cometa de Nuvem" },          // P7 Cinnamoroll laço azul
  { click: "Bola Saltitante", stone: "Medalha Estelar" },           // P8 Pochacco
  { click: "Bolha Brilhante", stone: "Concha Estelar" },            // P9 Tiny Chum
  { click: "Folha de Lírio Mágica", stone: "Lírio Estelar" },       // P10 Keroppi
  { click: "Gravata Reluzente", stone: "Pinguim Cometa" },          // P11 Tuxedosam
  { click: "Biscoito Saltitante", stone: "Latinha Estelar" },       // P12 Mocha
  { click: "Sonho Doce", stone: "Travesseiro Estelar" },            // P13 Baku
  { click: "Estilingue Maroto", stone: "Crachá Estelar" },          // P14 Badtz-Maru
  { click: "Bigode Dourado", stone: "Bola de Cristal" },            // P15 Chococat
  { click: "Capuz Travesso", stone: "Caveirinha Estelar" },         // P16 Kuromi
  { click: "Teclas Encantadas", stone: "Partitura Estelar" },       // P17 My Sweet Piano
  { click: "Coleira de Diamante", stone: "Tiara Estelar" },         // P18 Charmmy Kitty
  { click: "Asinhas de Luz", stone: "Halo Estelar" },               // P19 Hello Kitty anjo
  { click: "Auréola Travessa", stone: "Asa Estelar" },              // P20 Kuromi anjo
  { click: "Capa da Noite", stone: "Lua Estelar" },                 // P21 My Melody anjo noturno
  { click: "Leque de Gala", stone: "Coroa Estelar" },               // P22 Hello Kitty de gala
  { click: "Cetro Celestial", stone: "Cometa Roxo" },               // P23 Kuromi celestial
  { click: "Varinha Gêmea", stone: "Chuva de Estrelas" },           // P24 Little Twin Stars
];

// ---------------------------------------------------------------------------
// Despertar
// ---------------------------------------------------------------------------
/**
 * Sprites do personagem DESPERTADO. Para liberar o visual despertado de um personagem basta trocar o caminho da
 * linha dele pelo arquivo novo (ex.: "/idle/characters/awake/awake-kuromi.webp"). Enquanto o arquivo não existe, a
 * linha aponta para o sprite normal: o despertar já funciona (produção, aura, brilhos, moldura), só sem a roupa nova.
 * Esta tabela é separada do sprite normal (IDLE_CATALOG), então nunca conflita com a skin normal.
 */
export const AWAKE_SPRITES: Record<string, string> = {
  "hello-kitty": "/idle/characters/awake/awake-hello-kitty.webp",
  "dear-daniel": "/idle/characters/awake/awake-dear-daniel.webp",
  "my-melody": "/idle/characters/awake/awake-my-melody.webp",
  "mimmy": "/idle/characters/awake/awake-mimmy.webp", // TODO: trocar por "/idle/characters/awake/awake-mimmy.webp"
  "cinnamoroll": "/idle/characters/awake/awake-cinnamoroll.webp", // TODO: trocar por "/idle/characters/awake/awake-cinnamoroll.webp"
  "pompompurin": "/idle/characters/awake/awake-pompompurin.webp", // TODO: trocar por "/idle/characters/awake/awake-pompompurin.webp"
  "cinnamoroll-blue-bow": "/idle/characters/awake/awake-cinnamoroll-blue-bow.webp", // TODO: trocar por "/idle/characters/awake/awake-cinnamoroll-blue-bow.webp"
  "pochacco": "/idle/characters/awake/awake-pochacco.webp", // TODO: trocar por "/idle/characters/awake/awake-pochacco.webp"
  "tiny-chum": "/idle/characters/awake/awake-tiny-chum.webp", // TODO: trocar por "/idle/characters/awake/awake-tiny-chum.webp"
  "keroppi": "/idle/characters/awake/awake-keroppi.webp", // TODO: trocar por "/idle/characters/awake/awake-keroppi.webp"
  "tuxedosam": "/idle/characters/awake/awake-tuxedosam.webp", // TODO: trocar por "/idle/characters/awake/awake-tuxedosam.webp"
  "mocha": "/idle/characters/awake/awake-mocha.webp", // TODO: trocar por "/idle/characters/awake/awake-mocha.webp"
  "baku": "/idle/characters/awake/awake-baku.webp", // TODO: trocar por "/idle/characters/awake/awake-baku.webp"
  "badtz-maru": "/idle/characters/awake/awake-badtz-maru.webp", // TODO: trocar por "/idle/characters/awake/awake-badtz-maru.webp"
  "chococat": "/idle/characters/v2/p15.webp", // TODO: trocar por "/idle/characters/awake/awake-chococat.webp"
  "kuromi": "/idle/characters/v2/p16.webp", // TODO: trocar por "/idle/characters/awake/awake-kuromi.webp"
  "my-sweet-piano": "/idle/characters/v2/p17.webp", // TODO: trocar por "/idle/characters/awake/awake-my-sweet-piano.webp"
  "charmmy-kitty": "/idle/characters/v2/p18.webp", // TODO: trocar por "/idle/characters/awake/awake-charmmy-kitty.webp"
  "hello-kitty-angel": "/idle/characters/v2/p19.webp", // TODO: trocar por "/idle/characters/awake/awake-hello-kitty-angel.webp"
  "kuromi-angel": "/idle/characters/v2/p20.webp", // TODO: trocar por "/idle/characters/awake/awake-kuromi-angel.webp"
  "my-melody-dark-angel": "/idle/characters/v2/p21.webp", // TODO: trocar por "/idle/characters/awake/awake-my-melody-dark-angel.webp"
  "hello-kitty-gala": "/idle/characters/v2/p22.webp", // TODO: trocar por "/idle/characters/awake/awake-hello-kitty-gala.webp"
  "kuromi-celestial": "/idle/characters/v2/p23.webp", // TODO: trocar por "/idle/characters/awake/awake-kuromi-celestial.webp"
  "little-twin-stars": "/idle/characters/v2/p24.webp", // TODO: trocar por "/idle/characters/awake/awake-little-twin-stars.webp"
};

/** Quando o caminho está em /awake/ o personagem tem sprite despertado próprio. */
export function hasOwnAwakeSprite(characterId: string): boolean {
  return (AWAKE_SPRITES[characterId] ?? "").includes("/awake/");
}

export interface AwakeningDefinition {
  /** Posição do despertar na sequência (0 = Hello Kitty). */
  index: number;
  /** Sprite do personagem despertado (veja AWAKE_SPRITES). */
  asset: string;
  hasOwnSprite: boolean;
  /** Bônus FIXO de produção por segundo que o despertar soma ao personagem (antes das relíquias). */
  bonus: number;
  /** Preço em dinheiro interno. */
  cost: number;
}

/**
 * Série de despertares. Cada despertar funciona como um "personagem 25, 26, 27…": soma um bônus de produção fixo
 * (não explode quando o personagem sobe de nível) e custa mais que o anterior. As tabelas abaixo foram calibradas
 * pelo simulador para o ritmo de referência (save no P18, ~2B/s):
 *   P24 em ~35 dias, 1º despertar ~12 dias depois e depois um a cada ~10 dias, subindo até ~22 no último.
 * Para recalibrar depois de mudar qualquer valor do jogo:  cd backend && npx tsx tools/kittyDevFit.ts
 */
export const AWAKENING_COSTS: number[] = [1.88e+17, 3.86e+17, 9.22e+17, 1.95e+18, 5.55e+18, 7.2e+18, 4.57e+20, 1.71e+21, 4.47e+21, 9.70e+21, 1.84e+22, 4.34e+22, 8.90e+22, 1.79e+23, 3.53e+23, 6.80e+23, 1.28e+24, 2.37e+24, 4.28e+24, 7.56e+24, 1.30e+25, 2.19e+25, 3.59e+25, 5.73e+25];
export const AWAKENING_BONUSES: number[] = [5.76e+10, 1.34e+11, 3.08e+11, 7.09e+11, 1.62e+12, 4.75e+13, 1.69e+14, 3.74e+14, 7.67e+14, 1.54e+15, 3.06e+15, 5.90e+15, 1.12e+16, 2.06e+16, 3.73e+16, 6.59e+16, 1.14e+17, 1.92e+17, 3.15e+17, 5.04e+17, 7.85e+17, 1.19e+18, 1.75e+18, 3.12e+18];

export const AWAKENING_DEFINITIONS: Record<string, AwakeningDefinition> = Object.fromEntries(
  IDLE_CATALOG.kitty.map((item, index) => [item.id, {
    index,
    asset: AWAKE_SPRITES[item.id] ?? item.asset,
    hasOwnSprite: hasOwnAwakeSprite(item.id),
    bonus: AWAKENING_BONUSES[index] ?? 0,
    cost: AWAKENING_COSTS[index] ?? Infinity,
  }]),
);

export function awakeningFor(characterId: string): AwakeningDefinition | null {
  return AWAKENING_DEFINITIONS[characterId] ?? null;
}

// ---------------------------------------------------------------------------
// Estado salvo (somente no save DEV)
// ---------------------------------------------------------------------------
export interface KittyDevCharacterState {
  /** Nível da constelação = estrelas desbloqueadas (0–5). */
  stars: number;
  clickItem: number;
  stoneItem: number;
  awakened: boolean;
  /** Skin exibida depois de despertar: true = despertada, false = visual normal (os efeitos continuam). */
  skinAwake: boolean;
  /** Quantos marcos de 10 níveis já pagaram pedras. */
  stoneClaimed: number;
  /** Fração de pedra acumulada pelo bônus do item (a pedra só é creditada inteira). */
  stoneFraction: number;
}

export interface KittyDevState {
  stones: number;
  totalStones: number;
  /** Índice (0–6) do último mundo/ilha aberto; null = nenhum (mostra a seleção de ilhas). */
  lastWorld: number | null;
  /** Quando o contador de dias jogados começou (0 = ainda não iniciado; começa no primeiro acesso). */
  startedAt: number;
  /** Tempo simulado pelos botões de simulação offline do modo DEV (soma ao tempo real). */
  simulatedMs: number;
  characters: Record<string, KittyDevCharacterState>;
}

export function emptyKittyDevCharacter(): KittyDevCharacterState {
  return { stars: 0, clickItem: 0, stoneItem: 0, awakened: false, skinAwake: true, stoneClaimed: 0, stoneFraction: 0 };
}

export function emptyKittyDev(): KittyDevState {
  return {
    stones: 0,
    totalStones: 0,
    lastWorld: null,
    startedAt: 0,
    simulatedMs: 0,
    characters: Object.fromEntries(IDLE_CATALOG.kitty.map((item) => [item.id, emptyKittyDevCharacter()])),
  };
}

function boundedInt(value: unknown, max: number): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.min(max, Math.floor(amount))) : 0;
}

export function sanitizeKittyDev(value: unknown): KittyDevState {
  const base = emptyKittyDev();
  if (!value || typeof value !== "object") return base;
  const input = value as Partial<KittyDevState>;
  base.stones = boundedInt(input.stones, 1e9);
  base.totalStones = Math.max(base.stones, boundedInt(input.totalStones, 1e9));
  const world = Number(input.lastWorld);
  base.lastWorld = input.lastWorld !== null && Number.isInteger(world) && world >= 0 && world < 7 ? world : null;
  const startedAt = Number(input.startedAt);
  const simulatedMs = Number(input.simulatedMs);
  base.startedAt = Number.isFinite(startedAt) && startedAt > 0 ? startedAt : 0;
  base.simulatedMs = Number.isFinite(simulatedMs) && simulatedMs > 0 ? Math.min(simulatedMs, 1e13) : 0;
  for (const item of IDLE_CATALOG.kitty) {
    const saved = input.characters?.[item.id];
    if (!saved || typeof saved !== "object") continue;
    const fraction = Number((saved as KittyDevCharacterState).stoneFraction);
    base.characters[item.id] = {
      stars: boundedInt(saved.stars, KITTY_STAR_MAX),
      clickItem: boundedInt(saved.clickItem, CLICK_ITEM_MAX_LEVEL),
      stoneItem: boundedInt(saved.stoneItem, STONE_ITEM_MAX_LEVEL),
      awakened: Boolean(saved.awakened) && Boolean(awakeningFor(item.id)) && boundedInt(saved.stars, KITTY_STAR_MAX) >= KITTY_STAR_MAX,
      skinAwake: (saved as KittyDevCharacterState).skinAwake !== false,
      stoneClaimed: boundedInt(saved.stoneClaimed, 1_000),
      stoneFraction: Number.isFinite(fraction) ? Math.max(0, Math.min(.999, fraction)) : 0,
    };
  }
  return base;
}
