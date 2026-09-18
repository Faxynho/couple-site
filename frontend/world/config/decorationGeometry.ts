import { ConnectedCatalogItem, ObjectCatalogItem } from "./decorationCatalog";
import { getWorldTilesetAsset } from "./tilesetConfig";

export interface DecorationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type PlaceableDefinition = ObjectCatalogItem | ConnectedCatalogItem;

/**
 * Converte os collision objects locais do Tiled para o mesmo espaço em pixels
 * usado pelo sprite no mundo. Placement e Arcade Physics usam esta função para
 * não divergirem por causa de origin, escala ou rotação.
 */
export function decorationCollisionRects(
  definition: PlaceableDefinition,
  gridX: number,
  gridY: number,
  rotation: number,
  collisions: readonly DecorationRect[],
): DecorationRect[] {
  const asset = getWorldTilesetAsset(definition.source.tileset);
  if (!asset) return [];

  const centerX = (gridX + definition.footprint.width / 2) * 16 + (definition.source.offsetX ?? 0);
  const bottomY = (gridY + definition.footprint.height) * 16 + (definition.source.offsetY ?? 0);
  const left = centerX - definition.source.displayWidth / 2;
  const top = bottomY - definition.source.displayHeight;
  const scaleX = definition.source.displayWidth / asset.tileWidth;
  const scaleY = definition.source.displayHeight / asset.tileHeight;
  const angle = rotation * Math.PI / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return collisions.flatMap((shape) => {
    if (shape.width <= 0 || shape.height <= 0) return [];
    const width = shape.width * scaleX;
    const height = shape.height * scaleY;
    const localX = left + shape.x * scaleX + width / 2 - centerX;
    const localY = top + shape.y * scaleY + height / 2 - bottomY;
    const rotatedX = localX * cosine - localY * sine;
    const rotatedY = localX * sine + localY * cosine;
    const rotatedWidth = Math.abs(width * cosine) + Math.abs(height * sine);
    const rotatedHeight = Math.abs(width * sine) + Math.abs(height * cosine);
    return [{
      x: centerX + rotatedX - rotatedWidth / 2,
      y: bottomY + rotatedY - rotatedHeight / 2,
      width: rotatedWidth,
      height: rotatedHeight,
    }];
  });
}

export function decorationPlacementRects(
  definition: PlaceableDefinition,
  gridX: number,
  gridY: number,
  rotation: number,
  collisions: readonly DecorationRect[],
): DecorationRect[] {
  if (definition.placement === "collision") {
    return decorationCollisionRects(definition, gridX, gridY, rotation, collisions);
  }

  // Objetos sem collision object no TMJ reservam somente a célula de apoio.
  // O sprite inteiro não vira uma margem invisível.
  return [{
    x: (gridX + definition.footprint.width / 2 - 0.5) * 16,
    y: (gridY + definition.footprint.height - 1) * 16,
    width: 16,
    height: 16,
  }];
}

export function decorationRectsOverlap(a: DecorationRect, b: DecorationRect) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}
