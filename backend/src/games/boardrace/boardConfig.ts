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
  { index: 3, type: "advance", label: "Avançar" },
  { index: 4, type: "normal", label: "Normal" },
  { index: 5, type: "quiz", label: "Quiz" },
  { index: 6, type: "surprise", label: "Surpresa" },
  { index: 7, type: "normal", label: "Normal" },
  { index: 8, type: "retreat", label: "Recuar" },
  { index: 9, type: "minigame", label: "Minijogo" },
  { index: 10, type: "normal", label: "Normal" },
  { index: 11, type: "prison", label: "Prisão" },
  { index: 12, type: "treasure", label: "Tesouro" },
  { index: 13, type: "quiz", label: "Quiz" },
  { index: 14, type: "normal", label: "Normal" },
  { index: 15, type: "advance", label: "Avançar" },
  { index: 16, type: "minigame", label: "Minijogo" },
  { index: 17, type: "surprise", label: "Surpresa" },
  { index: 18, type: "normal", label: "Normal" },
  { index: 19, type: "retreat", label: "Recuar" },
  { index: 20, type: "prison", label: "Prisão" },
  { index: 21, type: "normal", label: "Normal" },
  { index: 22, type: "treasure", label: "Tesouro" },
  { index: 23, type: "surprise", label: "Surpresa" },
  { index: 24, type: "quiz", label: "Quiz" },
  { index: 25, type: "advance", label: "Avançar" },
  { index: 26, type: "normal", label: "Normal" },
  { index: 27, type: "minigame", label: "Minijogo" },
  { index: 28, type: "retreat", label: "Recuar" },
  { index: 29, type: "normal", label: "Normal" },
  { index: 30, type: "finish", label: "Chegada" },
];

export function cloneBoardRaceSpaces(): BoardSpace[] {
  return BOARD_RACE_SPACES.map((space) => ({ ...space }));
}
