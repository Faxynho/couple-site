import { AccountId } from "../accounts/types";

export const WORLD_ID = "andre-flavia-world-v1";
export const WORLD_SCENES = ["exterior", "house-interior"] as const;
export const WORLD_DIRECTIONS = ["down", "up", "left", "right"] as const;
export const WORLD_DECORATION_TYPES = ["chair", "table", "plant", "chest", "fence"] as const;

export type WorldSceneId = (typeof WORLD_SCENES)[number];
export type WorldDirection = (typeof WORLD_DIRECTIONS)[number];
export type WorldDecorationType = (typeof WORLD_DECORATION_TYPES)[number];

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
  type: WorldDecorationType;
  scene: WorldSceneId;
  gridX: number;
  gridY: number;
  placedBy: AccountId;
  updatedAt: number;
}

export interface PersistentWorldData {
  version: 1;
  worldId: typeof WORLD_ID;
  players: Record<AccountId, WorldPlayerState>;
  decorations: WorldDecoration[];
  updatedAt: number;
}

export interface WorldSnapshot {
  worldId: typeof WORLD_ID;
  players: WorldPlayerState[];
  decorations: WorldDecoration[];
}
