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
}

const exterior = ["exterior"] as const;
const interior = ["house-interior"] as const;

/**
 * Metadados mínimos confiados pelo servidor. Visual, frame e depth pertencem
 * ao catálogo do Phaser; aqui ficam somente regras que afetam integridade do
 * save e validação multiplayer.
 */
export const WORLD_ITEM_RULES = {
  plant: { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "plant-bush": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "plant-yellow": { kind: "object", scenes: exterior, footprint: { width: 1, height: 1 } },
  "house-plant": { kind: "object", scenes: interior, footprint: { width: 1, height: 1 } },
  chest: { kind: "object", scenes: interior, footprint: { width: 1, height: 1 } },
  barrel: { kind: "object", scenes: interior, footprint: { width: 1, height: 1 } },
  "fire-pit": { kind: "object", scenes: exterior, footprint: { width: 3, height: 3 } },
  table: { kind: "object", scenes: interior, footprint: { width: 3, height: 2 } },
  bed: { kind: "object", scenes: interior, footprint: { width: 2, height: 2 } },
  chair: { kind: "object", scenes: interior, footprint: { width: 1, height: 1 } },
  "chair-side": { kind: "object", scenes: interior, footprint: { width: 1, height: 1 }, rotations: [0, 180] },
  couch: { kind: "object", scenes: interior, footprint: { width: 2, height: 3 } },
  shelf: { kind: "object", scenes: interior, footprint: { width: 3, height: 2 } },
  fence: { kind: "connected-object", scenes: exterior, footprint: { width: 2, height: 2 }, connectionStep: { x: 2, y: 2 }, connectionOrigin: { x: 1, y: 0 } },
  "carpet-path": { kind: "path", scenes: interior, footprint: { width: 1, height: 1 }, collision: false },
  tree: { kind: "object", scenes: exterior, footprint: { width: 1, height: 3 } },
  "tree-small": { kind: "object", scenes: exterior, footprint: { width: 1, height: 2 } },
  rock: { kind: "object", scenes: exterior, footprint: { width: 2, height: 1 } },
  bush: { kind: "object", scenes: exterior, footprint: { width: 3, height: 2 } },
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
