const test = require("node:test");
const assert = require("node:assert/strict");

const { canPaintTerrain, canPlaceDecoration, clampWorldPosition, WORLD_SCENE_RULES } = require("../dist/world/worldConfig.js");
const { isValidItemRotation } = require("../dist/world/decorationCatalog.js");
const { sanitizeDecoration, sanitizeTerrain } = require("../dist/world/WorldStore.js");
const { WORLD_ID } = require("../dist/world/types.js");

test("Nosso Mundo usa um id lógico estável e cenas com limites conhecidos", () => {
  assert.equal(WORLD_ID, "andre-flavia-world-v1");
  assert.equal(WORLD_SCENE_RULES.exterior.width, 1280);
  assert.equal(WORLD_SCENE_RULES["house-interior"].height, 288);
  assert.deepEqual(clampWorldPosition("exterior", -100, 9000), { x: 12, y: 792 });
});

test("decoração rejeita lago, bordas e sobreposição simultânea", () => {
  const existing = [{ id: "plant-1", itemId: "plant", scene: "exterior", gridX: 20, gridY: 20, rotation: 0, placedBy: "andre", updatedAt: 1 }];
  assert.equal(canPlaceDecoration("exterior", "plant", 20, 20, existing), false);
  assert.equal(canPlaceDecoration("exterior", "plant", 44, 8, existing), false);
  assert.equal(canPlaceDecoration("exterior", "table", 60, 36, existing), false);
  assert.equal(canPlaceDecoration("exterior", "plant", 22, 20, existing), true);
  assert.equal(canPaintTerrain("exterior", "water", 20, 20, existing), false);
  assert.equal(canPaintTerrain("exterior", "water", 22, 20, existing), true);
  assert.equal(canPlaceDecoration("exterior", "fence", 21, 22, existing), true);
  assert.equal(canPlaceDecoration("exterior", "fence", 22, 22, existing), false);
  assert.equal(isValidItemRotation("chair-side", 180), true);
  assert.equal(isValidItemRotation("table", 180), false);
});

test("mover ignora somente o próprio id e detecta outro objeto removido/ocupado", () => {
  const existing = [
    { id: "a", itemId: "chair", scene: "house-interior", gridX: 5, gridY: 7, rotation: 0, placedBy: "andre", updatedAt: 1 },
    { id: "b", itemId: "chest", scene: "house-interior", gridX: 8, gridY: 7, rotation: 0, placedBy: "flavia", updatedAt: 1 },
  ];
  assert.equal(canPlaceDecoration("house-interior", "chair", 6, 7, existing, "a"), true);
  assert.equal(canPlaceDecoration("house-interior", "chair", 8, 7, existing, "a"), false);
});

test("save legado migra type para itemId e terreno inválido não entra", () => {
  assert.deepEqual(sanitizeDecoration({ id: "old-chair", type: "chair", scene: "exterior", gridX: 8, gridY: 9, placedBy: "andre", updatedAt: 10 }), {
    id: "old-chair", itemId: "chair", scene: "exterior", gridX: 8, gridY: 9, rotation: 0, placedBy: "andre", updatedAt: 10,
  });
  assert.equal(sanitizeTerrain({ scene: "house-interior", gridX: 8, gridY: 9, terrainId: "water", placedBy: "andre", updatedAt: 10 }), null);
  const futureItem = sanitizeDecoration({ id: "future-1", itemId: "future-lamp", scene: "exterior", gridX: 8, gridY: 9, placedBy: "andre", updatedAt: 10, futureData: { color: "blue" } }, true);
  assert.deepEqual(futureItem.futureData, { color: "blue" });
});
