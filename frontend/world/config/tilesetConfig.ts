export interface WorldTilesetAsset {
  textureKey: string;
  url: string;
  tileWidth: number;
  tileHeight: number;
  margin: number;
  spacing: number;
}

/**
 * Registro central dos PNGs que o Tiled pode usar como tileset.
 *
 * A chave DEVE bater com o nome do tileset no Tiled (os aliases abaixo
 * cobrem alguns nomes comuns). Ground, GroundDetails e Tile Objects usam
 * este mesmo cadastro.
 *
 * Para adicionar um PNG novo no futuro, basta:
 * 1) colocar o PNG em public/world/...;
 * 2) adicionar o tileset ao mapa no Tiled;
 * 3) cadastrar aqui nome + caminho + tamanho de cada sprite/tile.
 *
 * Depois disso a escolha do sprite, posição, colisão preset e animação pode
 * ser feita visualmente pelo Tiled, sem criar um asset diferente no código.
 */
export const WORLD_TILESET_ASSETS = {
  // Terreno
  grass: {
    textureKey: "world-tiles-grass",
    url: "/world/tiles/grass.png",
    tileWidth: 16,
    tileHeight: 16,
    margin: 0,
    spacing: 0,
  },
  hills: {
    textureKey: "world-tiles-hills",
    url: "/world/tiles/hills.png",
    tileWidth: 16,
    tileHeight: 16,
    margin: 0,
    spacing: 0,
  },
  paths: {
    textureKey: "world-tiles-paths",
    url: "/world/tiles/paths.png",
    tileWidth: 16,
    tileHeight: 16,
    margin: 0,
    spacing: 0,
  },
  "tilled-dirt": {
    textureKey: "world-tiles-tilled-dirt",
    url: "/world/tiles/tilled-dirt.png",
    tileWidth: 16,
    tileHeight: 16,
    margin: 0,
    spacing: 0,
  },
  water: {
    textureKey: "world-tiles-water",
    url: "/world/tiles/water.png",
    tileWidth: 16,
    tileHeight: 16,
    margin: 0,
    spacing: 0,
  },
  "house-floor": {
    textureKey: "world-tiles-house-floor",
    url: "/world/buildings/wooden-house-roof.png",
    tileWidth: 16,
    tileHeight: 16,
    margin: 0,
    spacing: 0,
  },
  "house-red": {
    textureKey: "world-house-red",
    url: "/world/buildings/house-red.png",
    tileWidth: 131,
    tileHeight: 128,
    margin: 0,
    spacing: 0,
  },
  "trees-v2": {
    textureKey: "world-trees-v2",
    url: "/world/nature/trees_v2.png",
    tileWidth: 64,
    tileHeight: 80,
    margin: 0,
    spacing: 0,
  },
  "wood-bridge": {
    textureKey: "world-wood-bridge",
    url: "/world/buildings/wood-bridge.png",
    tileWidth: 16,
    tileHeight: 16,
    margin: 0,
    spacing: 0,
  },
  "fences": {
    textureKey: "world-objects-fences",
    url: "/world/buildings/fences.png",
    tileWidth: 16,
    tileHeight: 16,
    margin: 0,
    spacing: 0,
  },
  "bushes": {
    textureKey: "world-objects-bushes",
    url: "/world/nature/bushes.png",
    tileWidth: 48,
    tileHeight: 48,
    margin: 0,
    spacing: 0,
  },
  "plants-v2": {
    textureKey: "world-objects-plants-v2",
    url: "/world/plants/plants-v2.png",
    tileWidth: 32,
    tileHeight: 32,
    margin: 0,
    spacing: 0,
  },

  // Objetos em sheets regulares já existentes no projeto.
  // Estes podem ser usados como Tile Objects visuais na layer Objects.
  doors: {
    textureKey: "world-objects-doors",
    url: "/world/buildings/doors.png",
    tileWidth: 16,
    tileHeight: 16,
    margin: 0,
    spacing: 0,
  },
  chicken: {
    textureKey: "world-objects-chicken",
    url: "/world/animals/chicken.png",
    tileWidth: 16,
    tileHeight: 16,
    margin: 0,
    spacing: 0,
  },
  cow: {
    textureKey: "world-objects-cow",
    url: "/world/animals/cow.png",
    tileWidth: 32,
    tileHeight: 32,
    margin: 0,
    spacing: 0,
  },
  "basic-plants": {
    textureKey: "world-objects-basic-plants",
    url: "/world/plants/basic-plants.png",
    tileWidth: 16,
    tileHeight: 32,
    margin: 0,
    spacing: 0,
  },
  chest: {
    textureKey: "world-objects-chest",
    url: "/world/furniture/chest.png",
    tileWidth: 16,
    tileHeight: 32,
    margin: 0,
    spacing: 0,
  },
} as const satisfies Record<string, WorldTilesetAsset>;

const TILESET_ALIASES: Record<string, keyof typeof WORLD_TILESET_ASSETS> = {
  grass: "grass",
  hill: "hills",
  hills: "hills",
  path: "paths",
  paths: "paths",
  water: "water",
  "tilled-dirt": "tilled-dirt",
  "tiled-dirt": "tilled-dirt",
  "farm-land": "tilled-dirt",
  farmland: "tilled-dirt",
  "house-floor": "house-floor",
  fence: "fences",
  fences: "fences",
  door: "doors",
  doors: "doors",
  chickens: "chicken",
  chicken: "chicken",
  cows: "cow",
  cow: "cow",
  plants: "basic-plants",
  "basic-plants": "basic-plants",
  chest: "chest",
  chests: "chest",
};

function normalizeTilesetName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\.png$/i, "")
    .replace(/[_\s]+/g, "-");
}

/** Retorna o asset correspondente ao nome usado no Tiled. */
export function getWorldTilesetAsset(name: string): WorldTilesetAsset | undefined {
  const normalized = normalizeTilesetName(name);
  const canonical = TILESET_ALIASES[normalized] ?? (normalized as keyof typeof WORLD_TILESET_ASSETS);
  return WORLD_TILESET_ASSETS[canonical];
}
