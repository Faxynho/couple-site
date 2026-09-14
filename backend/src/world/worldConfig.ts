import { AccountId } from "../accounts/types";
import {
  WORLD_DECORATION_TYPES,
  WORLD_DIRECTIONS,
  WORLD_SCENES,
  WorldDecoration,
  WorldDecorationType,
  WorldDirection,
  WorldPlayerState,
  WorldSceneId,
} from "./types";

export const WORLD_TILE_SIZE = 16;
export const WORLD_MAX_SPEED_PX_PER_SECOND = 128;

export const WORLD_SCENE_RULES: Record<WorldSceneId, {
  width: number;
  height: number;
  spawn: { x: number; y: number };
  decorationArea: { x: number; y: number; width: number; height: number };
  blockedDecorationRects: Array<{ x: number; y: number; width: number; height: number }>;
}> = {
  exterior: {
    width: 80 * WORLD_TILE_SIZE,
    height: 50 * WORLD_TILE_SIZE,
    spawn: { x: 47 * WORLD_TILE_SIZE, y: 19 * WORLD_TILE_SIZE },
    decorationArea: { x: 3, y: 3, width: 74, height: 44 },
    blockedDecorationRects: [
      { x: 59, y: 5, width: 16, height: 13 },
      { x: 42, y: 5, width: 8, height: 9 },

      { x: 0, y: 0, width: 80, height: 2 },
      { x: 0, y: 48, width: 80, height: 2 },
    ],
  },
  "house-interior": {
    width: 24 * WORLD_TILE_SIZE,
    height: 18 * WORLD_TILE_SIZE,
    spawn: { x: 12 * WORLD_TILE_SIZE, y: 14 * WORLD_TILE_SIZE },
    decorationArea: { x: 2, y: 3, width: 20, height: 12 },
    blockedDecorationRects: [
      { x: 0, y: 0, width: 24, height: 3 },
      { x: 0, y: 0, width: 2, height: 18 },
      { x: 22, y: 0, width: 2, height: 18 },
      { x: 0, y: 16, width: 10, height: 2 },
      { x: 14, y: 16, width: 10, height: 2 },
    ],
  },
};

export const WORLD_DECORATION_RULES: Record<WorldDecorationType, { width: number; height: number }> = {
  chair: { width: 1, height: 1 },
  table: { width: 2, height: 2 },
  plant: { width: 1, height: 1 },
  chest: { width: 1, height: 1 },
  fence: { width: 1, height: 1 },
};

export function isWorldScene(value: unknown): value is WorldSceneId {
  return typeof value === "string" && (WORLD_SCENES as readonly string[]).includes(value);
}

export function isWorldDirection(value: unknown): value is WorldDirection {
  return typeof value === "string" && (WORLD_DIRECTIONS as readonly string[]).includes(value);
}

export function isWorldDecorationType(value: unknown): value is WorldDecorationType {
  return typeof value === "string" && (WORLD_DECORATION_TYPES as readonly string[]).includes(value);
}

export function defaultWorldPlayer(accountId: AccountId): WorldPlayerState {
  const spawn = WORLD_SCENE_RULES.exterior.spawn;
  return {
    accountId,
    scene: "exterior",
    x: spawn.x,
    y: spawn.y,
    direction: "down",
    moving: false,
    skinId: `${accountId}-default`,
    updatedAt: Date.now(),
  };
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function canPlaceDecoration(
  scene: WorldSceneId,
  type: WorldDecorationType,
  gridX: number,
  gridY: number,
  decorations: WorldDecoration[],
  ignoredId?: string
): boolean {
  if (!Number.isInteger(gridX) || !Number.isInteger(gridY)) return false;
  const rules = WORLD_SCENE_RULES[scene];
  const footprint = WORLD_DECORATION_RULES[type];
  const candidate = { x: gridX, y: gridY, width: footprint.width, height: footprint.height };
  const area = rules.decorationArea;
  if (candidate.x < area.x || candidate.y < area.y || candidate.x + candidate.width > area.x + area.width || candidate.y + candidate.height > area.y + area.height) return false;
  if (rules.blockedDecorationRects.some((rect) => overlaps(candidate, rect))) return false;
  return !decorations.some((decoration) => {
    if (decoration.id === ignoredId || decoration.scene !== scene) return false;
    const occupied = WORLD_DECORATION_RULES[decoration.type];
    return overlaps(candidate, { x: decoration.gridX, y: decoration.gridY, width: occupied.width, height: occupied.height });
  });
}

export function clampWorldPosition(scene: WorldSceneId, x: number, y: number) {
  const rules = WORLD_SCENE_RULES[scene];
  return {
    x: Math.max(12, Math.min(rules.width - 12, x)),
    y: Math.max(18, Math.min(rules.height - 8, y)),
  };
}
