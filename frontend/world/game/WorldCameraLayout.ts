import { WORLD_CONFIG } from "@/world/config/worldConfig";

/**
 * Câmera responsiva do Nosso Mundo.
 *
 * A UI usa níveis 1..8. Esses números NÃO são enviados diretamente para
 * Camera.setZoom(). Em vez disso, cada nível escolhe quanto do mundo deve
 * caber verticalmente na tela e o Phaser continua usando somente zooms
 * inteiros na renderização.
 */
export const WORLD_CAMERA_LEVEL_MIN = 1;
export const WORLD_CAMERA_LEVEL_MAX = 8;

// A distância máxima é 2x a mínima. Os passos têm razão quase constante
// (~10,4%), então 1 -> 2 não dá um salto enorme e 6 -> 7 -> 8 continuam
// visualmente diferentes sem virar um super zoom inútil no celular.
const BASE_VISIBLE_WORLD_HEIGHTS = [
  480,
  435,
  394,
  357,
  323,
  293,
  265,
  240,
] as const;

// Mantém o buffer interno perto de 1080p vertical. O zoom real continua
// inteiro, mas pode ser 2x, 3x ou 4x conforme o nível. Isso evita que os
// níveis mais próximos diminuam demais a resolução interna e reduz shimmer.
const TARGET_INTERNAL_HEIGHT = 960;
const MIN_RENDER_ZOOM = 2;
const MAX_RENDER_ZOOM = 4;

export interface WorldCameraLayout {
  level: number;
  visibleWorldHeight: number;
  visibleWorldWidth: number;
  gameWidth: number;
  gameHeight: number;
  renderZoom: number;
}

export function clampWorldCameraLevel(value: number) {
  const rounded = Number.isFinite(value) ? Math.round(value) : WORLD_CAMERA_LEVEL_MIN;
  return Math.min(WORLD_CAMERA_LEVEL_MAX, Math.max(WORLD_CAMERA_LEVEL_MIN, rounded));
}

function nearestEven(value: number) {
  const safe = Math.max(2, value);
  const lower = Math.max(2, Math.floor(safe / 2) * 2);
  const upper = lower + 2;
  return Math.abs(safe - lower) <= Math.abs(upper - safe) ? lower : upper;
}

function integerRenderZoom(visibleWorldHeight: number) {
  const ideal = Math.round(TARGET_INTERNAL_HEIGHT / Math.max(1, visibleWorldHeight));
  return Math.min(MAX_RENDER_ZOOM, Math.max(MIN_RENDER_ZOOM, ideal));
}

/**
 * Calcula a resolução virtual para um nível de distância.
 *
 * A faixa inteira encolhe proporcionalmente apenas em telas extremamente
 * largas, para o exterior continuar cobrindo a largura e não aparecer vazio
 * nas laterais. Em 16:9 e no S20 FE em paisagem a tabela base é preservada.
 */
export function getWorldCameraLayout(level: number, viewportWidth: number, viewportHeight: number): WorldCameraLayout {
  const safeLevel = clampWorldCameraLevel(level);
  const safeViewportWidth = Math.max(1, Number(viewportWidth) || 1);
  const safeViewportHeight = Math.max(1, Number(viewportHeight) || 1);
  const aspect = safeViewportWidth / safeViewportHeight;

  const referenceWidth = WORLD_CONFIG.scenes.exterior.width * WORLD_CONFIG.tileSize;
  const referenceHeight = WORLD_CONFIG.scenes.exterior.height * WORLD_CONFIG.tileSize;
  const baseFarHeight = BASE_VISIBLE_WORLD_HEIGHTS[0];

  // Altura máxima que ainda mantém o mapa de referência cobrindo a viewport.
  const coverHeightLimit = Math.min(referenceHeight, referenceWidth / aspect);
  const responsiveScale = Math.min(1, coverHeightLimit / baseFarHeight);
  const requestedVisibleHeight = BASE_VISIBLE_WORLD_HEIGHTS[safeLevel - 1] * responsiveScale;
  const renderZoom = integerRenderZoom(requestedVisibleHeight);

  // Sempre par: evita o flicker conhecido do Phaser em canvases com dimensão
  // ímpar. Mantemos também a proporção o mais próxima possível da viewport.
  const gameHeight = nearestEven(requestedVisibleHeight * renderZoom);
  const gameWidth = nearestEven(gameHeight * aspect);
  const visibleWorldHeight = gameHeight / renderZoom;
  const visibleWorldWidth = gameWidth / renderZoom;

  return {
    level: safeLevel,
    visibleWorldHeight,
    visibleWorldWidth,
    gameWidth,
    gameHeight,
    renderZoom,
  };
}
