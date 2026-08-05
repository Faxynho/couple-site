/**
 * Matemática da câmera (pan/zoom) do quadro do quebra-cabeça.
 * Sempre local ao jogador — nunca sincronizada pela rede.
 */

export interface Camera {
  zoom: number;
  panX: number;
  panY: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Zoom mínimo (para caber o quadro todo, com uma folga) e máximo (peça nunca gigante demais). */
export function computeZoomBounds(viewportW: number, viewportH: number, boardW: number, boardH: number, pieceSize: number) {
  const fitZoom = Math.min(viewportW / boardW, viewportH / boardH);
  const minZoom = clamp(fitZoom * 0.82, 0.08, 1);
  const maxZoom = clamp(420 / pieceSize, 1.6, 4);
  return { minZoom, maxZoom };
}

/** Câmera inicial: centraliza na área de montagem com uma margem de contexto ao redor. */
export function computeFitCamera(
  viewportW: number,
  viewportH: number,
  targetX: number,
  targetY: number,
  targetW: number,
  targetH: number,
  minZoom: number,
  maxZoom: number
): Camera {
  const paddingFactor = 1.45;
  const fitW = viewportW / (targetW * paddingFactor);
  const fitH = viewportH / (targetH * paddingFactor);
  const zoom = clamp(Math.min(fitW, fitH), minZoom, maxZoom);

  const centerX = targetX + targetW / 2;
  const centerY = targetY + targetH / 2;
  const panX = viewportW / 2 - centerX * zoom;
  const panY = viewportH / 2 - centerY * zoom;

  return { zoom, panX, panY };
}

/** Mantém a câmera dentro de limites razoáveis: sem zoom infinito e sem perder o quadro de vista. */
export function clampCamera(
  camera: Camera,
  viewportW: number,
  viewportH: number,
  boardW: number,
  boardH: number,
  minZoom: number,
  maxZoom: number
): Camera {
  const zoom = clamp(camera.zoom, minZoom, maxZoom);
  const slack = 220; // permite passear um pouco além da borda do quadro

  const minPanX = Math.min(viewportW - boardW * zoom - slack, slack);
  const maxPanX = Math.max(viewportW - boardW * zoom - slack, slack);
  const minPanY = Math.min(viewportH - boardH * zoom - slack, slack);
  const maxPanY = Math.max(viewportH - boardH * zoom - slack, slack);

  return {
    zoom,
    panX: clamp(camera.panX, minPanX, maxPanX),
    panY: clamp(camera.panY, minPanY, maxPanY),
  };
}

/** Aplica zoom mantendo o ponto de tela (screenX, screenY) fixo no mesmo lugar do mundo. */
export function zoomAtPoint(camera: Camera, screenX: number, screenY: number, newZoom: number): Camera {
  const worldX = (screenX - camera.panX) / camera.zoom;
  const worldY = (screenY - camera.panY) / camera.zoom;
  return {
    zoom: newZoom,
    panX: screenX - worldX * newZoom,
    panY: screenY - worldY * newZoom,
  };
}
