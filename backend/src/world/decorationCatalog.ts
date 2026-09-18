import { WorldSceneId } from "./types";

export type ServerCatalogKind = "object" | "connected-object" | "terrain" | "path" | "restore-terrain";

export interface ServerCatalogRule {
  kind: ServerCatalogKind;
  scenes: readonly WorldSceneId[];
  footprint: { width: number; height: number };
  collision?: boolean;
  rotations?: readonly number[];
  connectionStep?: { x: number; y: number };
  connectionOrigin?: { x: number; y: number };
  /** Retângulos físicos em tiles, relativos a gridX/gridY. */
  placementRects?: readonly { x: number; y: number; width: number; height: number }[];
}

const exterior = ["exterior"] as const;
const interior = ["house-interior"] as const;

function tiledCollisionRects(
  footprint: { width: number; height: number },
  source: { width: number; height: number },
  display: { width: number; height: number },
  collisions: readonly { x: number; y: number; width: number; height: number }[],
) {
  const centerX = footprint.width / 2;
  const bottomY = footprint.height;
  const left = centerX - display.width / 32;
  const top = bottomY - display.height / 16;
  const scaleX = display.width / source.width / 16;
  const scaleY = display.height / source.height / 16;
  return collisions.map((shape) => ({
    x: left + shape.x * scaleX,
    y: top + shape.y * scaleY,
    width: shape.width * scaleX,
    height: shape.height * scaleY,
  }));
}

/**
 * Metadados mínimos confiados pelo servidor. Visual, frame e depth pertencem
 * ao catálogo do Phaser; aqui ficam somente regras que afetam integridade do
 * save e validação multiplayer.
 */
export const WORLD_ITEM_RULES = {
  plant: { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "plant-bush": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "plant-yellow": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "plant-white": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "plant-red": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "plant-groundcover": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "plant-red-pot": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "plant-sprout": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "plant-purple": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "house-plant": { kind: "object", scenes: interior, footprint: { width: 1, height: 1 } },
  "house-plant-tall": { kind: "object", scenes: interior, footprint: { width: 1, height: 1 } },
  "house-plant-small": { kind: "object", scenes: interior, footprint: { width: 1, height: 1 } },
  "house-plant-leafy": { kind: "object", scenes: interior, footprint: { width: 1, height: 1 } },
  "house-plant-round": { kind: "object", scenes: interior, footprint: { width: 1, height: 1 } },
  chest: { kind: "object", scenes: interior, footprint: { width: 1, height: 1 }, placementRects: tiledCollisionRects({ width: 1, height: 1 }, { width: 32, height: 32 }, { width: 48, height: 48 }, [{ x: 9.995, y: 14.166, width: 11.018, height: 10.782 }]) },
  barrel: { kind: "object", scenes: interior, footprint: { width: 1, height: 1 }, placementRects: tiledCollisionRects({ width: 1, height: 1 }, { width: 32, height: 32 }, { width: 48, height: 48 }, [{ x: 9.208, y: 14.245, width: 13.773, height: 12.277 }]) },
  crate: { kind: "object", scenes: interior, footprint: { width: 1, height: 1 }, placementRects: tiledCollisionRects({ width: 1, height: 1 }, { width: 32, height: 32 }, { width: 48, height: 48 }, [{ x: 7.004, y: 13.301, width: 17.078, height: 15.189 }]) },
  "small-chest": { kind: "object", scenes: interior, footprint: { width: 1, height: 1 }, placementRects: tiledCollisionRects({ width: 1, height: 1 }, { width: 32, height: 32 }, { width: 48, height: 48 }, [{ x: 11.176, y: 13.615, width: 10.625, height: 9.995 }]) },
  "fire-pit": { kind: "object", scenes: exterior, footprint: { width: 3, height: 3 }, placementRects: tiledCollisionRects({ width: 3, height: 3 }, { width: 48, height: 48 }, { width: 96, height: 96 }, [{ x: 12.909, y: 12, width: 21.636, height: 23.091 }]) },
  table: { kind: "object", scenes: interior, footprint: { width: 3, height: 2 }, placementRects: tiledCollisionRects({ width: 3, height: 2 }, { width: 48, height: 48 }, { width: 58.68, height: 58.68 }, [{ x: 8, y: 21.818, width: 33.818, height: 21.091 }]) },
  bed: { kind: "object", scenes: interior, footprint: { width: 2, height: 2 }, placementRects: tiledCollisionRects({ width: 2, height: 2 }, { width: 32, height: 48 }, { width: 42.667, height: 64 }, [{ x: 5.875, y: 22.5, width: 19.188, height: 24.25 }]) },
  chair: { kind: "object", scenes: interior, footprint: { width: 1, height: 1 } },
  "chair-side": { kind: "object", scenes: interior, footprint: { width: 1, height: 1 }, rotations: [0, 180] },
  "chair-right": { kind: "object", scenes: interior, footprint: { width: 1, height: 1 } },
  "chair-front": { kind: "object", scenes: interior, footprint: { width: 1, height: 1 } },
  couch: { kind: "object", scenes: interior, footprint: { width: 2, height: 3 }, placementRects: tiledCollisionRects({ width: 2, height: 3 }, { width: 48, height: 48 }, { width: 48, height: 48 }, [{ x: -0.25, y: 12.75, width: 23.25, height: 35.125 }]) },
  "couch-horizontal": { kind: "object", scenes: interior, footprint: { width: 3, height: 2 }, placementRects: tiledCollisionRects({ width: 3, height: 2 }, { width: 48, height: 48 }, { width: 48, height: 48 }, [{ x: 0.125, y: 10.375, width: 46.875, height: 21 }]) },
  "couch-front": { kind: "object", scenes: interior, footprint: { width: 3, height: 2 }, placementRects: tiledCollisionRects({ width: 3, height: 2 }, { width: 48, height: 48 }, { width: 48, height: 48 }, [{ x: 0.125, y: 29.75, width: 47.75, height: 17.75 }]) },
  "couch-right": { kind: "object", scenes: interior, footprint: { width: 2, height: 3 }, placementRects: tiledCollisionRects({ width: 2, height: 3 }, { width: 48, height: 48 }, { width: 48, height: 48 }, [{ x: 25, y: 9, width: 23, height: 39.25 }]) },
  shelf: { kind: "object", scenes: interior, footprint: { width: 3, height: 2 }, placementRects: tiledCollisionRects({ width: 3, height: 2 }, { width: 48, height: 64 }, { width: 48, height: 64 }, [{ x: 3.875, y: 41.375, width: 41.125, height: 22.75 }]) },
  "shelf-wide": { kind: "object", scenes: interior, footprint: { width: 3, height: 2 }, placementRects: tiledCollisionRects({ width: 3, height: 2 }, { width: 48, height: 64 }, { width: 48, height: 64 }, [{ x: 1.875, y: 35.75, width: 44.5, height: 29.125 }]) },
  "shelf-small": { kind: "object", scenes: interior, footprint: { width: 2, height: 2 }, placementRects: tiledCollisionRects({ width: 2, height: 2 }, { width: 32, height: 48 }, { width: 32, height: 48 }, [{ x: 3.875, y: 23.625, width: 24.125, height: 24.75 }]) },
  fence: { kind: "connected-object", scenes: exterior, footprint: { width: 2, height: 2 }, connectionStep: { x: 2, y: 2 }, connectionOrigin: { x: 1, y: 0 }, placementRects: tiledCollisionRects({ width: 2, height: 2 }, { width: 16, height: 16 }, { width: 32, height: 32 }, [{ x: 5.981, y: 2.086, width: 3.896, height: 9.877 }]) },
  "carpet-path": { kind: "path", scenes: interior, footprint: { width: 1, height: 1 }, collision: false },
  tree: { kind: "object", scenes: exterior, footprint: { width: 1, height: 3 }, placementRects: tiledCollisionRects({ width: 1, height: 3 }, { width: 64, height: 80 }, { width: 76.8, height: 96 }, [{ x: 25.75, y: 26.875, width: 13.125, height: 45.375 }]) },
  "tree-small": { kind: "object", scenes: exterior, footprint: { width: 1, height: 2 }, placementRects: tiledCollisionRects({ width: 1, height: 2 }, { width: 64, height: 80 }, { width: 64, height: 80 }, [{ x: 27.091, y: 33.636, width: 11.091, height: 34.182 }]) },
  "tree-large": { kind: "object", scenes: exterior, footprint: { width: 1, height: 4 }, placementRects: tiledCollisionRects({ width: 1, height: 4 }, { width: 64, height: 80 }, { width: 115.2, height: 144 }, [{ x: 21.273, y: 42, width: 18.545, height: 32.909 }]) },
  "tree-round": { kind: "object", scenes: exterior, footprint: { width: 1, height: 3 }, placementRects: tiledCollisionRects({ width: 1, height: 3 }, { width: 64, height: 80 }, { width: 64, height: 80 }, [{ x: 26, y: 38.909, width: 13.818, height: 37.636 }]) },
  "tree-leafy": { kind: "object", scenes: exterior, footprint: { width: 1, height: 3 }, placementRects: tiledCollisionRects({ width: 1, height: 3 }, { width: 64, height: 80 }, { width: 89.6, height: 112 }, [{ x: 25.818, y: 32.545, width: 12.364, height: 26.727 }]) },
  rock: { kind: "object", scenes: exterior, footprint: { width: 2, height: 1 } },
  "rock-large": { kind: "object", scenes: exterior, footprint: { width: 2, height: 1 } },
  "rock-round": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "rock-flat": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "rock-mossy": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "rock-small": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "rock-pair": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "rock-cluster": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "rock-pointed": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "rock-light": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "rock-tiny": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "rock-tiny-pair": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  bush: { kind: "object", scenes: exterior, footprint: { width: 3, height: 2 } },
  "bush-light": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "bush-wide": { kind: "object", scenes: exterior, footprint: { width: 2, height: 1 } },
  "bush-pink": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "bush-yellow": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "bush-dark": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  dirt: { kind: "terrain", scenes: exterior, footprint: { width: 1, height: 1 }, collision: false },
  sand: { kind: "terrain", scenes: exterior, footprint: { width: 1, height: 1 }, collision: false },
  water: { kind: "terrain", scenes: exterior, footprint: { width: 1, height: 1 }, collision: true },
  "restore-terrain": { kind: "restore-terrain", scenes: ["exterior", "house-interior"], footprint: { width: 1, height: 1 } },
} as const satisfies Record<string, ServerCatalogRule>;

export function getWorldItemRule(id: string): ServerCatalogRule | undefined {
  return WORLD_ITEM_RULES[id as keyof typeof WORLD_ITEM_RULES];
}

export function isWorldItemId(value: unknown): value is string {
  return typeof value === "string" && Boolean(getWorldItemRule(value));
}

export function isObjectItem(id: string) {
  const kind = getWorldItemRule(id)?.kind;
  return kind === "object" || kind === "connected-object";
}

export function isTerrainItem(id: string) {
  const kind = getWorldItemRule(id)?.kind;
  return kind === "terrain" || kind === "path";
}

export function isValidItemRotation(id: string, rotation: number) {
  const allowed = getWorldItemRule(id)?.rotations ?? [0];
  return Number.isFinite(rotation) && allowed.includes(rotation);
}
