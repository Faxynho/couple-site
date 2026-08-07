import { GameEngine, GameId } from "../types";
import { PuzzleGame } from "./puzzle/PuzzleGame";
import { SudokuGame } from "./sudoku/SudokuGame";

/**
 * Ponto único de registro dos jogos disponíveis na plataforma.
 * Para adicionar um novo jogo cooperativo:
 *   1. Crie a pasta games/<novo-jogo>/ com uma classe que implemente GameEngine.
 *   2. Registre a instância aqui.
 *   3. Adicione o id em `types/index.ts` (GameId) e um card no frontend.
 */
export const GameRegistry: Record<GameId, GameEngine<unknown, unknown>> = {
  puzzle: new PuzzleGame() as unknown as GameEngine<unknown, unknown>,
  sudoku: new SudokuGame() as unknown as GameEngine<unknown, unknown>,
};

export function getGameEngine(gameId: GameId): GameEngine<unknown, unknown> {
  const engine = GameRegistry[gameId];
  if (!engine) throw new Error(`Jogo não registrado: ${gameId}`);
  return engine;
}
