import { describe, expect, it } from "vitest";
import { getDecorationDefinition } from "@/world/config/decorationCatalog";
import { decorationPlacementRects, decorationRectsOverlap } from "@/world/config/decorationGeometry";
import { resolveNineSliceFrame } from "@/world/game/Autotile";

describe("geometria física das decorações", () => {
  it("permite sofás encostados quando as colisões Tiled não se sobrepõem", () => {
    const couch = getDecorationDefinition("couch");
    expect(couch?.kind).toBe("object");
    if (!couch || couch.kind !== "object") return;

    const first = decorationPlacementRects(couch, 5, 5, 0, couch.collisions);
    const beside = decorationPlacementRects(couch, 7, 5, 0, couch.collisions);
    const overlapping = decorationPlacementRects(couch, 6, 5, 0, couch.collisions);
    expect(first.some((a) => beside.some((b) => decorationRectsOverlap(a, b)))).toBe(false);
    expect(first.some((a) => overlapping.some((b) => decorationRectsOverlap(a, b)))).toBe(true);
  });

  it("usa somente o tronco da árvore e não o sprite inteiro", () => {
    const tree = getDecorationDefinition("tree");
    expect(tree?.kind).toBe("object");
    if (!tree || tree.kind !== "object") return;
    const [trunk] = decorationPlacementRects(tree, 10, 10, 0, tree.collisions);
    expect(trunk.width).toBeLessThan(16);
    expect(trunk.width).toBeLessThan(tree.source.displayWidth / 4);
  });

  it("objetos sem collision object reservam só a célula de apoio", () => {
    const bush = getDecorationDefinition("bush");
    expect(bush?.kind).toBe("object");
    if (!bush || bush.kind !== "object") return;
    expect(decorationPlacementRects(bush, 3, 4, 0, bush.collisions)).toEqual([
      { x: 64, y: 80, width: 16, height: 16 },
    ]);
  });
});

describe("autotile determinístico", () => {
  const frames = {
    northWest: 123, north: 124, northEast: 125,
    west: 139, center: 140, east: 141,
    southWest: 155, south: 156, southEast: 157,
  };

  const offsets = [
    { bit: 1, dx: 0, dy: -1 }, { bit: 2, dx: 1, dy: -1 },
    { bit: 4, dx: 1, dy: 0 }, { bit: 8, dx: 1, dy: 1 },
    { bit: 16, dx: 0, dy: 1 }, { bit: 32, dx: -1, dy: 1 },
    { bit: 64, dx: -1, dy: 0 }, { bit: 128, dx: -1, dy: -1 },
  ];
  const resolveShape = (points: Array<[number, number]>) => {
    const cells = new Set(points.map(([x, y]) => `${x}:${y}`));
    return points.map(([x, y]) => {
      const mask = offsets.reduce((value, neighbor) => cells.has(`${x + neighbor.dx}:${y + neighbor.dy}`) ? value | neighbor.bit : value, 0);
      return resolveNineSliceFrame(mask, frames);
    });
  };

  it("resolve corretamente todas as posições de um bloco 3x3", () => {
    expect([28, 124, 112, 31, 255, 241, 7, 199, 193].map((mask) => resolveNineSliceFrame(mask, frames)))
      .toEqual([123, 124, 125, 139, 140, 141, 155, 156, 157]);
  });

  it("mantém célula isolada e linhas estreitas seamless sem escolher frame aleatório", () => {
    expect(resolveNineSliceFrame(0, frames)).toBe(140);
    expect(resolveNineSliceFrame(4, frames)).toBe(140);
    expect(resolveNineSliceFrame(64 | 4, frames)).toBe(140);
  });

  it("abre bordas internas ao remover a célula central", () => {
    expect(resolveNineSliceFrame(1 | 4 | 64, frames)).toBe(156);
    expect(resolveNineSliceFrame(1 | 16 | 64, frames)).toBe(141);
    expect(resolveNineSliceFrame(4 | 16 | 64, frames)).toBe(124);
    expect(resolveNineSliceFrame(1 | 4 | 16, frames)).toBe(139);
  });

  it("permanece determinístico nas formas isolada, linhas, retângulos, L, T, cruz e buraco", () => {
    const rectangle = (width: number, height: number) => Array.from({ length: width * height }, (_, index) => [index % width, Math.floor(index / width)] as [number, number]);
    const shapes: Array<Array<[number, number]>> = [
      [[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]],
      rectangle(5, 1), rectangle(1, 5), rectangle(2, 2), rectangle(3, 3), rectangle(5, 3),
      [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
      [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
      [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
      [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [1, 2], [2, 2]],
    ];
    const validFrames = new Set(Object.values(frames));
    for (const shape of shapes) {
      const result = resolveShape(shape);
      expect(result).toEqual(resolveShape(shape));
      expect(result.every((frame) => validFrames.has(frame))).toBe(true);
    }
    expect(resolveShape(rectangle(5, 3))).toEqual([
      123, 124, 124, 124, 125,
      139, 140, 140, 140, 141,
      155, 156, 156, 156, 157,
    ]);
  });
});

describe("catálogo auditado dos TMJ", () => {
  it("expõe todas as variações decorativas confirmadas nas object layers", () => {
    const catalog = [
      "plant-white", "plant", "plant-red", "plant-groundcover", "plant-red-pot", "plant-bush", "plant-sprout", "plant-purple", "plant-yellow",
      "tree-large", "tree", "tree-round", "tree-small", "tree-leafy",
      "rock-large", "rock-round", "rock", "rock-flat", "rock-mossy", "rock-small", "rock-pair", "rock-cluster", "rock-pointed", "rock-light", "rock-tiny", "rock-tiny-pair",
      "bush", "bush-light", "bush-wide", "bush-pink", "bush-yellow", "bush-dark",
      "crate", "chest", "barrel", "small-chest", "chair-side", "chair-right", "chair-front", "chair",
      "couch-horizontal", "couch", "couch-front", "couch-right", "shelf-wide", "shelf", "shelf-small",
      "house-plant-tall", "house-plant-small", "house-plant-leafy", "house-plant", "house-plant-round",
    ];
    for (const id of catalog) expect(getDecorationDefinition(id), id).toBeDefined();
  });

  it("mantém todas as variantes reais da cerca ligadas às máscaras N/E/S/W", () => {
    const fence = getDecorationDefinition("fence");
    expect(fence?.kind).toBe("connected-object");
    if (!fence || fence.kind !== "connected-object") return;
    expect(fence.variants).toMatchObject({ 0: 12, 1: 8, 2: 13, 3: 9, 4: 0, 5: 4, 7: 5, 8: 15, 10: 14, 13: 7, 14: 2, 15: 6 });
    for (let mask = 0; mask < 16; mask++) expect(fence.variantCollisions[fence.variants[mask]]).toBeDefined();
  });
});
