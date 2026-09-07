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
  { x: 17.2, y: 18.2, rotation: -3 },
  { x: 27.1, y: 19.2, rotation: 3 },
  { x: 35.5, y: 18.2, rotation: -2 },
  { x: 44, y: 17, rotation: 1 },
  { x: 52.3, y: 16.5, rotation: 0 },
  { x: 60.5, y: 17, rotation: 2 },
  { x: 68.5, y: 18.3, rotation: 5 },
  { x: 75.8, y: 21.4, rotation: 17 },
  { x: 80.3, y: 27.1, rotation: 70 },
  { x: 78.2, y: 33.2, rotation: -18 },
  { x: 70.7, y: 36.8, rotation: -5 },
  { x: 62.5, y: 38.6, rotation: 1 },
  { x: 54.3, y: 39.3, rotation: 1 },
  { x: 46.1, y: 39.5, rotation: -1 },
  { x: 37.8, y: 38.8, rotation: -3 },
  { x: 29.7, y: 37.2, rotation: -7 },
  { x: 22.1, y: 34.6, rotation: -18 },
  { x: 14.8, y: 39.1, rotation: 58 },
  { x: 14.5, y: 47.7, rotation: 40 },
  { x: 20.1, y: 54.3, rotation: 12 },
  { x: 28.2, y: 57.3, rotation: 4 },
  { x: 36.4, y: 58.7, rotation: 1 },
  { x: 44.6, y: 59.4, rotation: 0 },
  { x: 52.8, y: 59.6, rotation: 0 },
  { x: 61, y: 59.3, rotation: -1 },
  { x: 69.1, y: 58.3, rotation: -5 },
  { x: 77.1, y: 60.7, rotation: 17 },
  { x: 81.7, y: 67.2, rotation: 61 },
  { x: 79.7, y: 75.2, rotation: -26 },
  { x: 70.2, y: 82.1, rotation: -6 },
  { x: 52.4, y: 86.6, rotation: 0 },
];

export const BOARD_RACE_PORTRAIT_LAYOUT: BoardRaceLayoutPoint[] = [
  { x: 16.5, y: 21.7, rotation: -6 },
  { x: 30.2, y: 21.1, rotation: -3 },
  { x: 43.8, y: 20.5, rotation: -1 },
  { x: 57.3, y: 20.8, rotation: 1 },
  { x: 70.7, y: 21.5, rotation: 3 },
  { x: 83.2, y: 24, rotation: 13 },
  { x: 90.3, y: 29.5, rotation: 74 },
  { x: 83.8, y: 33.2, rotation: -12 },
  { x: 70.4, y: 33.4, rotation: -3 },
  { x: 57, y: 33.2, rotation: 0 },
  { x: 43.6, y: 33.6, rotation: 1 },
  { x: 30.3, y: 35, rotation: 6 },
  { x: 16.5, y: 38.6, rotation: 35 },
  { x: 17.7, y: 45.1, rotation: 19 },
  { x: 31.2, y: 44.1, rotation: 2 },
  { x: 44.7, y: 43.2, rotation: 0 },
  { x: 58.2, y: 43.2, rotation: 0 },
  { x: 71.7, y: 44.2, rotation: 4 },
  { x: 84.8, y: 47.7, rotation: 20 },
  { x: 90.1, y: 53.6, rotation: 73 },
  { x: 81.8, y: 57.8, rotation: -13 },
  { x: 68.4, y: 58.4, rotation: -3 },
  { x: 55, y: 58.4, rotation: 0 },
  { x: 41.6, y: 58.7, rotation: 2 },
  { x: 28.2, y: 60.3, rotation: 9 },
  { x: 14.9, y: 64.6, rotation: 45 },
  { x: 17.4, y: 70.2, rotation: 25 },
  { x: 31.2, y: 71.2, rotation: 4 },
  { x: 45.2, y: 72.1, rotation: 1 },
  { x: 59.2, y: 73.2, rotation: 8 },
  { x: 76.2, y: 84.8, rotation: 0 },
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
