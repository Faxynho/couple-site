import { AccountId } from "@/lib/accountSession";
import { WorldDirection } from "@/world/types";

export interface CharacterSheetConfig {
  textureKey: string;
  url: string;
  frameWidth: number;
  frameHeight: number;
  margin: number;
  spacing: number;
  /** Ponto de ancoragem visual desta spritesheet. */
  origin: { x: number; y: number };
}

export interface CharacterDirectionAnimationConfig {
  frames: number[];
  flipX?: boolean;
}

export interface CharacterAnimationConfig {
  /** Nome da spritesheet registrada em `sheets` (ex.: "walk" ou "actions"). */
  sheet: string;
  fps: number;
  repeat: number;
  directions: Partial<Record<WorldDirection, CharacterDirectionAnimationConfig>>;
}

export interface CharacterConfig {
  sheets: Record<string, CharacterSheetConfig>;
  scale: number;
  collision: { width: number; height: number; offsetX: number; offsetY: number };
  walkSpeed: number;

  /**
   * Registro genérico de animações.
   * Para adicionar uma animação nova, basta criar outra entrada aqui.
   * O WorldScene registra automaticamente tudo que estiver neste objeto.
   */
  animations: Record<string, CharacterAnimationConfig>;
}

const WALK_SHEET_LAYOUT = {
  frameWidth: 32,
  frameHeight: 32,
  margin: 0,
  spacing: 0,
  origin: { x: 0.5, y: 0.82 },
};

/*
 * IMPORTANTE:
 * actions.png é 96x864, mas NÃO é uma grade 3x27 de 32px.
 * Ele é uma grade 2x18 de frames 48x48.
 * O personagem fica dentro da área central do frame e o espaço extra existe
 * para caber ferramentas/efeitos sem cortar a animação.
 */
const ACTIONS_SHEET_LAYOUT = {
  frameWidth: 48,
  frameHeight: 48,
  margin: 0,
  spacing: 0,
  // Mantém os pés do personagem aproximadamente no mesmo ponto do walk.png.
  origin: { x: 0.5, y: 0.7133333333 },
};

/**
 * André e Flávia usam o mesmo layout de frames por enquanto.
 * Se no futuro um deles tiver spritesheets diferentes, basta criar uma
 * configuração própria para ele sem alterar o WorldScene.
 */
const SHARED_ANIMATIONS: Record<string, CharacterAnimationConfig> = {
  idle: {
    sheet: "walk",
    fps: 6,
    repeat: -1,
    directions: {
      down: { frames: [0, 1, 2, 3, 4, 5] },
      right: { frames: [6, 7, 8, 9, 10, 11] },
      left: { frames: [6, 7, 8, 9, 10, 11], flipX: true },
      up: { frames: [12, 13, 14, 15, 16, 17] },
    },
  },

  walk: {
    sheet: "walk",
    fps: 9,
    repeat: -1,
    directions: {
      down: { frames: [18, 19, 20, 21, 22, 23] },
      right: { frames: [24, 25, 26, 27, 28, 29] },
      left: { frames: [24, 25, 26, 27, 28, 29], flipX: true },
      up: { frames: [30, 31, 32, 33, 34, 35] },
    },
  },

  // actions.png = 2 colunas x 18 linhas, frames 48x48.
  // Cada direção ocupa UMA linha com 2 frames.
  mining: {
    sheet: "actions",
    fps: 7,
    repeat: 0,
    directions: {
      right: { frames: [0, 1] },
      left: { frames: [0, 1], flipX: true },
      down: { frames: [2, 3] },
      up: { frames: [4, 5] },
    },
  },

  chopping: {
    sheet: "actions",
    fps: 7,
    repeat: 0,
    directions: {
      right: { frames: [6, 7] },
      left: { frames: [6, 7], flipX: true },
      down: { frames: [8, 9] },
      up: { frames: [10, 11] },
    },
  },

  hoeing: {
    sheet: "actions",
    fps: 7,
    repeat: 0,
    directions: {
      right: { frames: [12, 13] },
      left: { frames: [12, 13], flipX: true },
      down: { frames: [14, 15] },
      up: { frames: [16, 17] },
    },
  },

  watering: {
    sheet: "actions",
    fps: 7,
    repeat: 0,
    directions: {
      down: { frames: [18, 19] },
      up: { frames: [20, 21] },
      right: { frames: [22, 23] },
      left: { frames: [22, 23], flipX: true },
    },
  },

  placing: {
    sheet: "actions",
    fps: 6,
    repeat: 0,
    directions: {
      right: { frames: [24, 25] },
      left: { frames: [24, 25], flipX: true },
      down: { frames: [26, 27] },
      up: { frames: [28, 29] },
    },
  },

  pickup: {
    sheet: "actions",
    fps: 6,
    repeat: 0,
    directions: {
      right: { frames: [30, 31] },
      left: { frames: [30, 31], flipX: true },
      down: { frames: [32, 33] },
      up: { frames: [34, 35] },
    },
  },
};

function createCharacterConfig(accountId: AccountId): CharacterConfig {
  return {
    sheets: {
      walk: {
        textureKey: `character-${accountId}-walk`,
        url: `/world/characters/${accountId}/walk.png`,
        ...WALK_SHEET_LAYOUT,
      },
      actions: {
        textureKey: `character-${accountId}-actions`,
        url: `/world/characters/${accountId}/actions.png`,
        ...ACTIONS_SHEET_LAYOUT,
      },
    },

    scale: 1.5,

    collision: {
      width: 10,
      height: 8,
      offsetX: 11,
      offsetY: 18,
    },

    walkSpeed: 88,
    animations: SHARED_ANIMATIONS,
  };
}

export const CHARACTER_CONFIGS: Record<AccountId, CharacterConfig> = {
  andre: createCharacterConfig("andre"),
  flavia: createCharacterConfig("flavia"),
};

/** Referência rápida do actions.png atual. */
export const ACTION_SHEET_LAYOUT = {
  frameWidth: 48,
  frameHeight: 48,
  columns: 2,
  rows: 18,
  groups: {
    mining: { rows: [0, 1, 2] },
    chopping: { rows: [3, 4, 5] },
    hoeing: { rows: [6, 7, 8] },
    watering: { rows: [9, 10, 11] },
    placing: { rows: [12, 13, 14] },
    pickup: { rows: [15, 16, 17] },
  },
} as const;
