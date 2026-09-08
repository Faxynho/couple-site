import { describe, expect, it } from "vitest";
import { DIE_FACE_ORIENTATION, DIE_MIN_DRAG_DISTANCE, closestFinalOrientation, createLaunchMotion, deterministicThrow, interpolateSettlingOrientation, nearestEquivalentAngle, stepDieMotion, throwDurationMs, velocityFromRecentPoints } from "../components/boardrace/boardRaceDiePhysics";

const bounds = { width: 420, height: 620, size: 66 };

describe("física visual do dado da Trilha", () => {
  it("reconhece gesto mínimo e produz vetores para todas as direções", () => {
    expect(DIE_MIN_DRAG_DISTANCE).toBeGreaterThan(0);
    for (const [x, y] of [[120, 0], [-120, 0], [0, -120], [0, 120], [85, -85], [-85, -85], [85, 85], [-85, 85]]) {
      const motion = createLaunchMotion(x, y, x * 4, y * 4, bounds);
      if (x !== 0) expect(Math.sign(motion.vx)).toBe(Math.sign(x));
      if (y !== 0) expect(Math.sign(motion.vy)).toBe(Math.sign(y));
    }
  });

  it("distingue força recente do gesto e mantém duração entre 1,15 e 1,65 s", () => {
    const weak = velocityFromRecentPoints([{ x: 0, y: 0, time: 0 }, { x: 20, y: 0, time: 100 }]);
    const medium = velocityFromRecentPoints([{ x: 0, y: 0, time: 0 }, { x: 70, y: 0, time: 80 }]);
    const strong = velocityFromRecentPoints([{ x: 0, y: 0, time: 0 }, { x: 100, y: 0, time: 50 }]);
    expect(Math.abs(medium.vx)).toBeGreaterThan(Math.abs(weak.vx));
    expect(Math.abs(strong.vx)).toBeGreaterThan(Math.abs(weak.vx));
    expect(Math.abs(strong.vx)).toBeGreaterThan(Math.abs(medium.vx));
    const weakDuration = throwDurationMs(createLaunchMotion(20, 0, weak.vx, weak.vy, bounds));
    const mediumDuration = throwDurationMs(createLaunchMotion(70, 0, medium.vx, medium.vy, bounds));
    const strongDuration = throwDurationMs(createLaunchMotion(100, 0, strong.vx, strong.vy, bounds));
    expect(weakDuration).toBeGreaterThanOrEqual(1_150);
    expect(strongDuration).toBeLessThanOrEqual(1_650);
    expect(weakDuration).toBeLessThan(mediumDuration);
    expect(mediumDuration).toBeLessThan(strongDuration);
  });

  it("começa a física na posição final do drag, sem voltar à origem", () => {
    const motion = createLaunchMotion(80, -50, 900, -600, bounds, { x: 240, y: 410 });
    expect(motion.x).toBe(240);
    expect(motion.y).toBe(410);
  });

  it("mantém o dado dentro das quatro bordas, inclusive após várias colisões", () => {
    const throws = [[3_000, 0], [-3_000, 0], [0, 3_000], [0, -3_000], [3_000, 3_000], [-3_000, -3_000]];
    for (const [vx, vy] of throws) {
      let motion = createLaunchMotion(vx, vy, vx, vy, bounds);
      let horizontalBounces = 0;
      let verticalBounces = 0;
      for (let frame = 0; frame < 240; frame += 1) {
        const before = motion;
        motion = stepDieMotion(motion, bounds, 1 / 60);
        if (Math.sign(before.vx) !== Math.sign(motion.vx)) horizontalBounces += 1;
        if (Math.sign(before.vy) !== Math.sign(motion.vy)) verticalBounces += 1;
        expect(motion.x).toBeGreaterThanOrEqual(0);
        expect(motion.y).toBeGreaterThanOrEqual(0);
        expect(motion.x).toBeLessThanOrEqual(bounds.width - bounds.size);
        expect(motion.y).toBeLessThanOrEqual(bounds.height - bounds.size);
      }
      if (vx !== 0) expect(horizontalBounces).toBeGreaterThan(0);
      if (vy !== 0) expect(verticalBounces).toBeGreaterThan(0);
    }
  });

  it("cria a mesma trajetória remota para o mesmo serial e resultado", () => {
    expect(deterministicThrow(17, 3)).toEqual(deterministicThrow(17, 3));
    expect(deterministicThrow(17, 3)).not.toEqual(deterministicThrow(18, 3));
  });

  it("mapeia explicitamente e converge para cada face de 1 a 6", () => {
    const trajectories = [[1_137, -824, 517], [-693, 1_241, -382], [178, 271, 719]];
    for (const [rx, ry, rz] of trajectories) {
      const motion = { ...createLaunchMotion(80, -50, 900, -600, bounds), rx, ry, rz };
      for (let value = 1; value <= 6; value += 1) {
        const final = closestFinalOrientation(motion, value);
        const expected = DIE_FACE_ORIENTATION[value];
        expect(((final.x % 360) + 360) % 360).toBe(((expected.x % 360) + 360) % 360);
        expect(((final.y % 360) + 360) % 360).toBe(((expected.y % 360) + 360) % 360);
        expect(((final.z % 360) + 360) % 360).toBe(((expected.z % 360) + 360) % 360);
        expect(Math.abs(final.x - rx)).toBeLessThanOrEqual(180);
        expect(Math.abs(final.y - ry)).toBeLessThanOrEqual(180);
        expect(Math.abs(final.z - rz)).toBeLessThanOrEqual(180);
      }
    }
  });

  it("escolhe o equivalente angular mais próximo sem voltar várias voltas", () => {
    expect(nearestEquivalentAngle(710, 0)).toBe(720);
    expect(nearestEquivalentAngle(-710, 0)).toBe(-720);
    expect(Math.abs(nearestEquivalentAngle(1_137, 90) - 1_137)).toBeLessThanOrEqual(180);
  });

  it("faz settling contínuo, monotônico e já termina exatamente na face", () => {
    const from = { x: 710, y: -824, z: 517 };
    const target = { x: 720, y: -810, z: 360 };
    const spin = { x: 95, y: 120, z: -210 };
    const samples = Array.from({ length: 21 }, (_, index) => interpolateSettlingOrientation(from, target, spin, index / 20, 520));
    expect(samples[0]).toEqual(from);
    expect(samples.at(-1)).toEqual(target);
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index].x).toBeGreaterThanOrEqual(samples[index - 1].x);
      expect(samples[index].y).toBeGreaterThanOrEqual(samples[index - 1].y);
      expect(samples[index].z).toBeLessThanOrEqual(samples[index - 1].z);
    }
    const penultimate = samples.at(-2)!;
    expect(Math.abs(target.x - penultimate.x)).toBeLessThan(1);
    expect(Math.abs(target.y - penultimate.y)).toBeLessThan(1);
    expect(Math.abs(target.z - penultimate.z)).toBeLessThan(2);
  });
});
