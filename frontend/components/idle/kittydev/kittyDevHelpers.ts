import { IdleItemSnapshot, KittyDevCharacterSnapshot, KittyDevSnapshot } from "@/lib/idleTypes";

/** Tudo aqui é usado SOMENTE pelo ambiente DEV do Mundo da Hello Kitty. */
export const WORLDS_BG = "/idle/backgrounds/hello-kitty-worlds-background.webp";
export const STONE_ICON = "/idle/dev/stellar-stone.webp";
export const AWAKE_AURA = "/idle/dev/awake-aura.webp";
export const CONSTELLATION_BG = "/idle/dev/constellation-bg.webp";
export const islandSprite = (world: number) => `/idle/islands/island-${world + 1}.webp`;

/** Posição (em % do quadro do mapa) e tamanho de cada ilha, seguindo a imagem de referência. */
export const ISLAND_LAYOUT: Array<{ x: number; y: number; w: number }> = [
  { x: 21, y: 12.5, w: 38 }, { x: 70, y: 20.5, w: 40 }, { x: 27, y: 33, w: 41 },
  { x: 73, y: 45.5, w: 41 }, { x: 25, y: 59.5, w: 40 }, { x: 74, y: 67, w: 40 }, { x: 50, y: 84.5, w: 46 },
];

export interface SpriteChoice { src: string; awake: boolean }

/** Sprite do personagem: usa o visual despertado quando ele já despertou. */
export function spriteFor(item: IdleItemSnapshot, kittyDev: KittyDevSnapshot | undefined): SpriteChoice {
  const info = kittyDev?.characters[item.definition.id];
  if (info?.awakening?.awakened) return { src: info.awakening.asset, awake: true };
  return { src: item.definition.asset, awake: false };
}

export function characterInfo(kittyDev: KittyDevSnapshot | undefined, id: string): KittyDevCharacterSnapshot | undefined {
  return kittyDev?.characters[id];
}

/** Formas das constelações (5 estrelas, coordenadas 0–100). Cada personagem usa uma, espelhada nas voltas pares. */
const SHAPES: Array<{ nodes: Array<[number, number]>; loop?: boolean }> = [
  { nodes: [[10, 72], [30, 26], [50, 62], [70, 22], [90, 64]] },
  { nodes: [[12, 62], [30, 48], [48, 56], [67, 36], [88, 20]] },
  { nodes: [[50, 90], [22, 52], [50, 12], [78, 52], [50, 50]], loop: true },
  { nodes: [[14, 80], [34, 42], [50, 72], [68, 30], [88, 16]] },
  { nodes: [[10, 72], [26, 30], [50, 56], [74, 30], [90, 72]], loop: true },
  { nodes: [[50, 50], [72, 32], [80, 62], [50, 84], [22, 58]], loop: true },
];

export function constellationShape(index: number): { nodes: Array<[number, number]>; loop: boolean } {
  const shape = SHAPES[index % SHAPES.length];
  const mirror = Math.floor(index / SHAPES.length) % 2 === 1;
  return { nodes: shape.nodes.map(([x, y]) => [mirror ? 100 - x : x, y] as [number, number]), loop: Boolean(shape.loop) };
}

/** Ilha em que cada personagem mora (mesma regra de IDLE_CATALOG: 4 por ilha, 3 na sexta, 1 na sétima). */
export function charactersOfWorld(items: IdleItemSnapshot[], world: number): IdleItemSnapshot[] {
  return items.filter((item) => item.definition.scene === world);
}
