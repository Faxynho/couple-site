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
  swap: {
    id: "swap",
    name: "Troca de Lugar",
    emoji: "🔄",
    category: "attack",
    description: "Troca sua posição com a do adversário, sem ativar as casas.",
  },
  magnet: {
    id: "magnet",
    name: "Ímã",
    emoji: "🧲",
    category: "attack",
    description: "Puxa o adversário 2 casas para trás. O Escudo bloqueia.",
  },
};

export const BOARD_RACE_POWER_IDS = Object.keys(BOARD_RACE_POWERS) as BoardRacePowerId[];
export const BOARD_RACE_MAX_POWERS = 2;
