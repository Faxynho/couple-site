import { BoardRacePowerCategory, BoardRacePowerId } from "./types";

export interface BoardRacePowerDefinition {
  id: BoardRacePowerId;
  name: string;
  emoji: string;
  category: BoardRacePowerCategory;
  description: string;
}

export const BOARD_RACE_POWERS: Record<BoardRacePowerId, BoardRacePowerDefinition> = {
  boost: {
    id: "boost",
    name: "Impulso +2",
    emoji: "🚀",
    category: "movement",
    description: "Soma 2 ao próximo movimento deste turno.",
  },
  snare: {
    id: "snare",
    name: "Armadilha -2",
    emoji: "🕸️",
    category: "attack",
    description: "Reduz em 2 o próximo movimento do adversário.",
  },
  shield: {
    id: "shield",
    name: "Escudo",
    emoji: "🛡️",
    category: "defense",
    description: "Cancela o próximo efeito negativo, exceto Quiz e Minijogo.",
  },
};

export const BOARD_RACE_POWER_IDS = Object.keys(BOARD_RACE_POWERS) as BoardRacePowerId[];
export const BOARD_RACE_MAX_POWERS = 2;

