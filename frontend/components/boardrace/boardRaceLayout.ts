export interface BoardRaceLayoutPoint {
  x: number;
  y: number;
  rotation: number;
}

/**
 * Coordenadas normalizadas do percurso. A configuração das casas continua
 * vindo do servidor; este mapa define somente a composição visual e pode ser
 * trocado junto com a arte sem tocar nas regras da corrida.
 */
export const BOARD_RACE_LAYOUT: BoardRaceLayoutPoint[] = [
  { x: 15, y: 18, rotation: -4 },
  { x: 25, y: 19, rotation: 3 },
  { x: 34, y: 18, rotation: -2 },
  { x: 43, y: 17, rotation: 1 },
  { x: 52, y: 17, rotation: 0 },
  { x: 61, y: 18, rotation: 2 },
  { x: 70, y: 19, rotation: 5 },
  { x: 77, y: 23, rotation: 18 },
  { x: 80, y: 30, rotation: 70 },
  { x: 76, y: 35, rotation: -12 },
  { x: 68, y: 38, rotation: -3 },
  { x: 59, y: 39, rotation: 2 },
  { x: 50, y: 39, rotation: 0 },
  { x: 41, y: 38, rotation: -2 },
  { x: 32, y: 37, rotation: 2 },
  { x: 23, y: 37, rotation: -4 },
  { x: 15, y: 41, rotation: -18 },
  { x: 12, y: 49, rotation: 78 },
  { x: 15, y: 55, rotation: 18 },
  { x: 23, y: 58, rotation: 4 },
  { x: 32, y: 59, rotation: -1 },
  { x: 41, y: 59, rotation: 1 },
  { x: 50, y: 59, rotation: 0 },
  { x: 59, y: 59, rotation: -1 },
  { x: 68, y: 58, rotation: -4 },
  { x: 77, y: 60, rotation: 17 },
  { x: 82, y: 68, rotation: 72 },
  { x: 81, y: 77, rotation: -18 },
  { x: 72, y: 84, rotation: -4 },
  { x: 62, y: 86, rotation: 0 },
  { x: 52, y: 87, rotation: 0 },
];

export const BOARD_RACE_PORTRAIT_LAYOUT: BoardRaceLayoutPoint[] = [
  { x: 15, y: 22, rotation: -5 },
  { x: 28, y: 21, rotation: -2 },
  { x: 41, y: 20, rotation: 0 },
  { x: 54, y: 20, rotation: 1 },
  { x: 67, y: 20, rotation: 2 },
  { x: 80, y: 21, rotation: 6 },
  { x: 89, y: 25, rotation: 68 },
  { x: 87, y: 30, rotation: -8 },
  { x: 74, y: 31, rotation: 1 },
  { x: 61, y: 31, rotation: 0 },
  { x: 48, y: 31, rotation: 0 },
  { x: 35, y: 31, rotation: -1 },
  { x: 22, y: 32, rotation: -6 },
  { x: 11, y: 37, rotation: 72 },
  { x: 17, y: 41, rotation: 8 },
  { x: 30, y: 41, rotation: 1 },
  { x: 43, y: 41, rotation: 0 },
  { x: 56, y: 41, rotation: 0 },
  { x: 69, y: 41, rotation: -1 },
  { x: 82, y: 43, rotation: 15 },
  { x: 90, y: 49, rotation: 72 },
  { x: 84, y: 55, rotation: -13 },
  { x: 71, y: 57, rotation: 0 },
  { x: 58, y: 57, rotation: 0 },
  { x: 45, y: 56, rotation: 0 },
  { x: 32, y: 56, rotation: -2 },
  { x: 19, y: 58, rotation: -12 },
  { x: 10, y: 64, rotation: 70 },
  { x: 24, y: 68, rotation: 8 },
  { x: 47, y: 69, rotation: 0 },
  { x: 70, y: 70, rotation: 4 },
];

export function getBoardRaceLayoutPoint(index: number, totalSpaces: number, portrait = false): BoardRaceLayoutPoint {
  const layout = portrait ? BOARD_RACE_PORTRAIT_LAYOUT : BOARD_RACE_LAYOUT;
  if (totalSpaces <= 1) return layout[0];
  const position = (index / (totalSpaces - 1)) * (layout.length - 1);
  const before = Math.floor(position);
  const after = Math.min(layout.length - 1, Math.ceil(position));
  const mix = position - before;
  const start = layout[before];
  const end = layout[after];
  return {
    x: start.x + (end.x - start.x) * mix,
    y: start.y + (end.y - start.y) * mix,
    rotation: start.rotation + (end.rotation - start.rotation) * mix,
  };
}
