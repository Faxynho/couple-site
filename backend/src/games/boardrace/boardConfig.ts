import { BoardSpace } from "./types";

/**
 * Configuração declarativa do percurso. O motor nunca depende de índices
 * especiais fixos: aumentar, reduzir ou trocar tipos exige mudar apenas esta
 * lista (mantendo início e chegada nas extremidades).
 */
export const BOARD_RACE_SPACES: readonly BoardSpace[] = [
  { index: 0, type: "start", label: "Início" },
  { index: 1, type: "normal", label: "Normal" },
  { index: 2, type: "treasure", label: "Tesouro" },
  { index: 3, type: "normal", label: "Normal" },
  { index: 4, type: "advance", label: "Avançar" },
  { index: 5, type: "normal", label: "Normal" },
  { index: 6, type: "quiz", label: "Quiz" },
  { index: 7, type: "normal", label: "Normal" },
  { index: 8, type: "retreat", label: "Recuar" },
  { index: 9, type: "normal", label: "Normal" },
  { index: 10, type: "surprise", label: "Surpresa" },
  { index: 11, type: "normal", label: "Normal" },
  { index: 12, type: "prison", label: "Prisão" },
  { index: 13, type: "normal", label: "Normal" },
  { index: 14, type: "minigame", label: "Minijogo" },
  { index: 15, type: "normal", label: "Normal" },
  { index: 16, type: "treasure", label: "Tesouro" },
  { index: 17, type: "normal", label: "Normal" },
  { index: 18, type: "advance", label: "Avançar" },
  { index: 19, type: "normal", label: "Normal" },
  { index: 20, type: "quiz", label: "Quiz" },
  { index: 21, type: "normal", label: "Normal" },
  { index: 22, type: "surprise", label: "Surpresa" },
  { index: 23, type: "normal", label: "Normal" },
  { index: 24, type: "retreat", label: "Recuar" },
  { index: 25, type: "minigame", label: "Minijogo" },
  { index: 26, type: "normal", label: "Normal" },
  { index: 27, type: "prison", label: "Prisão" },
  { index: 28, type: "treasure", label: "Tesouro" },
  { index: 29, type: "normal", label: "Normal" },
  { index: 30, type: "finish", label: "Chegada" },
];

export function cloneBoardRaceSpaces(): BoardSpace[] {
  return BOARD_RACE_SPACES.map((space) => ({ ...space }));
}

