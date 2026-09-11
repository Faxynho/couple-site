import { describe, expect, it } from "vitest";
import { ACTION_SHEET_LAYOUT, CHARACTER_CONFIGS } from "@/world/config/characterConfig";
import { DECORATION_ASSETS, WORLD_CONFIG } from "@/world/config/worldConfig";

describe("Nosso Mundo", () => {
  it("mapeia o spritesheet real de seis por seis sem duplicar configuração", () => {
    expect(CHARACTER_CONFIGS.andre.frameWidth).toBe(32);
    expect(CHARACTER_CONFIGS.flavia.frameHeight).toBe(32);
    expect(CHARACTER_CONFIGS.andre.animations.down.frames).toEqual([0, 1, 2, 3, 4, 5]);
    expect(CHARACTER_CONFIGS.andre.animations.up.frames).toEqual([12, 13, 14, 15, 16, 17]);
    expect(CHARACTER_CONFIGS.andre.animations.right.frames).toEqual([24, 25, 26, 27, 28, 29]);
    expect(CHARACTER_CONFIGS.andre.animations.left.flipX).toBe(true);
  });

  it("documenta a grade real de actions.png e mantém as ações desativadas", () => {
    expect(ACTION_SHEET_LAYOUT.columns).toBe(3);
    expect(ACTION_SHEET_LAYOUT.rows).toBe(18);
    expect(ACTION_SHEET_LAYOUT.groups.wateringCan.rows).toEqual([12, 13, 14, 15, 16, 17]);
  });

  it("centraliza câmera, rede, escala e footprints de decoração", () => {
    expect(WORLD_CONFIG.id).toBe("andre-flavia-world-v1");
    expect(WORLD_CONFIG.networkHz).toBe(12);
    expect(WORLD_CONFIG.camera.zoom).toBe(2);
    expect(DECORATION_ASSETS.table.footprint).toEqual({ width: 2, height: 2 });
  });
});
