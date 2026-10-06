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
  { click: 1.25, production: 1, label: "+25% de valor por clique" },
  { click: 1, production: 1.15, label: "+15% de produção" },
  { click: 1.4, production: 1, label: "+40% de valor por clique" },
  { click: 1, production: 1.25, label: "+25% de produção" },
  { click: 1.25, production: 1.5, label: "+50% de produção e +25% por clique" },
];

/** Nível de referência em que o personagem `index` "estaciona" na curva atual do jogo. */
export function characterReferenceLevel(index: number): number {
  return index < 17 ? 90 - 2 * index : 24;
}

const LEVEL_REQUIREMENT_FRACTION = [0.35, 0.45, 0.55, 0.65, 0.75] as const;

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
export interface AwakeningDefinition {
  /** Sprite do personagem despertado (já existente no projeto). */
  asset: string;
  /** Multiplicador de produção (e, por consequência, do clique) do personagem despertado. */
  multiplier: number;
  /** Preço em dinheiro interno. */
  cost: number;
}

/**
 * Personagens com despertar liberado. Por ora só a Hello Kitty (único sprite despertado pronto).
 * Para liberar outro personagem basta incluir o id aqui com o sprite, o multiplicador e o preço.
 *
 * Hello Kitty: ×1000 e preço de 2 Qi (2e18). A Hello Kitty é o personagem mais barato (2·2,7^0 de produção base),
 * então um multiplicador pequeno seria invisível: na simulação ela rende ~2,4e9/s no dia 120 contra ~2,7e13/s totais.
 * Com ×1000 (e as estrelas ×2,16) ela passa a render ~+19% da produção total nessa época e o preço se paga em
 * ~5 dias — endgame, mas com retorno claro. Pontos de teste: dia 60 ≈ +8%, dia 180 ≈ +10% (teto da curva atual).
 */
export const AWAKENING_DEFINITIONS: Record<string, AwakeningDefinition> = {
  "hello-kitty": {
    asset: "/idle/characters/awake/awake-hello-kitty.webp",
    multiplier: 1000,
    cost: 2e18,
  },
};

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
