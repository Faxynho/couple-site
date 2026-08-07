import { GameDefinition } from "./types";

/**
 * Catálogo de jogos exibidos na tela inicial.
 * Para lançar um novo jogo: adicione um item aqui (com available: true)
 * e crie a rota correspondente em app/game/<id>/[code]/page.tsx.
 */
export const GAMES: GameDefinition[] = [
  {
    id: "puzzle",
    name: "Quebra-cabeça Cooperativo",
    description: "Montem juntos, peça por peça, em tempo real — não importa a distância.",
    emoji: "🧩",
    image: "/images/puzzle/nuquidito.jpg",
    available: true,
  },
  {
    id: "sudoku",
    name: "Sudoku",
    description: "Clássico 9x9, sozinho ou a dois — cada jogada aparece na hora para o outro.",
    emoji: "🔢",
    image: "/images/sudoku-card.svg",
    available: true,
  },
];

/**
 * Dificuldades disponíveis — precisa espelhar `backend/src/games/puzzle/puzzleImages.ts`.
 * Só os rótulos/emoji importam aqui; a geração real (linhas, colunas, tamanho
 * da peça) acontece inteiramente no servidor a partir de `targetPieces`.
 */
export const DIFFICULTIES = {
  easy: { label: "Fácil", emoji: "🟢", targetPieces: 30 },
  medium: { label: "Médio", emoji: "🟡", targetPieces: 70 },
  hard: { label: "Difícil", emoji: "🔴", targetPieces: 150 },
} as const;

export type Difficulty = keyof typeof DIFFICULTIES;
