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
    image: "/images/puzzle/fravia.jpg",
    available: true,
  },
];

export const PUZZLE_IMAGES = [
  { id: "aurora", label: "Aurora", file: "/images/puzzle/aurora.jpg" },
  { id: "jardim", label: "Jardim", file: "/images/puzzle/jardim.jpg" },
  { id: "oceano", label: "Oceano", file: "/images/puzzle/oceano.jpg" },
  { id: "por-do-sol", label: "Pôr do sol", file: "/images/puzzle/por-do-sol.jpg" },
  { id: "fravia", label: "Fravia", file: "/images/puzzle/fravia.jpg" },
] as const;
