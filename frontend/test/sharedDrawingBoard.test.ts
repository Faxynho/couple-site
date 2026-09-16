import { describe, expect, it } from "vitest";
import {
  clampDrawingPoint,
  downsampleDrawingPoints,
  SHARED_DRAWING_MAX_POINTS_PER_STROKE,
} from "@/lib/sharedDrawingBoard";

describe("Nosso Quadro", () => {
  it("mantém coordenadas normalizadas para funcionar em qualquer tamanho de tela", () => {
    expect(clampDrawingPoint({ x: -2, y: 3 })).toEqual({ x: 0, y: 1 });
    expect(clampDrawingPoint({ x: 0.25, y: 0.75 })).toEqual({ x: 0.25, y: 0.75 });
  });

  it("reduz um traço longo sem perder o começo e o fim", () => {
    const points = Array.from({ length: 2_000 }, (_, index) => ({
      x: index / 1_999,
      y: (index % 100) / 100,
    }));
    const sampled = downsampleDrawingPoints(points);

    expect(sampled).toHaveLength(SHARED_DRAWING_MAX_POINTS_PER_STROKE);
    expect(sampled[0]).toEqual(points[0]);
    expect(sampled.at(-1)).toEqual(points.at(-1));
  });
});
