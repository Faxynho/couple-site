import { AccountId } from "../accounts/types";

export const WORLD_ID = "andre-flavia-world-v1";
export const WORLD_SCENES = ["exterior", "house-interior"] as const;
export const WORLD_DIRECTIONS = ["down", "up", "left", "right"] as const;

export type WorldSceneId = (typeof WORLD_SCENES)[number];
export type WorldDirection = (typeof WORLD_DIRECTIONS)[number];

export interface WorldPlayerState {
  accountId: AccountId;
  scene: WorldSceneId;
  x: number;
  y: number;
  direction: WorldDirection;
  moving: boolean;
  skinId: string;
  updatedAt: number;
}

export interface WorldDecoration {
  id: string;
  itemId: string;
  scene: WorldSceneId;
  gridX: number;
  gridY: number;
  rotation: number;
  placedBy: AccountId;
  updatedAt: number;
}

export interface WorldTerrainCell {
  scene: WorldSceneId;
  gridX: number;
  gridY: number;
  terrainId: string;
  placedBy: AccountId;
  updatedAt: number;
}

export interface PersistentWorldData {
  version: 2;
  worldId: typeof WORLD_ID;
  players: Record<AccountId, WorldPlayerState>;
  decorations: WorldDecoration[];
  terrain: WorldTerrainCell[];
  updatedAt: number;
}

export interface WorldSnapshot {
  worldId: typeof WORLD_ID;
  players: WorldPlayerState[];
  decorations: WorldDecoration[];
  terrain: WorldTerrainCell[];
}
