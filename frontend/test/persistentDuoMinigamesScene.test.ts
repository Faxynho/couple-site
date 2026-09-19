import { describe, expect, it } from "vitest";
import { GAMES } from "@/lib/games";
import { MINIGAME_HOTSPOTS } from "@/components/duo/PersistentDuoMinigamesScene";

describe("layout ilustrado dos minijogos do Duo persistente", () => {
  it("mantém exatamente um hotspot para cada jogo disponível do catálogo", () => {
    const available = GAMES.filter((game) => game.available).map((game) => game.id).sort();
    const hotspots = MINIGAME_HOTSPOTS.map((hotspot) => hotspot.gameId).sort();

    expect(hotspots).toEqual(available);
    expect(new Set(hotspots).size).toBe(hotspots.length);
  });

  it("mantém todos os hotspots dentro da área percentual da imagem", () => {
    for (const hotspot of MINIGAME_HOTSPOTS) {
      expect(hotspot.left).toBeGreaterThanOrEqual(0);
      expect(hotspot.top).toBeGreaterThanOrEqual(0);
      expect(hotspot.width).toBeGreaterThan(0);
      expect(hotspot.height).toBeGreaterThan(0);
      expect(hotspot.left + hotspot.width).toBeLessThanOrEqual(100);
      expect(hotspot.top + hotspot.height).toBeLessThanOrEqual(100);
    }
  });
});
