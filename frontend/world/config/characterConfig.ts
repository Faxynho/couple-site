import { AccountId } from "@/lib/accountSession";
import { WorldDirection } from "@/world/types";

export interface CharacterAnimationConfig {
  frames: number[];
  fps: number;
  repeat: number;
  flipX?: boolean;
}

export interface CharacterConfig {
  textureKey: string;
  walkSheet: string;
  actionsSheet: string;
  frameWidth: number;
  frameHeight: number;
  margin: number;
  spacing: number;
  scale: number;
  origin: { x: number; y: number };
  collision: { width: number; height: number; offsetX: number; offsetY: number };
  walkSpeed: number;
  animations: Record<WorldDirection, CharacterAnimationConfig>;
  idleFrames: Record<WorldDirection, number>;
}

const sharedLayout: Omit<CharacterConfig, "textureKey" | "walkSheet" | "actionsSheet"> = {
  frameWidth: 32,
  frameHeight: 32,
  margin: 0,
  spacing: 0,
  scale: 2,
  origin: { x: 0.5, y: 0.82 },
  collision: { width: 10, height: 8, offsetX: 11, offsetY: 22 },
  walkSpeed: 88,
  animations: {
    down: { frames: [0, 1, 2, 3, 4, 5], fps: 9, repeat: -1 },
    up: { frames: [12, 13, 14, 15, 16, 17], fps: 9, repeat: -1 },
    right: { frames: [24, 25, 26, 27, 28, 29], fps: 9, repeat: -1 },
    left: { frames: [24, 25, 26, 27, 28, 29], fps: 9, repeat: -1, flipX: true },
  },
  idleFrames: { down: 0, up: 12, right: 24, left: 24 },
};

export const CHARACTER_CONFIGS: Record<AccountId, CharacterConfig> = {
  andre: {
    ...sharedLayout,
    textureKey: "character-andre",
    walkSheet: "/world/characters/andre/walk.png",
    actionsSheet: "/world/characters/andre/actions.png",
  },
  flavia: {
    ...sharedLayout,
    textureKey: "character-flavia",
    walkSheet: "/world/characters/flavia/walk.png",
    actionsSheet: "/world/characters/flavia/actions.png",
  },
};

/**
 * actions.png: 3 colunas x 18 linhas, frames de 32 px. A coluna central é
 * espaçamento; os desenhos usam sobretudo as colunas 0 e 2. Os grupos de
 * linhas 0-2, 3-5, 6-8 e 9-11 são ferramentas direcionais (picareta,
 * pá/enxada e machado em variações). As linhas 12-17 formam o regador.
 * Estes índices ficam documentados para a próxima versão; esta versão usa
 * somente walk.png para não disparar ações sem mecânica correspondente.
 */
export const ACTION_SHEET_LAYOUT = {
  frameWidth: 32,
  frameHeight: 32,
  columns: 3,
  rows: 18,
  groups: {
    pickaxe: { rows: [0, 1, 2] },
    hoeOrShovel: { rows: [3, 4, 5] },
    axe: { rows: [6, 7, 8] },
    alternateTool: { rows: [9, 10, 11] },
    wateringCan: { rows: [12, 13, 14, 15, 16, 17] },
  },
} as const;
