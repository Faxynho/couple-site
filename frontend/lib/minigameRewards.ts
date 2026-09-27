import { GameId } from "./types";

const REWARDS: Record<GameId, Record<string, number>> = {
  colors: { easy: 8, hard: 13 },
  termo: { one: 8, dueto: 13, quarteto: 20 },
  memory: { easy: 8, medium: 13, hard: 19 },
  airhockey: { easy: 10, medium: 16, hard: 23 },
  quiz: { easy: 10, medium: 16, hard: 23 },
  whoami: { easy: 10, medium: 15, hard: 21 },
  sudoku: { easy: 12, medium: 19, hard: 28 },
  crossword: { easy: 12, medium: 19, hard: 28 },
  wordsearch: { easy: 10, medium: 16, hard: 23 },
  puzzle: { easy: 12, medium: 20, hard: 30 },
  chess: { easy: 12, medium: 20, hard: 30 },
  boardrace: { geral: 18 },
  drawguess: { "4": 16, "6": 22, "8": 28 },
  casino: { quick: 16, normal: 24, long: 34 },
  rpg: { geral: 24 },
};

export function minigameGlobalReward(gameId: GameId, rank: string): number {
  const table = REWARDS[gameId];
  return table[rank] ?? table.medium ?? table.normal ?? table.geral ?? Object.values(table)[0] ?? 0;
}
