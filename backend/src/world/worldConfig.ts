import { AccountId } from "../accounts/types";
import {
  WORLD_DIRECTIONS,
  WORLD_SCENES,
  WorldDecoration,
  WorldDirection,
  WorldPlayerState,
  WorldSceneId,
  WorldTerrainCell,
} from "./types";
import { getWorldItemRule, isTerrainItem, isWorldItemId } from "./decorationCatalog";

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

export function isWorldScene(value: unknown): value is WorldSceneId {
  return typeof value === "string" && (WORLD_SCENES as readonly string[]).includes(value);
}

export function isWorldDirection(value: unknown): value is WorldDirection {
  return typeof value === "string" && (WORLD_DIRECTIONS as readonly string[]).includes(value);
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

function placementRects(itemId: string, gridX: number, gridY: number) {
  const rule = getWorldItemRule(itemId);
  if (!rule) return [{ x: gridX, y: gridY, width: 1, height: 1 }];
  if (rule.placementRects?.length) {
    return rule.placementRects.map((rect) => ({ ...rect, x: gridX + rect.x, y: gridY + rect.y }));
  }
  return [{
    x: gridX + rule.footprint.width / 2 - 0.5,
    y: gridY + rule.footprint.height - 1,
    width: 1,
    height: 1,
  }];
}

function directlyConnected(itemId: string, gridX: number, gridY: number, other: WorldDecoration) {
  const candidate = getWorldItemRule(itemId);
  const occupied = getWorldItemRule(other.itemId);
  if (candidate?.kind !== "connected-object" || occupied?.kind !== "connected-object") return false;
  const step = candidate.connectionStep;
  if (!step || candidate.connectionOrigin?.x !== occupied.connectionOrigin?.x || candidate.connectionOrigin?.y !== occupied.connectionOrigin?.y) return false;
  const dx = Math.abs(gridX - other.gridX);
  const dy = Math.abs(gridY - other.gridY);
  return (dx === step.x && dy === 0) || (dy === step.y && dx === 0);
}

export function canPlaceDecoration(
  scene: WorldSceneId,
  itemId: string,
  gridX: number,
  gridY: number,
  decorations: WorldDecoration[],
  ignoredId?: string,
  terrain: WorldTerrainCell[] = [],
  allowSceneMismatch = false,
): boolean {
  if (!Number.isInteger(gridX) || !Number.isInteger(gridY)) return false;
  const itemRule = getWorldItemRule(itemId);
  if (!itemRule || (itemRule.kind !== "object" && itemRule.kind !== "connected-object") || (!allowSceneMismatch && !itemRule.scenes.includes(scene))) return false;
  const rules = WORLD_SCENE_RULES[scene];
  const footprint = itemRule.footprint;
  if (itemRule.kind === "connected-object") {
    const step = itemRule.connectionStep;
    const origin = itemRule.connectionOrigin;
    if (!step || !origin || (gridX - origin.x) % step.x !== 0 || (gridY - origin.y) % step.y !== 0) return false;
  }
  const candidate = { x: gridX, y: gridY, width: footprint.width, height: footprint.height };
  const area = rules.decorationArea;
  if (candidate.x < area.x || candidate.y < area.y || candidate.x + candidate.width > area.x + area.width || candidate.y + candidate.height > area.y + area.height) return false;
  const candidateRects = placementRects(itemId, gridX, gridY);
  if (rules.blockedDecorationRects.some((rect) => candidateRects.some((shape) => overlaps(shape, rect)))) return false;
  if (terrain.some((cell) => cell.scene === scene && cell.terrainId === "water" && candidateRects.some((shape) => overlaps(shape, { x: cell.gridX, y: cell.gridY, width: 1, height: 1 })))) return false;
  return !decorations.some((decoration) => {
    if (decoration.id === ignoredId || decoration.scene !== scene) return false;
    if (directlyConnected(itemId, gridX, gridY, decoration)) return false;
    return candidateRects.some((candidateRect) => placementRects(decoration.itemId, decoration.gridX, decoration.gridY)
      .some((occupiedRect) => overlaps(candidateRect, occupiedRect)));
  });
}

export function canPaintTerrain(
  scene: WorldSceneId,
  terrainId: string,
  gridX: number,
  gridY: number,
  decorations: WorldDecoration[],
) {
  if (!Number.isInteger(gridX) || !Number.isInteger(gridY) || !isWorldItemId(terrainId) || !isTerrainItem(terrainId)) return false;
  const terrainRule = getWorldItemRule(terrainId);
  if (!terrainRule?.scenes.includes(scene)) return false;
  const rules = WORLD_SCENE_RULES[scene];
  const cell = { x: gridX, y: gridY, width: 1, height: 1 };
  const area = rules.decorationArea;
  if (cell.x < area.x || cell.y < area.y || cell.x + 1 > area.x + area.width || cell.y + 1 > area.y + area.height) return false;
  if (rules.blockedDecorationRects.some((rect) => overlaps(cell, rect))) return false;
  return !decorations.some((decoration) => {
    if (decoration.scene !== scene) return false;
    return placementRects(decoration.itemId, decoration.gridX, decoration.gridY).some((occupied) => overlaps(cell, occupied));
  });
}

export function clampWorldPosition(scene: WorldSceneId, x: number, y: number) {
  const rules = WORLD_SCENE_RULES[scene];
  return {
    x: Math.max(12, Math.min(rules.width - 12, x)),
    y: Math.max(18, Math.min(rules.height - 8, y)),
  };
}
