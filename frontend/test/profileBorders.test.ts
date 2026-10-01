import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getBorderFrameGeometry, getProfileBorder, PROFILE_BORDERS, type ProfileBorderDefinition } from "@/lib/profileBorders";
import { getPlayerLevel, levelProgress, PLACEHOLDER_LEVEL } from "@/lib/profileLevel";

const FRONTEND_DIR = process.cwd();

/** Lê `{ "id": preço }` do catálogo do servidor sem importar código do backend. */
function readBackendPrices(): Record<string, number> {
  const source = readFileSync(join(FRONTEND_DIR, "..", "backend", "src", "accounts", "profileBorders.ts"), "utf-8");
  const block = source.match(/PROFILE_BORDER_PRICES[^=]*=\s*\{([\s\S]*?)\};/);
  if (!block) throw new Error("Não achei PROFILE_BORDER_PRICES no backend.");
  const prices: Record<string, number> = {};
  for (const [, id, price] of block[1].matchAll(/"([a-z0-9-]+)":\s*(\d+)/g)) prices[id] = Number(price);
  return prices;
}

describe("catálogo de bordas de perfil", () => {
  it("tem ids únicos e dados completos em cada borda", () => {
    const ids = PROFILE_BORDERS.map((border) => border.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const border of PROFILE_BORDERS) {
      expect(border.id).toMatch(/^[a-z0-9-]+$/);
      expect(border.name.trim().length).toBeGreaterThan(0);
      expect(border.description.trim().length).toBeGreaterThan(0);
      expect(border.image.startsWith("/borders/")).toBe(true);
      expect(border.holeRatio).toBeGreaterThanOrEqual(0.2);
      expect(border.holeRatio).toBeLessThanOrEqual(1);
    }
  });

  it("cada borda aponta para uma imagem que existe em public/", () => {
    for (const border of PROFILE_BORDERS) {
      expect(existsSync(join(FRONTEND_DIR, "public", border.image)), `${border.image} não existe`).toBe(true);
    }
  });

  it("as imagens SVG fornecidas são quadradas (viewBox 256x256)", () => {
    for (const border of PROFILE_BORDERS.filter((b) => b.image.endsWith(".svg"))) {
      const svg = readFileSync(join(FRONTEND_DIR, "public", border.image), "utf-8");
      expect(svg).toContain('viewBox="0 0 256 256"');
    }
  });

  it("fica idêntico ao catálogo de preços do servidor (mesmos ids, nem a mais nem a menos)", () => {
    const backend = readBackendPrices();
    expect(Object.keys(backend).sort()).toEqual(PROFILE_BORDERS.map((border) => border.id).sort());
    for (const price of Object.values(backend)) {
      expect(Number.isInteger(price) && price > 0).toBe(true);
    }
  });

  it("começa com 5 bordas de preços diferentes, da mais barata para a mais cara", () => {
    const backend = readBackendPrices();
    const ordered = PROFILE_BORDERS.map((border) => backend[border.id]);
    expect(ordered).toHaveLength(5);
    expect(new Set(ordered).size).toBe(5);
    expect([...ordered].sort((a, b) => a - b)).toEqual(ordered);
  });

  it("getProfileBorder devolve null para sem borda, ids desconhecidos e chaves perigosas", () => {
    expect(getProfileBorder(null)).toBeNull();
    expect(getProfileBorder(undefined)).toBeNull();
    expect(getProfileBorder("")).toBeNull();
    expect(getProfileBorder("nao-existe")).toBeNull();
    expect(getProfileBorder("__proto__")).toBeNull();
    expect(getProfileBorder("constructor")).toBeNull();
    expect(getProfileBorder("coroa-real")?.name).toBe("Coroa Real");
  });
});

describe("geometria da moldura", () => {
  const base: ProfileBorderDefinition = { id: "x", name: "X", description: "x", image: "/borders/x.png", holeRatio: 0.5 };

  it("centraliza a moldura no avatar e a escala pelo tamanho do buraco", () => {
    // buraco = metade da imagem → imagem com o dobro do avatar, recuada meio avatar para cada lado
    expect(getBorderFrameGeometry(base)).toEqual({ scale: 2, left: -0.5, top: -0.5 });
    const ring = getBorderFrameGeometry({ ...base, holeRatio: 0.72 });
    expect(ring.scale).toBeCloseTo(1.3889, 3);
    expect(ring.left).toBeCloseTo(-0.1944, 3);
    expect(ring.top).toBeCloseTo(ring.left, 6);
  });

  it("offsetX/offsetY deslocam a moldura em fração do avatar (+ = direita/baixo)", () => {
    const moved = getBorderFrameGeometry({ ...base, offsetX: 0.1, offsetY: -0.25 });
    expect(moved.left).toBeCloseTo(-0.4, 6);
    expect(moved.top).toBeCloseTo(-0.75, 6);
    expect(moved.scale).toBe(2);
  });

  it("holeRatio 1 deixa a moldura do tamanho exato do avatar", () => {
    expect(getBorderFrameGeometry({ ...base, holeRatio: 1 })).toEqual({ scale: 1, left: 0, top: 0 });
  });

  it("limita valores absurdos de holeRatio em vez de gerar molduras gigantes ou invertidas", () => {
    expect(getBorderFrameGeometry({ ...base, holeRatio: 0 }).scale).toBe(5);
    expect(getBorderFrameGeometry({ ...base, holeRatio: -3 }).scale).toBe(5);
    expect(getBorderFrameGeometry({ ...base, holeRatio: 7 }).scale).toBe(1);
    expect(getBorderFrameGeometry({ ...base, holeRatio: Number.NaN }).scale).toBe(1);
  });
});

describe("nível do perfil (placeholder até existir o sistema de nível)", () => {
  it("devolve o placeholder para qualquer conta", () => {
    expect(getPlayerLevel("andre")).toEqual(PLACEHOLDER_LEVEL);
    expect(getPlayerLevel("flavia")).toEqual(PLACEHOLDER_LEVEL);
  });

  it("calcula o progresso da barra com segurança", () => {
    expect(levelProgress({ level: 8, xp: 650, xpToNext: 1000 })).toBeCloseTo(0.65, 6);
    expect(levelProgress({ level: 1, xp: 0, xpToNext: 100 })).toBe(0);
    expect(levelProgress({ level: 1, xp: 500, xpToNext: 100 })).toBe(1);
    expect(levelProgress({ level: 1, xp: -5, xpToNext: 100 })).toBe(0);
    expect(levelProgress({ level: 1, xp: 5, xpToNext: 0 })).toBe(0);
    expect(levelProgress({ level: 1, xp: Number.NaN, xpToNext: 100 })).toBe(0);
  });
});
