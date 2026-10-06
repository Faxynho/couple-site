import { IdleItemSnapshot, KittyDevCharacterSnapshot, KittyDevSnapshot } from "@/lib/idleTypes";

/** Tudo aqui é usado SOMENTE pelo ambiente DEV do Mundo da Hello Kitty. */
export const WORLDS_BG = "/idle/backgrounds/hello-kitty-worlds-background.webp";
export const STONE_ICON = "/idle/dev/pedra-estelar.webp";
export const CLICK_ICON = "/idle/events/click2.webp";
export const AWAKE_AURA = "/idle/dev/awake-aura.webp";
export const CONSTELLATION_BG = "/idle/dev/constellation-bg.webp";
export const islandSprite = (world: number) => `/idle/islands/island-${world + 1}.webp`;

/** Posição (em % do quadro do mapa) e tamanho de cada ilha, seguindo a imagem de referência. */
export const ISLAND_LAYOUT: Array<{ x: number; y: number; w: number }> = [
  { x: 21, y: 12.5, w: 38 }, { x: 70, y: 20.5, w: 40 }, { x: 27, y: 33, w: 41 },
  { x: 73, y: 45.5, w: 41 }, { x: 25, y: 59.5, w: 40 }, { x: 74, y: 67, w: 40 }, { x: 50, y: 84.5, w: 46 },
];

export interface SpriteChoice { src: string; awake: boolean }

/** Sprite do personagem: usa o visual despertado só se ele despertou E a skin despertada está ligada. */
export function spriteFor(item: IdleItemSnapshot, kittyDev: KittyDevSnapshot | undefined): SpriteChoice {
  const awakening = kittyDev?.characters[item.definition.id]?.awakening;
  if (awakening?.awakened && awakening.skinAwake) return { src: awakening.asset, awake: true };
  return { src: item.definition.asset, awake: false };
}

export function characterInfo(kittyDev: KittyDevSnapshot | undefined, id: string): KittyDevCharacterSnapshot | undefined {
  return kittyDev?.characters[id];
}

/** Ilha em que cada personagem mora (mesma regra de IDLE_CATALOG: 4 por ilha, 3 na sexta, 1 na sétima). */
export function charactersOfWorld(items: IdleItemSnapshot[], world: number): IdleItemSnapshot[] {
  return items.filter((item) => item.definition.scene === world);
}

/** Ordem em que as 5 estrelas aparecem no arco: esquerda, direita, esquerda, direita e, por último, o centro. */
export const STAR_SLOT_OF_LEVEL = [0, 4, 1, 3, 2] as const; // nível 1→slot 0 (esq.), 2→4 (dir.), 3→1, 4→3, 5→2 (meio)
