export interface NineSliceFrames {
  northWest: number;
  north: number;
  northEast: number;
  west: number;
  center: number;
  east: number;
  southWest: number;
  south: number;
  southEast: number;
}

// Bits da máscara de oito vizinhos usada pelo WorldScene.
const NORTH = 1;
const EAST = 4;
const SOUTH = 16;
const WEST = 64;

/**
 * Resolve somente combinações representáveis pelo bloco 3x3 real do tileset.
 * Linhas de uma célula usam o centro seamless; áreas 2x2+ recebem bordas e
 * cantos determinísticos, sem a antiga heurística de "máscara mais parecida".
 */
export function resolveNineSliceFrame(mask: number, frames: NineSliceFrames) {
  const north = Boolean(mask & NORTH);
  const east = Boolean(mask & EAST);
  const south = Boolean(mask & SOUTH);
  const west = Boolean(mask & WEST);

  if (east && south && !north && !west) return frames.northWest;
  if (west && south && !north && !east) return frames.northEast;
  if (east && north && !south && !west) return frames.southWest;
  if (west && north && !south && !east) return frames.southEast;
  if (east && west && south && !north) return frames.north;
  if (east && west && north && !south) return frames.south;
  if (north && south && east && !west) return frames.west;
  if (north && south && west && !east) return frames.east;
  return frames.center;
}
