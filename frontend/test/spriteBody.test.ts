import { describe, expect, it } from "vitest";
import { awakeFitFor, bodyOfAlpha } from "@/lib/spriteBody";

function canvas(size: number, draw: (set: (x: number, y: number) => void) => void) {
  const alpha = new Uint8Array(size * size);
  draw((x, y) => { alpha[y * size + x] = 255; });
  return alpha;
}
const rect = (set: (x: number, y: number) => void, x0: number, y0: number, x1: number, y1: number) => { for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) set(x, y); };

describe("medição do corpo do sprite", () => {
  it("ignora brilhos soltos longe do corpo", () => {
    const alpha = canvas(100, (set) => { rect(set, 30, 30, 70, 90, ); set(2, 2); set(97, 4); rect(set, 90, 90, 92, 92); });
    const body = bodyOfAlpha(alpha, 100)!;
    expect(body.w).toBeCloseTo(.4, 2);
    expect(body.h).toBeCloseTo(.6, 2);
    expect(body.cx).toBeCloseTo(.5, 2);
    expect(body.cy).toBeCloseTo(.6, 2);
  });

  it("devolve null para imagem vazia", () => {
    expect(bodyOfAlpha(new Uint8Array(100 * 100), 100)).toBeNull();
  });

  it("o ajuste faz o corpo despertado ocupar o mesmo espaço e o mesmo centro do normal", () => {
    const normal = { w: .4, h: .6, cx: .5, cy: .6, area: .24 };
    const awake = { w: .8, h: 1, cx: .55, cy: .5, area: .8 };
    const fit = awakeFitFor(normal, awake);
    const scale = Number(/scale\(([\d.]+)\)/.exec(fit.transform)![1]);
    const [tx, ty] = /translate\((-?[\d.]+)%, (-?[\d.]+)%\)/.exec(fit.transform)!.slice(1).map((value) => Number(value) / 100);
    expect(scale ** 2 * awake.area).toBeCloseTo(normal.area, 2);
    expect(.5 + scale * (awake.cx - .5) + tx).toBeCloseTo(normal.cx, 2);
    expect(.5 + scale * (awake.cy - .5) + ty).toBeCloseTo(normal.cy, 2);
    expect(fit.centerX).toBeCloseTo(50, 5);
  });
});
