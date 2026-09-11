import { WorldDecorationType, WorldSceneId } from "@/world/types";

export const WORLD_CONFIG = {
  id: "andre-flavia-world-v1",
  tileSize: 16,
  networkHz: 12,
  camera: { zoom: 2, lerpX: 0.12, lerpY: 0.12, deadzoneWidth: 48, deadzoneHeight: 32 },
  debugKey: "F3",
  mobile: { joystickRadius: 48, joystickDeadzone: 0.18 },
  audio: { defaultMusicVolume: 0.45, defaultSfxVolume: 0.65 },
  scenes: {
    exterior: { mapKey: "world-map-exterior", mapUrl: "/world/maps/main-world.tmj", width: 64, height: 40 },
    "house-interior": { mapKey: "world-map-house", mapUrl: "/world/maps/house-interior.tmj", width: 24, height: 18 },
  } satisfies Record<WorldSceneId, { mapKey: string; mapUrl: string; width: number; height: number }>,
} as const;

export interface WorldVisualAsset {
  texture: string;
  url: string;
  crop: { x: number; y: number; width: number; height: number };
  scale: number;
  scaleX?: number;
  originX: number;
  originY: number;
  collision?: { width: number; height: number; offsetX: number; offsetY: number };
}

export const WORLD_OBJECT_ASSETS: Record<string, WorldVisualAsset> = {
  "tree-green": { texture: "nature-atlas", url: "/world/nature/grass-biome.png", crop: { x: 16, y: 0, width: 32, height: 32 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 18, height: 10, offsetX: -9, offsetY: -10 } },
  "tree-pink": { texture: "nature-atlas", url: "/world/nature/grass-biome.png", crop: { x: 48, y: 0, width: 32, height: 32 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 18, height: 10, offsetX: -9, offsetY: -10 } },
  "flower-pink": { texture: "nature-atlas", url: "/world/nature/grass-biome.png", crop: { x: 96, y: 48, width: 16, height: 16 }, scale: 2, originX: 0.5, originY: 1 },
  "flower-purple": { texture: "nature-atlas", url: "/world/nature/grass-biome.png", crop: { x: 112, y: 48, width: 16, height: 16 }, scale: 2, originX: 0.5, originY: 1 },
  rock: { texture: "nature-atlas", url: "/world/nature/grass-biome.png", crop: { x: 128, y: 16, width: 16, height: 16 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 22, height: 10, offsetX: -11, offsetY: -10 } },
  bush: { texture: "nature-atlas", url: "/world/nature/grass-biome.png", crop: { x: 16, y: 48, width: 16, height: 16 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 20, height: 8, offsetX: -10, offsetY: -8 } },
  house: { texture: "house-atlas", url: "/world/buildings/wooden-house.png", crop: { x: 64, y: 0, width: 48, height: 80 }, scale: 2, scaleX: 4, originX: 0.5, originY: 1 },
  "house-window": { texture: "house-atlas", url: "/world/buildings/wooden-house.png", crop: { x: 16, y: 0, width: 16, height: 16 }, scale: 2, originX: 0.5, originY: 1 },
  "house-door": { texture: "house-atlas", url: "/world/buildings/wooden-house.png", crop: { x: 48, y: 16, width: 16, height: 16 }, scale: 2, originX: 0.5, originY: 1 },
  bridge: { texture: "bridge-atlas", url: "/world/buildings/wood-bridge.png", crop: { x: 0, y: 0, width: 32, height: 48 }, scale: 2, originX: 0.5, originY: 0.5 },
  chicken: { texture: "chicken-atlas", url: "/world/animals/chicken.png", crop: { x: 0, y: 0, width: 16, height: 16 }, scale: 2, originX: 0.5, originY: 1 },
  cow: { texture: "cow-atlas", url: "/world/animals/cow.png", crop: { x: 0, y: 0, width: 32, height: 32 }, scale: 2, originX: 0.5, originY: 1 },
  bed: { texture: "furniture-atlas", url: "/world/furniture/basic-furniture.png", crop: { x: 0, y: 16, width: 16, height: 32 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 26, height: 16, offsetX: -13, offsetY: -16 } },
  rug: { texture: "furniture-atlas", url: "/world/furniture/basic-furniture.png", crop: { x: 0, y: 80, width: 48, height: 16 }, scale: 2, originX: 0.5, originY: 0.5 },
  "chair-fixed": { texture: "furniture-atlas", url: "/world/furniture/basic-furniture.png", crop: { x: 64, y: 32, width: 16, height: 32 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 18, height: 10, offsetX: -9, offsetY: -10 } },
  "table-fixed": { texture: "furniture-atlas", url: "/world/furniture/basic-furniture.png", crop: { x: 48, y: 16, width: 32, height: 32 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 50, height: 20, offsetX: -25, offsetY: -20 } },
  "plant-fixed": { texture: "plants-atlas", url: "/world/plants/basic-plants.png", crop: { x: 48, y: 0, width: 16, height: 32 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 16, height: 8, offsetX: -8, offsetY: -8 } },
  "chest-fixed": { texture: "chest-atlas", url: "/world/furniture/chest.png", crop: { x: 16, y: 0, width: 16, height: 32 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 22, height: 10, offsetX: -11, offsetY: -10 } },
  "fence-fixed": { texture: "fence-atlas", url: "/world/buildings/fences.png", crop: { x: 0, y: 0, width: 16, height: 16 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 28, height: 8, offsetX: -14, offsetY: -8 } },
};

export const DECORATION_ASSETS: Record<WorldDecorationType, WorldVisualAsset & { label: string; footprint: { width: number; height: number } }> = {
  chair: { label: "Cadeira", texture: "furniture-atlas", url: "/world/furniture/basic-furniture.png", crop: { x: 64, y: 32, width: 16, height: 32 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 18, height: 10, offsetX: -9, offsetY: -10 }, footprint: { width: 1, height: 1 } },
  table: { label: "Mesa", texture: "furniture-atlas", url: "/world/furniture/basic-furniture.png", crop: { x: 48, y: 16, width: 32, height: 32 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 50, height: 20, offsetX: -25, offsetY: -20 }, footprint: { width: 2, height: 2 } },
  plant: { label: "Planta", texture: "plants-atlas", url: "/world/plants/basic-plants.png", crop: { x: 48, y: 0, width: 16, height: 32 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 16, height: 8, offsetX: -8, offsetY: -8 }, footprint: { width: 1, height: 1 } },
  chest: { label: "Baú", texture: "chest-atlas", url: "/world/furniture/chest.png", crop: { x: 16, y: 0, width: 16, height: 32 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 22, height: 10, offsetX: -11, offsetY: -10 }, footprint: { width: 1, height: 1 } },
  fence: { label: "Cerca", texture: "fence-atlas", url: "/world/buildings/fences.png", crop: { x: 0, y: 0, width: 16, height: 16 }, scale: 2, originX: 0.5, originY: 1, collision: { width: 28, height: 8, offsetX: -14, offsetY: -8 }, footprint: { width: 1, height: 1 } },
};
