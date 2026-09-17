import { WorldSceneId } from "@/world/types";
import { getWorldTilesetAsset } from "./tilesetConfig";

export const DECORATION_CATEGORIES = [
  "plants",
  "decorations",
  "furniture",
  "paths",
  "nature",
  "terrain",
] as const;

export type DecorationCategory = (typeof DECORATION_CATEGORIES)[number];
export type CatalogItemKind = "object" | "connected-object" | "terrain" | "path" | "restore-terrain";
export type TerrainLayerName = "Ground" | "GroundDetails" | "GroundDetailsTop";

export interface GridFootprint {
  width: number;
  height: number;
}

export interface CollisionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TileObjectSource {
  tileset: string;
  frame: number;
  displayWidth: number;
  displayHeight: number;
  /** Offset visual em relação ao centro inferior do footprint. */
  offsetX?: number;
  offsetY?: number;
  flipX?: boolean;
}

interface CatalogBase {
  id: string;
  name: string;
  icon: string;
  category: DecorationCategory;
  kind: CatalogItemKind;
  scenes: readonly WorldSceneId[];
  footprint: GridFootprint;
  rotation: readonly number[];
}

export interface ObjectCatalogItem extends CatalogBase {
  kind: "object";
  source: TileObjectSource;
  /** Formas copiadas dos collision objects do tile no TMJ. */
  collisions: readonly CollisionRect[];
  depth: { behavior: "y-sort" | "above-player"; sortOffsetY: number };
}

export interface ConnectedCatalogItem extends CatalogBase {
  kind: "connected-object";
  source: TileObjectSource;
  connectionGroup: string;
  connectionStep: { x: number; y: number };
  connectionOrigin: { x: number; y: number };
  /** Máscara N=1, E=2, S=4, W=8. */
  variants: Readonly<Record<number, number>>;
  variantCollisions: Readonly<Record<number, readonly CollisionRect[]>>;
  depth: { behavior: "y-sort"; sortOffsetY: number };
}

export interface TerrainCatalogItem extends CatalogBase {
  kind: "terrain" | "path";
  source: Pick<TileObjectSource, "tileset" | "frame">;
  terrainLayer: TerrainLayerName;
  collision: boolean;
  autotile: {
    /** Frames que já são usados como esse terreno na layer equivalente do TMJ. */
    baseFrames: readonly number[] | "all-used-frames";
    mode: "same-terrain" | "water-shore";
    shoreTileset?: string;
    fallbackFrame: number;
  };
}

export interface RestoreTerrainCatalogItem extends CatalogBase {
  kind: "restore-terrain";
}

export type DecorationCatalogItem = ObjectCatalogItem | ConnectedCatalogItem | TerrainCatalogItem | RestoreTerrainCatalogItem;

const exterior = ["exterior"] as const;
const interior = ["house-interior"] as const;

/**
 * Fonte única do editor no frontend. Todos os frames abaixo existem e são
 * usados nos TMJ atuais, ou possuem collision object definido no próprio TMJ.
 * Assets soltos não usados pelos mapas não entram neste catálogo.
 */
export const DECORATION_CATALOG = {
  plant: {
    id: "plant", name: "Flor Rosa", icon: "🌸", category: "plants", kind: "object", scenes: exterior,
    footprint: { width: 1, height: 1 }, rotation: [0],
    source: { tileset: "plants-v2", frame: 1, displayWidth: 52.701, displayHeight: 52.701 },
    collisions: [], depth: { behavior: "y-sort", sortOffsetY: -16 },
  },
  "plant-bush": {
    id: "plant-bush", name: "Arbusto Baixo", icon: "🌿", category: "plants", kind: "object", scenes: exterior,
    footprint: { width: 1, height: 1 }, rotation: [0],
    source: { tileset: "plants-v2", frame: 5, displayWidth: 32, displayHeight: 32 },
    collisions: [], depth: { behavior: "y-sort", sortOffsetY: -16 },
  },
  "plant-yellow": {
    id: "plant-yellow", name: "Flor Amarela", icon: "🌼", category: "plants", kind: "object", scenes: exterior,
    footprint: { width: 1, height: 1 }, rotation: [0],
    source: { tileset: "plants-v2", frame: 8, displayWidth: 32, displayHeight: 32 },
    collisions: [], depth: { behavior: "y-sort", sortOffsetY: -16 },
  },
  "house-plant": {
    id: "house-plant", name: "Planta de Casa", icon: "🪴", category: "plants", kind: "object", scenes: interior,
    footprint: { width: 1, height: 1 }, rotation: [0],
    source: { tileset: "house-plants", frame: 3, displayWidth: 16, displayHeight: 16 },
    collisions: [], depth: { behavior: "above-player", sortOffsetY: 18 },
  },
  chest: {
    id: "chest", name: "Gaveteiro", icon: "▰", category: "decorations", kind: "object", scenes: interior,
    footprint: { width: 1, height: 1 }, rotation: [0],
    source: { tileset: "props-1", frame: 1, displayWidth: 48, displayHeight: 48 },
    collisions: [{ x: 9.995, y: 14.166, width: 11.018, height: 10.782 }],
    depth: { behavior: "y-sort", sortOffsetY: 0 },
  },
  barrel: {
    id: "barrel", name: "Barril", icon: "🛢", category: "decorations", kind: "object", scenes: interior,
    footprint: { width: 1, height: 1 }, rotation: [0],
    source: { tileset: "props-1", frame: 2, displayWidth: 48, displayHeight: 48 },
    collisions: [{ x: 9.208, y: 14.245, width: 13.773, height: 12.277 }],
    depth: { behavior: "y-sort", sortOffsetY: 0 },
  },
  "fire-pit": {
    id: "fire-pit", name: "Fogueira de Pedra", icon: "🔥", category: "decorations", kind: "object", scenes: exterior,
    footprint: { width: 3, height: 3 }, rotation: [0],
    source: { tileset: "pit", frame: 1, displayWidth: 96, displayHeight: 96 },
    collisions: [{ x: 12.909, y: 12, width: 21.636, height: 23.091 }],
    depth: { behavior: "y-sort", sortOffsetY: -64 },
  },
  table: {
    id: "table", name: "Mesa de Madeira", icon: "▦", category: "furniture", kind: "object", scenes: interior,
    footprint: { width: 3, height: 2 }, rotation: [0],
    source: { tileset: "table-1", frame: 0, displayWidth: 58.68, displayHeight: 58.68 },
    collisions: [{ x: 8, y: 21.818, width: 33.818, height: 21.091 }],
    depth: { behavior: "y-sort", sortOffsetY: -12 },
  },
  bed: {
    id: "bed", name: "Cama", icon: "🛏", category: "furniture", kind: "object", scenes: interior,
    footprint: { width: 2, height: 2 }, rotation: [0],
    source: { tileset: "beds", frame: 0, displayWidth: 42.667, displayHeight: 64 },
    collisions: [{ x: 5.875, y: 22.5, width: 19.188, height: 24.25 }],
    depth: { behavior: "y-sort", sortOffsetY: -18 },
  },
  chair: {
    id: "chair", name: "Cadeira", icon: "🪑", category: "furniture", kind: "object", scenes: interior,
    footprint: { width: 1, height: 1 }, rotation: [0],
    source: { tileset: "chairs", frame: 3, displayWidth: 22.005, displayHeight: 44.01 },
    collisions: [], depth: { behavior: "y-sort", sortOffsetY: 0 },
  },
  "chair-side": {
    id: "chair-side", name: "Cadeira Lateral", icon: "🪑", category: "furniture", kind: "object", scenes: interior,
    footprint: { width: 1, height: 1 }, rotation: [0, 180],
    source: { tileset: "chairs", frame: 0, displayWidth: 22.005, displayHeight: 44.01 },
    collisions: [], depth: { behavior: "y-sort", sortOffsetY: 0 },
  },
  couch: {
    id: "couch", name: "Sofá", icon: "▤", category: "furniture", kind: "object", scenes: interior,
    footprint: { width: 2, height: 3 }, rotation: [0],
    source: { tileset: "couch", frame: 1, displayWidth: 48, displayHeight: 48 },
    collisions: [{ x: -0.25, y: 12.75, width: 23.25, height: 35.125 }],
    depth: { behavior: "y-sort", sortOffsetY: 0 },
  },
  shelf: {
    id: "shelf", name: "Estante", icon: "▥", category: "furniture", kind: "object", scenes: interior,
    footprint: { width: 3, height: 2 }, rotation: [0],
    source: { tileset: "shelf-1", frame: 1, displayWidth: 48, displayHeight: 64 },
    collisions: [{ x: 3.875, y: 41.375, width: 41.125, height: 22.75 }],
    depth: { behavior: "y-sort", sortOffsetY: 0 },
  },
  fence: {
    id: "fence", name: "Cerca de Madeira", icon: "╫", category: "paths", kind: "connected-object", scenes: exterior,
    footprint: { width: 2, height: 2 }, rotation: [0],
    source: { tileset: "fences", frame: 12, displayWidth: 32, displayHeight: 32 },
    connectionGroup: "wood-fence", connectionStep: { x: 2, y: 2 }, connectionOrigin: { x: 1, y: 0 },
    variants: {
      0: 12, 1: 8, 2: 13, 3: 9, 4: 0, 5: 4, 6: 1, 7: 5,
      8: 15, 9: 11, 10: 14, 11: 10, 12: 3, 13: 7, 14: 2, 15: 6,
    },
    variantCollisions: {
      0: [{ x: 6.965, y: 1.928, width: 1.968, height: 13.93 }],
      1: [{ x: 6.886, y: 6.926, width: 2.046, height: 9.208 }, { x: 7.988, y: 6.926, width: 8.657, height: 3.148 }],
      2: [{ x: 6.886, y: 6.926, width: 2.046, height: 9.208 }, { x: 0, y: 7.004, width: 16.606, height: 3.227 }],
      3: [{ x: 6.886, y: 7.162, width: 2.007, height: 8.618 }, { x: -1.299, y: 7.162, width: 9.011, height: 2.715 }],
      4: [{ x: 6.926, y: 0.118, width: 2.007, height: 15.701 }],
      5: [{ x: 6.965, y: 0.079, width: 1.968, height: 15.937 }, { x: 8.815, y: 7.162, width: 7.162, height: 2.794 }],
      6: [{ x: 6.926, y: 0.118, width: 2.007, height: 15.701 }, { x: 0, y: 7.004, width: 16.606, height: 3.227 }],
      7: [{ x: 6.926, y: 0.118, width: 2.007, height: 15.701 }, { x: 0, y: 7.004, width: 8.224, height: 2.912 }],
      8: [{ x: 6.926, y: 0.079, width: 2.086, height: 11.687 }],
      9: [{ x: 7.004, y: 0.079, width: 1.889, height: 9.877 }, { x: 8.854, y: 6.808, width: 7.122, height: 3.109 }],
      10: [{ x: -1.495, y: 6.886, width: 17.432, height: 3.03 }, { x: 7.044, y: 0.079, width: 1.731, height: 9.169 }],
      11: [{ x: 6.965, y: 0.118, width: 2.086, height: 9.759 }, { x: 0, y: 7.004, width: 8.224, height: 2.912 }],
      12: [{ x: 5.981, y: 2.086, width: 3.896, height: 9.877 }],
      13: [{ x: 6.021, y: 7.004, width: 9.798, height: 2.991 }],
      14: [{ x: 0, y: 7.004, width: 16.606, height: 3.227 }],
      15: [{ x: -0.275, y: 7.044, width: 10.192, height: 2.991 }],
    },
    depth: { behavior: "y-sort", sortOffsetY: 0 },
  },
  "carpet-path": {
    id: "carpet-path", name: "Tapete", icon: "▧", category: "paths", kind: "path", scenes: interior,
    footprint: { width: 1, height: 1 }, rotation: [0],
    source: { tileset: "carpet-1", frame: 10 }, terrainLayer: "GroundDetailsTop", collision: false,
    autotile: { baseFrames: "all-used-frames", mode: "same-terrain", fallbackFrame: 10 },
  },
  tree: {
    id: "tree", name: "Árvore Frutífera", icon: "🌳", category: "nature", kind: "object", scenes: exterior,
    footprint: { width: 1, height: 3 }, rotation: [0],
    source: { tileset: "trees_v2", frame: 1, displayWidth: 76.8, displayHeight: 96 },
    collisions: [{ x: 25.75, y: 26.875, width: 13.125, height: 45.375 }],
    depth: { behavior: "y-sort", sortOffsetY: -16 },
  },
  "tree-small": {
    id: "tree-small", name: "Árvore Pequena", icon: "🌲", category: "nature", kind: "object", scenes: exterior,
    footprint: { width: 1, height: 2 }, rotation: [0],
    source: { tileset: "trees_v2", frame: 3, displayWidth: 64, displayHeight: 80 },
    collisions: [{ x: 27.091, y: 33.636, width: 11.091, height: 34.182 }],
    depth: { behavior: "y-sort", sortOffsetY: -16 },
  },
  rock: {
    id: "rock", name: "Pedra", icon: "🪨", category: "nature", kind: "object", scenes: exterior,
    footprint: { width: 2, height: 1 }, rotation: [0],
    source: { tileset: "rocks", frame: 2, displayWidth: 32, displayHeight: 32 },
    collisions: [], depth: { behavior: "y-sort", sortOffsetY: -32 },
  },
  bush: {
    id: "bush", name: "Arbusto", icon: "🌿", category: "nature", kind: "object", scenes: exterior,
    footprint: { width: 3, height: 2 }, rotation: [0],
    source: { tileset: "bushes", frame: 0, displayWidth: 48, displayHeight: 48 },
    collisions: [], depth: { behavior: "y-sort", sortOffsetY: -24 },
  },
  dirt: {
    id: "dirt", name: "Terra", icon: "🟫", category: "terrain", kind: "terrain", scenes: exterior,
    footprint: { width: 1, height: 1 }, rotation: [0], source: { tileset: "tilled-dirt", frame: 12 },
    terrainLayer: "GroundDetails", collision: false,
    autotile: { baseFrames: "all-used-frames", mode: "same-terrain", fallbackFrame: 12 },
  },
  sand: {
    id: "sand", name: "Areia", icon: "🟨", category: "terrain", kind: "terrain", scenes: exterior,
    footprint: { width: 1, height: 1 }, rotation: [0], source: { tileset: "ground-2", frame: 140 },
    terrainLayer: "GroundDetails", collision: false,
    autotile: { baseFrames: [123, 124, 125, 139, 140, 141, 155, 156, 157], mode: "same-terrain", fallbackFrame: 140 },
  },
  water: {
    id: "water", name: "Água", icon: "💧", category: "terrain", kind: "terrain", scenes: exterior,
    footprint: { width: 1, height: 1 }, rotation: [0], source: { tileset: "water", frame: 0 },
    terrainLayer: "Ground", collision: true,
    autotile: { baseFrames: [0, 1, 2, 3], mode: "water-shore", shoreTileset: "grass", fallbackFrame: 0 },
  },
  "restore-terrain": {
    id: "restore-terrain", name: "Terreno Original", icon: "↶", category: "terrain", kind: "restore-terrain", scenes: ["exterior", "house-interior"],
    footprint: { width: 1, height: 1 }, rotation: [0],
  },
} as const satisfies Record<string, DecorationCatalogItem>;

export type DecorationCatalogId = keyof typeof DECORATION_CATALOG;

export function getDecorationDefinition(id: string): DecorationCatalogItem | undefined {
  return DECORATION_CATALOG[id as DecorationCatalogId];
}

export function getCatalogItems(category: DecorationCategory, scene: WorldSceneId) {
  return Object.values(DECORATION_CATALOG).filter((item) => item.category === category && item.scenes.includes(scene as never));
}

export function isTerrainDefinition(item: DecorationCatalogItem): item is TerrainCatalogItem {
  return item.kind === "terrain" || item.kind === "path";
}

export function validateDecorationCatalog(catalog: Record<string, DecorationCatalogItem> = DECORATION_CATALOG) {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const [key, item] of Object.entries(catalog)) {
    if (key !== item.id) errors.push(`${key}: o id precisa ser igual à chave do catálogo.`);
    if (ids.has(item.id)) errors.push(`${item.id}: id duplicado.`);
    ids.add(item.id);
    if (item.footprint.width < 1 || item.footprint.height < 1) errors.push(`${item.id}: footprint inválido.`);
    if (item.rotation.length === 0 || item.rotation.some((value) => !Number.isFinite(value) || value % 90 !== 0)) errors.push(`${item.id}: rotações devem ser múltiplos de 90°.`);
    if (item.scenes.length === 0) errors.push(`${item.id}: nenhum mapa permitido.`);
    if (item.kind === "object" || item.kind === "connected-object") {
      if (!getWorldTilesetAsset(item.source.tileset)) errors.push(`${item.id}: tileset inexistente (${item.source.tileset}).`);
      if (!Number.isInteger(item.source.frame) || item.source.frame < 0 || item.source.displayWidth <= 0 || item.source.displayHeight <= 0) errors.push(`${item.id}: source inválido.`);
    }
    if (item.kind === "connected-object") {
      if (item.connectionStep.x < 1 || item.connectionStep.y < 1) errors.push(`${item.id}: passo de conexão inválido.`);
      for (let mask = 0; mask < 16; mask++) if (!Number.isInteger(item.variants[mask])) errors.push(`${item.id}: falta a variante da máscara ${mask}.`);
      for (const frame of Object.values(item.variants)) if (!item.variantCollisions[frame]) errors.push(`${item.id}: faltam colisões declaradas para o frame ${frame}.`);
    }
    if (isTerrainDefinition(item)) {
      if (!getWorldTilesetAsset(item.source.tileset)) errors.push(`${item.id}: tileset de terreno inexistente (${item.source.tileset}).`);
      if (!Number.isInteger(item.source.frame) || item.source.frame < 0) errors.push(`${item.id}: frame de terreno inválido.`);
    }
  }
  if (errors.length > 0 && process.env.NODE_ENV !== "production") throw new Error(`[Nosso Mundo] Catálogo de decoração inválido:\n${errors.join("\n")}`);
  return errors;
}

validateDecorationCatalog();
