import { describe, expect, it } from "vitest";
import {
  DRAW_GUESS_MAX_POINTS,
  clampDrawGuessPoint,
  downsampleDrawGuessPoints,
  floodFillPixels,
  hexToRgba,
} from "@/lib/drawGuessTypes";

describe("canvas do Desenhe & Adivinhe", () => {
  it("mantém coordenadas normalizadas e limita um traço grande", () => {
    expect(clampDrawGuessPoint({ x: -1, y: 2 })).toEqual({ x: 0, y: 1 });
    const points = Array.from({ length: 2_000 }, (_, index) => ({ x: index / 1_999, y: (index % 10) / 10 }));
    const sampled = downsampleDrawGuessPoints(points);
    expect(sampled).toHaveLength(DRAW_GUESS_MAX_POINTS);
    expect(sampled[0]).toEqual(points[0]);
    expect(sampled.at(-1)).toEqual(points.at(-1));
  });

  it("flood fill respeita uma área fechada e é determinístico", () => {
    const width = 5;
    const height = 5;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      pixels[pixel * 4] = 255;
      pixels[pixel * 4 + 1] = 255;
      pixels[pixel * 4 + 2] = 255;
      pixels[pixel * 4 + 3] = 255;
    }
    const setBlack = (x: number, y: number) => {
      const offset = (y * width + x) * 4;
      pixels[offset] = 0; pixels[offset + 1] = 0; pixels[offset + 2] = 0;
    };
    for (let x = 1; x <= 3; x += 1) { setBlack(x, 1); setBlack(x, 3); }
    setBlack(1, 2); setBlack(3, 2);

    const result = floodFillPixels(pixels, width, height, 2, 2, hexToRgba("#ef4444"));
    expect(result.changed).toBe(true);
    expect(result.visited).toBe(1);
    const center = (2 * width + 2) * 4;
    expect([...pixels.slice(center, center + 4)]).toEqual([239, 68, 68, 255]);
    const outside = 0;
    expect([...pixels.slice(outside, outside + 4)]).toEqual([255, 255, 255, 255]);
  });

  it("não refaz flood fill quando a cor já é a mesma", () => {
    const data = new Uint8ClampedArray([34, 197, 94, 255]);
    expect(floodFillPixels(data, 1, 1, 0, 0, hexToRgba("#22c55e"))).toEqual({ changed: false, visited: 0 });
  });
});
