const test = require("node:test");
const assert = require("node:assert/strict");

const { canPlaceDecoration, clampWorldPosition, WORLD_SCENE_RULES } = require("../dist/world/worldConfig.js");
const { WORLD_ID } = require("../dist/world/types.js");

test("Nosso Mundo usa um id lógico estável e cenas com limites conhecidos", () => {
  assert.equal(WORLD_ID, "andre-flavia-world-v1");
  assert.equal(WORLD_SCENE_RULES.exterior.width, 1024);
  assert.equal(WORLD_SCENE_RULES["house-interior"].height, 288);
  assert.deepEqual(clampWorldPosition("exterior", -100, 9000), { x: 12, y: 632 });
});

test("decoração rejeita lago, bordas e sobreposição simultânea", () => {
  const existing = [{ id: "chair-1", type: "chair", scene: "exterior", gridX: 20, gridY: 20, placedBy: "andre", updatedAt: 1 }];
  assert.equal(canPlaceDecoration("exterior", "chair", 20, 20, existing), false);
  assert.equal(canPlaceDecoration("exterior", "chair", 44, 8, existing), false);
  assert.equal(canPlaceDecoration("exterior", "table", 60, 36, existing), false);
  assert.equal(canPlaceDecoration("exterior", "plant", 22, 20, existing), true);
});

test("mover ignora somente o próprio id e detecta outro objeto removido/ocupado", () => {
  const existing = [
    { id: "a", type: "chair", scene: "house-interior", gridX: 5, gridY: 7, placedBy: "andre", updatedAt: 1 },
    { id: "b", type: "chest", scene: "house-interior", gridX: 8, gridY: 7, placedBy: "flavia", updatedAt: 1 },
  ];
  assert.equal(canPlaceDecoration("house-interior", "chair", 6, 7, existing, "a"), true);
  assert.equal(canPlaceDecoration("house-interior", "chair", 8, 7, existing, "a"), false);
});
