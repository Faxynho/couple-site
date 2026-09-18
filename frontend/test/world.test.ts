import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ACTION_SHEET_LAYOUT, CHARACTER_CONFIGS } from "@/world/config/characterConfig";
import { DECORATION_CATALOG, validateDecorationCatalog } from "@/world/config/decorationCatalog";
import { getWorldTilesetAsset } from "@/world/config/tilesetConfig";
import { WORLD_CONFIG } from "@/world/config/worldConfig";
import { WORLD_AMBIENCE_TRACK, WORLD_MUSIC_TRACKS } from "@/world/audio/worldMusic";

describe("Nosso Mundo", () => {
  it("mapeia o spritesheet real de seis por seis sem duplicar configuração", () => {
    expect(CHARACTER_CONFIGS.andre.sheets.walk.frameWidth).toBe(32);
    expect(CHARACTER_CONFIGS.flavia.sheets.walk.frameHeight).toBe(32);
    expect(CHARACTER_CONFIGS.andre.animations.idle.directions.down?.frames).toEqual([0, 1, 2, 3, 4, 5]);
    expect(CHARACTER_CONFIGS.andre.animations.idle.directions.up?.frames).toEqual([12, 13, 14, 15, 16, 17]);
    expect(CHARACTER_CONFIGS.andre.animations.walk.directions.right?.frames).toEqual([24, 25, 26, 27, 28, 29]);
    expect(CHARACTER_CONFIGS.andre.animations.walk.directions.left?.flipX).toBe(true);
  });

  it("documenta a grade real de actions.png e mantém as ações desativadas", () => {
    expect(ACTION_SHEET_LAYOUT.columns).toBe(2);
    expect(ACTION_SHEET_LAYOUT.rows).toBe(18);
    expect(ACTION_SHEET_LAYOUT.groups.watering.rows).toEqual([9, 10, 11]);
  });

  it("centraliza câmera, rede, escala e footprints de decoração", () => {
    expect(WORLD_CONFIG.id).toBe("andre-flavia-world-v1");
    expect(WORLD_CONFIG.networkHz).toBe(12);
    expect(WORLD_CONFIG.camera.zoom).toBe(2);
    expect(DECORATION_CATALOG.table.footprint).toEqual({ width: 3, height: 2 });
    expect(DECORATION_CATALOG.water.terrainLayer).toBe("Ground");
    expect(DECORATION_CATALOG.dirt.terrainLayer).toBe("GroundDetails");
    expect(DECORATION_CATALOG.fence.source.tileset).toBe("fences");
    expect(DECORATION_CATALOG.fence.variants[15]).toBe(6);
    expect(DECORATION_CATALOG.fence.variantCollisions[6]).toHaveLength(2);
    expect(validateDecorationCatalog()).toEqual([]);
  });

  it("mantém a playlist e ambience apontando para arquivos reais", () => {
    expect(WORLD_MUSIC_TRACKS.map((track) => track.id)).toEqual([
      "ocarina-title-theme",
      "lake-hylia",
      "ocarina-of-time",
      "midnas-lament",
      "zeldas-lullaby-rain",
    ]);
    expect(new Set(WORLD_MUSIC_TRACKS.map((track) => track.url)).size).toBe(WORLD_MUSIC_TRACKS.length);
    for (const track of WORLD_MUSIC_TRACKS) {
      expect(existsSync(resolve(process.cwd(), `public${track.url}`)), track.url).toBe(true);
    }
    expect(existsSync(resolve(process.cwd(), `public${WORLD_AMBIENCE_TRACK.url}`))).toBe(true);
  });

  it("falha cedo e com mensagem clara quando o catálogo é inválido", () => {
    const invalid = {
      ...DECORATION_CATALOG,
      table: { ...DECORATION_CATALOG.table, id: "id-diferente" },
    };
    expect(() => validateDecorationCatalog(invalid)).toThrow("Catálogo de decoração inválido");
  });

  it("audita os TMJ reais, suas layers, imagens e fontes do catálogo", () => {
    const expectedLayers = ["Ground", "GroundDetails", "GroundDetailsTop", "Objects", "reference", "AbovePlayer", "Collisions", "Interactions"];
    const mapFiles = {
      exterior: "public/world/maps/main-world.tmj",
      "house-interior": "public/world/maps/house-interior.tmj",
    } as const;

    for (const [scene, relativeFile] of Object.entries(mapFiles)) {
      const file = resolve(process.cwd(), relativeFile);
      const map = JSON.parse(readFileSync(file, "utf8")) as {
        tilewidth: number;
        tileheight: number;
        layers: Array<{ name: string; type: string }>;
        tilesets: Array<{ name: string; image: string; tilecount: number; wangsets?: unknown[]; terrains?: unknown[] }>;
      };
      expect([map.tilewidth, map.tileheight]).toEqual([16, 16]);
      expect(map.layers.map((layer) => layer.name)).toEqual(expectedLayers);
      for (const tileset of map.tilesets) {
        if (tileset.name !== "reference") expect(getWorldTilesetAsset(tileset.name), `${scene}: tileset ${tileset.name}`).toBeDefined();
        expect(existsSync(resolve(dirname(file), tileset.image)), `${scene}: imagem ${tileset.image}`).toBe(true);
        expect((tileset.wangsets?.length ?? 0) + (tileset.terrains?.length ?? 0)).toBe(0);
      }
      const byName = new Map(map.tilesets.map((tileset) => [tileset.name, tileset]));
      for (const item of Object.values(DECORATION_CATALOG)) {
        if (!item.scenes.includes(scene as never) || item.kind === "restore-terrain") continue;
        const tileset = byName.get(item.source.tileset);
        expect(tileset, `${scene}: fonte ${item.id}/${item.source.tileset}`).toBeDefined();
        expect(item.source.frame).toBeLessThan(tileset!.tilecount);
      }
    }
  });
});
