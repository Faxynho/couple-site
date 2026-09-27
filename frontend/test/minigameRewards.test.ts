import { describe, expect, it } from "vitest";
import { minigameGlobalReward } from "@/lib/minigameRewards";

describe("prévia de recompensa dos minigames", () => {
  it("acompanha dificuldade, variante e duração", () => {
    expect(minigameGlobalReward("colors", "easy")).toBe(8);
    expect(minigameGlobalReward("colors", "hard")).toBe(13);
    expect(minigameGlobalReward("termo", "quarteto")).toBe(20);
    expect(minigameGlobalReward("memory", "hard")).toBe(19);
    expect(minigameGlobalReward("sudoku", "hard")).toBe(28);
    expect(minigameGlobalReward("puzzle", "hard")).toBe(30);
    expect(minigameGlobalReward("drawguess", "8")).toBe(28);
    expect(minigameGlobalReward("casino", "long")).toBe(34);
    expect(minigameGlobalReward("boardrace", "geral")).toBe(18);
    expect(minigameGlobalReward("rpg", "geral")).toBe(24);
  });
});
