export type DrawGuessShape = "line" | "rectangle" | "ellipse" | "triangle";
export type DrawGuessTool = "brush" | "eraser" | "fill" | DrawGuessShape;
export interface DrawGuessPoint { x: number; y: number }

export type DrawGuessCanvasAction =
  | { id: string; kind: "stroke"; tool: "brush" | "eraser"; color: string; size: number; points: DrawGuessPoint[] }
  | { id: string; kind: "shape"; shape: DrawGuessShape; color: string; size: number; start: DrawGuessPoint; end: DrawGuessPoint }
  | { id: string; kind: "fill"; color: string; point: DrawGuessPoint }
  | { id: string; kind: "clear" };

export interface DrawGuessAttempt {
  id: string;
  playerId: string;
  text: string;
  normalized: string;
  createdAt: number;
  correct: boolean;
}

export interface DrawGuessPlayerStats {
  score: number;
  correctGuesses: number;
  totalGuessTimeMs: number;
  bestGuessTimeMs: number | null;
}

export interface DrawGuessRoundResult {
  round: number;
  word: string;
  reason: "correct" | "timeUp";
  guesserId: string;
  drawerId: string;
  guesserPoints: number;
  drawerPoints: number;
  remainingMs: number;
  guessTimeMs: number | null;
  correctAttemptId: string | null;
}

export interface DrawGuessState {
  mode: "duo";
  expectedPlayers: string[];
  configuredRounds: number;
  totalRounds: number;
  currentRound: number;
  tiebreakPairs: number;
  phase: "playing" | "roundResult" | "finished";
  drawerId: string;
  guesserId: string;
  word: string | null;
  maskedWord: string;
  roundStartedAt: number;
  roundDeadlineAt: number;
  pausedAt: number | null;
  autoAdvanceAt: number | null;
  startedAt: number;
  finishedAt: number | null;
  winnerId: string | null;
  scores: Record<string, number>;
  playerStats: Record<string, DrawGuessPlayerStats>;
  attempts: DrawGuessAttempt[];
  canvasActions: DrawGuessCanvasAction[];
  canvasRevision: number;
  lastRoundResult: DrawGuessRoundResult | null;
  canUndo: boolean;
  canRedo: boolean;
  serverNow: number;
}

export interface DrawGuessPreview {
  strokeId: string;
  sequence: number;
  tool: "brush" | "eraser";
  color: string;
  size: number;
  points: DrawGuessPoint[];
}

export const DRAW_GUESS_ROUNDS = {
  "4": { label: "Rápida", emoji: "⚡", hint: "4 rodadas" },
  "6": { label: "Clássica", emoji: "🎨", hint: "6 rodadas" },
  "8": { label: "Longa", emoji: "✨", hint: "8 rodadas" },
} as const;

export const DRAW_GUESS_COLORS = [
  { value: "#111827", label: "Preto" },
  { value: "#ffffff", label: "Branco" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#22c55e", label: "Verde" },
  { value: "#facc15", label: "Amarelo" },
  { value: "#f97316", label: "Laranja" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#92400e", label: "Marrom" },
] as const;

export const DRAW_GUESS_LOGICAL_WIDTH = 960;
export const DRAW_GUESS_LOGICAL_HEIGHT = 600;
export const DRAW_GUESS_MAX_POINTS = 320;

export function clampDrawGuessPoint(point: DrawGuessPoint): DrawGuessPoint {
  return { x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)) };
}

export function downsampleDrawGuessPoints(points: DrawGuessPoint[], limit = DRAW_GUESS_MAX_POINTS): DrawGuessPoint[] {
  if (points.length <= limit) return points.map(clampDrawGuessPoint);
  const result: DrawGuessPoint[] = [];
  const last = points.length - 1;
  for (let index = 0; index < limit; index += 1) {
    result.push(clampDrawGuessPoint(points[Math.round((index * last) / (limit - 1))]));
  }
  return result;
}

export function hexToRgba(hex: string): [number, number, number, number] {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#111827";
  return [Number.parseInt(safe.slice(1, 3), 16), Number.parseInt(safe.slice(3, 5), 16), Number.parseInt(safe.slice(5, 7), 16), 255];
}

/** Flood fill iterativo sobre a malha canônica de 960x600. Como todos os
 * clientes reproduzem a mesma sequência nessa resolução, o resultado é
 * determinístico mesmo quando o canvas é exibido em tamanhos diferentes. */
export function floodFillPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fill: [number, number, number, number],
  maxPixels = width * height
): { changed: boolean; visited: number } {
  const x = Math.max(0, Math.min(width - 1, Math.floor(startX)));
  const y = Math.max(0, Math.min(height - 1, Math.floor(startY)));
  const start = (y * width + x) * 4;
  const target: [number, number, number, number] = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  if (target.every((value, index) => value === fill[index])) return { changed: false, visited: 0 };

  const queue = new Int32Array(Math.min(width * height, maxPixels));
  let read = 0;
  let write = 0;
  const paint = (pixel: number) => {
    const offset = pixel * 4;
    if (data[offset] !== target[0] || data[offset + 1] !== target[1] || data[offset + 2] !== target[2] || data[offset + 3] !== target[3]) return;
    data[offset] = fill[0]; data[offset + 1] = fill[1]; data[offset + 2] = fill[2]; data[offset + 3] = fill[3];
    if (write < queue.length) queue[write++] = pixel;
  };
  paint(y * width + x);
  while (read < write && read < maxPixels) {
    const pixel = queue[read++];
    const px = pixel % width;
    const py = Math.floor(pixel / width);
    if (px > 0) paint(pixel - 1);
    if (px + 1 < width) paint(pixel + 1);
    if (py > 0) paint(pixel - width);
    if (py + 1 < height) paint(pixel + width);
  }
  return { changed: write > 0, visited: read };
}

export function averageDrawGuessTime(stats: DrawGuessPlayerStats | undefined): number | null {
  if (!stats || stats.correctGuesses === 0) return null;
  return stats.totalGuessTimeMs / stats.correctGuesses;
}

export function formatDrawGuessTime(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
}
