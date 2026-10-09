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

export interface SpriteChoice {
  src: string;
  /** O personagem já despertou: aura, brilhos e moldura continuam mesmo com a skin normal. */
  awake: boolean;
  /** Está usando a arte despertada própria (sprite alto): aplica o ajuste de tamanho do visual despertado. */
  styled: boolean;
}

/**
 * Sprite do personagem. A skin despertada só aparece depois de despertar E com a skin ligada; sem arte própria
 * (entrada ainda apontando para o sprite normal em AWAKE_SPRITES) o visual despertado usa a arte normal.
 */
export function spriteFor(item: IdleItemSnapshot, kittyDev: KittyDevSnapshot | undefined): SpriteChoice {
  const awakening = kittyDev?.characters[item.definition.id]?.awakening;
  if (awakening?.awakened) {
    const showAwakeArt = awakening.skinAwake;
    return { src: showAwakeArt ? awakening.asset : item.definition.asset, awake: true, styled: showAwakeArt && awakening.hasOwnSprite };
  }
  return { src: item.definition.asset, awake: false, styled: false };
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

/**
 * Ajuste do sprite DESPERTADO na aba inicial do mundo para que ele apareça do MESMO tamanho (e no mesmo "chão") que o sprite normal.
 * Os sprites despertados têm margens diferentes, então cada personagem tem o seu valor. A Hello Kitty usa o ajuste padrão do CSS.
 * Valores gerados por `python3 scripts/measure_awake_sprites.py` (rode de novo ao trocar/adicionar um sprite em /idle/characters/awake/).
 * x e y em % do quadro do personagem.
 */
export const AWAKE_HOME_FIT: Record<string, { scale: number; x: number; y: number }> = {
  "dear-daniel": { scale: 0.902, x: 0.7, y: 4.6 },
  "my-melody": { scale: 0.813, x: 1.8, y: 5.7 },
  "mimmy": { scale: 0.943, x: -1.7, y: 3.0 },
  "cinnamoroll": { scale: 0.784, x: -0.1, y: -3.8 },
  "pompompurin": { scale: 0.862, x: -0.3, y: -0.1 },
  "cinnamoroll-blue-bow": { scale: 0.992, x: 0.2, y: -2.6 },
};

/** Transform CSS do sprite despertado na aba inicial (undefined = usa o padrão do CSS, que é o da Hello Kitty). */
export function awakeHomeTransform(characterId: string): string | undefined {
  const fit = AWAKE_HOME_FIT[characterId];
  return fit ? `translate(${fit.x}%, ${fit.y}%) scale(${fit.scale})` : undefined;
}
