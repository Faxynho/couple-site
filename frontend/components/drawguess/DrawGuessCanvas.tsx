"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Eraser, Minus, PaintBucket, Paintbrush, Redo2, Square, Trash2, Triangle, Undo2 } from "lucide-react";
import {
  DRAW_GUESS_COLORS,
  DRAW_GUESS_LOGICAL_HEIGHT,
  DRAW_GUESS_LOGICAL_WIDTH,
  DrawGuessCanvasAction,
  DrawGuessPoint,
  DrawGuessPreview,
  DrawGuessShape,
  DrawGuessTool,
  downsampleDrawGuessPoints,
  floodFillPixels,
  hexToRgba,
} from "@/lib/drawGuessTypes";

interface Props {
  actions: DrawGuessCanvasAction[];
  revision: number;
  preview: DrawGuessPreview | null;
  canDraw: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onPreview: (payload: DrawGuessPreview) => void;
  onAction: (action: DrawGuessCanvasAction) => void;
  onHistory: (action: "undo" | "redo" | "clear") => void;
}

interface ActiveStroke {
  id: string;
  tool: "brush" | "eraser";
  color: string;
  size: number;
  points: DrawGuessPoint[];
  lastPreviewIndex: number;
  sequence: number;
  lastPreviewAt: number;
}

interface ActiveShape { id: string; shape: DrawGuessShape; start: DrawGuessPoint; end: DrawGuessPoint }

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}:${crypto.randomUUID()}`;
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

function pointToPixels(point: DrawGuessPoint) {
  return { x: point.x * DRAW_GUESS_LOGICAL_WIDTH, y: point.y * DRAW_GUESS_LOGICAL_HEIGHT };
}

function drawStroke(context: CanvasRenderingContext2D, action: { tool: "brush" | "eraser"; color: string; size: number; points: DrawGuessPoint[] }, from = 0) {
  if (action.points.length === 0) return;
  const scale = DRAW_GUESS_LOGICAL_WIDTH;
  context.save();
  context.globalCompositeOperation = "source-over";
  context.strokeStyle = action.tool === "eraser" ? "#ffffff" : action.color;
  context.fillStyle = action.tool === "eraser" ? "#ffffff" : action.color;
  context.lineWidth = Math.max(1, action.size * scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  if (action.points.length === 1) {
    const point = pointToPixels(action.points[0]);
    context.beginPath();
    context.arc(point.x, point.y, context.lineWidth / 2, 0, Math.PI * 2);
    context.fill();
  } else {
    const start = Math.max(0, Math.min(from, action.points.length - 2));
    const first = pointToPixels(action.points[start]);
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (let index = start + 1; index < action.points.length; index += 1) {
      const point = pointToPixels(action.points[index]);
      context.lineTo(point.x, point.y);
    }
    context.stroke();
  }
  context.restore();
}

function drawShape(context: CanvasRenderingContext2D, action: { shape: DrawGuessShape; color: string; size: number; start: DrawGuessPoint; end: DrawGuessPoint }) {
  const start = pointToPixels(action.start);
  const end = pointToPixels(action.end);
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  context.save();
  context.strokeStyle = action.color;
  context.lineWidth = Math.max(1, action.size * DRAW_GUESS_LOGICAL_WIDTH);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  if (action.shape === "line") {
    context.moveTo(start.x, start.y); context.lineTo(end.x, end.y);
  } else if (action.shape === "rectangle") {
    context.rect(left, top, width, height);
  } else if (action.shape === "ellipse") {
    context.ellipse(left + width / 2, top + height / 2, Math.max(1, width / 2), Math.max(1, height / 2), 0, 0, Math.PI * 2);
  } else {
    context.moveTo((start.x + end.x) / 2, start.y);
    context.lineTo(end.x, end.y);
    context.lineTo(start.x, end.y);
    context.closePath();
  }
  context.stroke();
  context.restore();
}

function applyFill(context: CanvasRenderingContext2D, point: DrawGuessPoint, color: string) {
  const image = context.getImageData(0, 0, DRAW_GUESS_LOGICAL_WIDTH, DRAW_GUESS_LOGICAL_HEIGHT);
  floodFillPixels(
    image.data,
    DRAW_GUESS_LOGICAL_WIDTH,
    DRAW_GUESS_LOGICAL_HEIGHT,
    point.x * DRAW_GUESS_LOGICAL_WIDTH,
    point.y * DRAW_GUESS_LOGICAL_HEIGHT,
    hexToRgba(color),
    DRAW_GUESS_LOGICAL_WIDTH * DRAW_GUESS_LOGICAL_HEIGHT
  );
  context.putImageData(image, 0, 0);
}

function renderActions(context: CanvasRenderingContext2D, actions: DrawGuessCanvasAction[]) {
  context.save();
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, DRAW_GUESS_LOGICAL_WIDTH, DRAW_GUESS_LOGICAL_HEIGHT);
  context.restore();
  for (const action of actions) {
    if (action.kind === "clear") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, DRAW_GUESS_LOGICAL_WIDTH, DRAW_GUESS_LOGICAL_HEIGHT);
    } else if (action.kind === "stroke") drawStroke(context, action);
    else if (action.kind === "shape") drawShape(context, action);
    else applyFill(context, action.point, action.color);
  }
}

const TOOLS: { id: DrawGuessTool; label: string; icon: typeof Paintbrush }[] = [
  { id: "brush", label: "Pincel", icon: Paintbrush },
  { id: "fill", label: "Balde de tinta", icon: PaintBucket },
  { id: "eraser", label: "Borracha", icon: Eraser },
  { id: "line", label: "Linha", icon: Minus },
  { id: "rectangle", label: "Retângulo", icon: Square },
  { id: "ellipse", label: "Círculo ou elipse", icon: Circle },
  { id: "triangle", label: "Triângulo", icon: Triangle },
];

export default function DrawGuessCanvas({ actions, revision, preview, canDraw, canUndo, canRedo, onPreview, onAction, onHistory }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePointer = useRef<number | null>(null);
  const activeStroke = useRef<ActiveStroke | null>(null);
  const activeShape = useRef<ActiveShape | null>(null);
  const remoteSequences = useRef(new Map<string, number>());
  const [tool, setTool] = useState<DrawGuessTool>("brush");
  const [color, setColor] = useState("#111827");
  const [sizePx, setSizePx] = useState(9);
  const size = sizePx / DRAW_GUESS_LOGICAL_WIDTH;

  const redraw = useCallback(() => {
    const context = canvasRef.current?.getContext("2d", { willReadFrequently: true });
    if (context) renderActions(context, actions);
  }, [actions]);

  useEffect(() => {
    activePointer.current = null;
    activeStroke.current = null;
    activeShape.current = null;
    remoteSequences.current.clear();
    redraw();
  }, [redraw, revision]);

  useEffect(() => {
    if (!preview) return;
    const previous = remoteSequences.current.get(preview.strokeId) ?? -1;
    if (preview.sequence <= previous) return;
    remoteSequences.current.set(preview.strokeId, preview.sequence);
    const context = canvasRef.current?.getContext("2d", { willReadFrequently: true });
    if (context) drawStroke(context, preview);
  }, [preview]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): DrawGuessPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const flushPreview = (stroke: ActiveStroke) => {
    const start = Math.max(0, stroke.lastPreviewIndex);
    const points = stroke.points.slice(start, Math.min(stroke.points.length, start + 32));
    if (points.length < 2) return;
    stroke.sequence += 1;
    stroke.lastPreviewIndex += points.length - 1;
    stroke.lastPreviewAt = performance.now();
    onPreview({ strokeId: stroke.id, sequence: stroke.sequence, tool: stroke.tool, color: stroke.color, size: stroke.size, points });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    if (tool === "fill") {
      const context = canvasRef.current?.getContext("2d", { willReadFrequently: true });
      if (context) applyFill(context, point, color);
      onAction({ id: createId("fill"), kind: "fill", color, point });
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    if (tool === "brush" || tool === "eraser") {
      const stroke: ActiveStroke = { id: createId("stroke"), tool, color, size, points: [point], lastPreviewIndex: 0, sequence: 0, lastPreviewAt: performance.now() };
      activeStroke.current = stroke;
      const context = canvasRef.current?.getContext("2d", { willReadFrequently: true });
      if (context) drawStroke(context, stroke);
    } else {
      activeShape.current = { id: createId("shape"), shape: tool, start: point, end: point };
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || activePointer.current !== event.pointerId) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const stroke = activeStroke.current;
    if (stroke) {
      const previous = stroke.points.at(-1)!;
      if (Math.hypot(point.x - previous.x, point.y - previous.y) < 0.0012) return;
      stroke.points.push(point);
      const context = canvasRef.current?.getContext("2d", { willReadFrequently: true });
      if (context) drawStroke(context, stroke, stroke.points.length - 2);
      if (performance.now() - stroke.lastPreviewAt >= 32 || stroke.points.length - stroke.lastPreviewIndex >= 24) flushPreview(stroke);
      return;
    }
    const shape = activeShape.current;
    if (shape) {
      shape.end = point;
      redraw();
      const context = canvasRef.current?.getContext("2d", { willReadFrequently: true });
      if (context) drawShape(context, { ...shape, color, size });
    }
  };

  const finishPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    activePointer.current = null;
    const stroke = activeStroke.current;
    if (stroke) {
      flushPreview(stroke);
      activeStroke.current = null;
      onAction({ id: stroke.id, kind: "stroke", tool: stroke.tool, color: stroke.color, size: stroke.size, points: downsampleDrawGuessPoints(stroke.points) });
      return;
    }
    const shape = activeShape.current;
    if (shape) {
      shape.end = pointFromEvent(event);
      activeShape.current = null;
      onAction({ id: shape.id, kind: "shape", shape: shape.shape, color, size, start: shape.start, end: shape.end });
    }
  };

  const clear = () => {
    if (window.confirm("Apagar todo o desenho desta rodada?")) onHistory("clear");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      {canDraw ? (
        <div className="shrink-0 rounded-2xl border border-white/55 bg-white/45 p-1.5 shadow-sm backdrop-blur-md dark:bg-black/15">
          <div className="grid grid-cols-7 gap-1" aria-label="Ferramentas de desenho">
            {TOOLS.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" onClick={() => setTool(item.id)} aria-label={item.label} aria-pressed={tool === item.id} title={item.label}
                  className={`flex h-8 items-center justify-center rounded-lg transition ${tool === item.id ? "bg-rose text-white shadow-sm" : "bg-white/55 text-ink-soft hover:text-ink dark:bg-white/10"}`}>
                  <Icon size={15} />
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <button type="button" onClick={() => onHistory("undo")} disabled={!canUndo} aria-label="Desfazer" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/55 text-ink-soft disabled:opacity-30 dark:bg-white/10"><Undo2 size={15} /></button>
            <button type="button" onClick={() => onHistory("redo")} disabled={!canRedo} aria-label="Refazer" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/55 text-ink-soft disabled:opacity-30 dark:bg-white/10"><Redo2 size={15} /></button>
            <button type="button" onClick={clear} aria-label="Limpar tudo" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose/10 text-rose-deep"><Trash2 size={15} /></button>
            <span className="ml-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-black/10 bg-white" aria-label={`Pincel com ${sizePx} pixels`}><span className="block rounded-full bg-black" style={{ width: Math.max(2, Math.min(18, sizePx / 2)), height: Math.max(2, Math.min(18, sizePx / 2)) }} /></span>
            <input type="range" min={2} max={36} value={sizePx} onChange={(event) => setSizePx(Number(event.target.value))} aria-label="Tamanho do pincel" className="h-8 min-w-0 flex-1 accent-pink-500" />
          </div>
          <div className="mt-1.5 flex items-center justify-center gap-1.5" aria-label="Cores">
            {DRAW_GUESS_COLORS.map((item) => <button key={item.value} type="button" onClick={() => { setColor(item.value); if (tool === "eraser") setTool("brush"); }} aria-label={item.label} aria-pressed={color === item.value} className={`h-5 w-5 rounded-full border border-black/15 ${color === item.value && tool !== "eraser" ? "ring-2 ring-rose ring-offset-1" : ""}`} style={{ backgroundColor: item.value }} />)}
            <label className="relative grid h-5 w-5 cursor-pointer place-items-center overflow-hidden rounded-full border border-white bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" title="Escolher qualquer cor">
              <input type="color" value={color} onChange={(event) => { setColor(event.target.value.toLowerCase()); if (tool === "eraser") setTool("brush"); }} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Escolher qualquer cor" />
            </label>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/35 p-1 shadow-[0_14px_34px_-18px_rgba(76,29,149,0.45)]">
        <canvas
          ref={canvasRef}
          width={DRAW_GUESS_LOGICAL_WIDTH}
          height={DRAW_GUESS_LOGICAL_HEIGHT}
          className={`block h-full w-full select-none rounded-[1.05rem] bg-white ${canDraw ? "cursor-crosshair" : "cursor-default"}`}
          style={{ width: "100%", height: "100%", touchAction: canDraw ? "none" : "auto", WebkitUserSelect: "none", userSelect: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={finishPointer}
          onContextMenu={(event) => event.preventDefault()}
          aria-label={canDraw ? "Canvas de desenho" : "Desenho da rodada"}
        />
      </div>
    </div>
  );
}
