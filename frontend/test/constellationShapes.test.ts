import { describe, expect, it } from "vitest";
import { CONSTELLATION_SHAPES, constellationShape, linkLevel } from "@/components/idle/kittydev/constellationShapes";

describe("desenhos de constelação", () => {
  it("existem 24 desenhos, cada um com 5 estrelas e nome diferente", () => {
    expect(CONSTELLATION_SHAPES).toHaveLength(24);
    expect(new Set(CONSTELLATION_SHAPES.map((shape) => shape.name)).size).toBe(24);
    for (const shape of CONSTELLATION_SHAPES) expect(shape.nodes).toHaveLength(5);
  });

  it("nenhum personagem repete o desenho (conjunto de linhas e posições diferentes)", () => {
    const signatures = CONSTELLATION_SHAPES.map((shape) => JSON.stringify({ nodes: shape.nodes, links: shape.links }));
    expect(new Set(signatures).size).toBe(24);
    const topology = CONSTELLATION_SHAPES.map((shape) => {
      const diag = Math.max(...shape.nodes.flatMap((a) => shape.nodes.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1]))));
      return `${shape.links.length}|${shape.links.map(([a, b]) => (Math.hypot(shape.nodes[a - 1][0] - shape.nodes[b - 1][0], shape.nodes[a - 1][1] - shape.nodes[b - 1][1]) / diag).toFixed(2)).sort().join(",")}`;
    });
    expect(new Set(topology).size).toBe(24);
  });

  it("estrelas ficam dentro do quadro, afastadas e todas ligadas a alguma linha", () => {
    for (const shape of CONSTELLATION_SHAPES) {
      for (const [x, y] of shape.nodes) { expect(x).toBeGreaterThanOrEqual(4); expect(x).toBeLessThanOrEqual(96); expect(y).toBeGreaterThanOrEqual(4); expect(y).toBeLessThanOrEqual(96); }
      for (let a = 0; a < 5; a += 1) for (let b = a + 1; b < 5; b += 1) expect(Math.hypot(shape.nodes[a][0] - shape.nodes[b][0], shape.nodes[a][1] - shape.nodes[b][1])).toBeGreaterThan(14);
      const used = new Set(shape.links.flat());
      expect(used.size).toBeGreaterThanOrEqual(4); // a Letra A pode deixar uma estrela decorativa na perna
      for (const link of shape.links) expect(linkLevel(link)).toBeGreaterThanOrEqual(2);
    }
  });

  it("a constelação do personagem i é a i-ésima e o índice dá a volta", () => {
    expect(constellationShape(0)).toBe(CONSTELLATION_SHAPES[0]);
    expect(constellationShape(23)).toBe(CONSTELLATION_SHAPES[23]);
    expect(constellationShape(24)).toBe(CONSTELLATION_SHAPES[0]);
  });
});
