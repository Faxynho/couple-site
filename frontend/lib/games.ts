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
    image: "/images/puzzle-card.png",
    available: true,
  },
  {
    id: "sudoku",
    name: "Sudoku",
    description: "Clássico 9x9, sozinho ou a dois — cada jogada aparece na hora para o outro.",
    emoji: "🔢",
    image: "/images/sudoku-card.png",
    available: true,
  },
  {
    id: "colors",
    name: "Memória de Cores",
    description: "Memorizem a cor, recriem de olho na memória e comparem o resultado — sozinho ou a dois.",
    emoji: "🎨",
    image: "/images/colors-card.png",
    available: true,
  },
  {
    id: "memory",
    name: "Jogo da Memória",
    description: "Encontrem os pares de ícones antes do tempo acabar — sozinho, juntos ou em duelo.",
    emoji: "🃏",
    image: "/images/memory-card.png",
    available: true,
  },
  {
    id: "crossword",
    name: "Palavras Cruzadas",
    description: "Preencham a grade com as dicas — juntos numa só cópia ou em duelo pra ver quem termina primeiro.",
    emoji: "📝",
    image: "/images/crossword-card.png",
    available: true,
  },
  {
    id: "wordsearch",
    name: "Caça-Palavras",
    description: "Encontrem as palavras escondidas na grade em todas as direções — em equipe ou em duelo.",
    emoji: "🔍",
    image: "/images/wordsearch-card.png",
    available: true,
  },
  {
    id: "quiz",
    name: "Quiz",
    description: "Perguntas de conhecimentos gerais com tempo — sozinho, em equipe ou em duelo pontuado.",
    emoji: "❓",
    image: "/images/quiz-card.png",
    available: true,
  },
  {
    id: "rpg",
    name: "Mini RPG: Duelo",
    description: "Sorteie sua classe e batalhe com cartas aleatórias — 1x1, ou em dupla contra o BOT.",
    emoji: "🗡️",
    image: "/images/rpg-card.png",
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
