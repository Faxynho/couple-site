export type SharedDrawingTool = "brush" | "eraser";

export interface SharedDrawingPoint {
  x: number;
  y: number;
}

export interface SharedDrawingStroke {
  id: string;
  tool: SharedDrawingTool;
  color: string;
  size: number;
  points: SharedDrawingPoint[];
}

export interface SharedDrawingBoardSnapshot {
  revision: number;
  strokes: SharedDrawingStroke[];
  canUndo: boolean;
  canRedo: boolean;
  updatedAt: number;
}

export const SHARED_DRAWING_COLORS = [
  { value: "#111827", label: "Preto" },
  { value: "#ffffff", label: "Branco" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#22c55e", label: "Verde" },
  { value: "#facc15", label: "Amarelo" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#8b5cf6", label: "Roxo" },
] as const;

export const SHARED_DRAWING_SIZES = [
  { value: 0.006, label: "Pequeno" },
  { value: 0.014, label: "Médio" },
  { value: 0.026, label: "Grande" },
] as const;

export const SHARED_DRAWING_MAX_POINTS_PER_STROKE = 500;

export function clampDrawingPoint(point: SharedDrawingPoint): SharedDrawingPoint {
  return {
    x: Math.max(0, Math.min(1, point.x)),
    y: Math.max(0, Math.min(1, point.y)),
  };
}

/** Mantém o caminho inteiro e reduz só a densidade enviada ao servidor. */
export function downsampleDrawingPoints(
  points: SharedDrawingPoint[],
  limit = SHARED_DRAWING_MAX_POINTS_PER_STROKE
): SharedDrawingPoint[] {
  if (points.length <= limit) return points.map(clampDrawingPoint);
  const sampled: SharedDrawingPoint[] = [];
  const lastIndex = points.length - 1;
  for (let index = 0; index < limit; index += 1) {
    sampled.push(clampDrawingPoint(points[Math.round((index * lastIndex) / (limit - 1))]));
  }
  return sampled;
}
