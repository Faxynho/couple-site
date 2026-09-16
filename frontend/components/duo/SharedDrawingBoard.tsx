"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Paintbrush, Trash2 } from "lucide-react";
import { getSocket } from "@/lib/socket";
import {
  downsampleDrawingPoints,
  SHARED_DRAWING_COLORS,
  SHARED_DRAWING_SIZES,
  SharedDrawingBoardSnapshot,
  SharedDrawingPoint,
  SharedDrawingStroke,
  SharedDrawingTool,
} from "@/lib/sharedDrawingBoard";

interface BoardAck {
  ok: boolean;
  board?: SharedDrawingBoardSnapshot;
  error?: string;
}

interface StrokeAck {
  ok: boolean;
  stroke?: SharedDrawingStroke;
  error?: string;
}

function newStrokeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: SharedDrawingStroke,
  width: number,
  height: number,
  fromPoint = 0
) {
  const points = stroke.points;
  if (points.length === 0) return;
  context.save();
  context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = Math.max(1, stroke.size * width * (stroke.tool === "eraser" ? 1.8 : 1));

  if (points.length === 1) {
    context.beginPath();
    context.arc(points[0].x * width, points[0].y * height, context.lineWidth / 2, 0, Math.PI * 2);
    context.fill();
  } else {
    const start = Math.max(0, Math.min(fromPoint, points.length - 2));
    context.beginPath();
    context.moveTo(points[start].x * width, points[start].y * height);
    for (let index = start + 1; index < points.length; index += 1) {
      context.lineTo(points[index].x * width, points[index].y * height);
    }
    context.stroke();
  }
  context.restore();
}

export default function SharedDrawingBoard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<SharedDrawingStroke[]>([]);
  const currentStrokeRef = useRef<SharedDrawingStroke | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const [tool, setTool] = useState<SharedDrawingTool>("brush");
  const [color, setColor] = useState<string>(SHARED_DRAWING_COLORS[0].value);
  const [size, setSize] = useState<number>(SHARED_DRAWING_SIZES[1].value);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("Carregando desenho...");

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const nextWidth = Math.round(rect.width * pixelRatio);
    const nextHeight = Math.round(rect.height * pixelRatio);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    for (const stroke of strokesRef.current) drawStroke(context, stroke, rect.width, rect.height);
  }, []);

  const requestSync = useCallback((showLoading = true) => {
    const socket = getSocket();
    if (showLoading) {
      setStatus("loading");
      setMessage("Carregando desenho...");
    }
    socket.emit("duoBoard:sync", (response: BoardAck) => {
      if (!response.ok || !response.board) {
        setStatus("error");
        setMessage(response.error ?? "Não foi possível carregar o quadro.");
        return;
      }
      strokesRef.current = response.board.strokes;
      setStatus("ready");
      setMessage("Desenho salvo e compartilhado");
      redraw();
    });
  }, [redraw]);

  useEffect(() => {
    const socket = getSocket();
    const handleStroke = (stroke: SharedDrawingStroke) => {
      if (!strokesRef.current.some((item) => item.id === stroke.id)) {
        strokesRef.current = [...strokesRef.current, stroke];
        redraw();
      }
      setStatus("ready");
      setMessage("Desenho salvo e compartilhado");
      // Dois traços podem terminar quase juntos em aparelhos diferentes. O
      // snapshot silencioso recompõe a ordem autoritativa do servidor (isso é
      // importante quando um desses traços é uma borracha).
      requestSync(false);
    };
    const handleClear = () => {
      strokesRef.current = [];
      currentStrokeRef.current = null;
      activePointerRef.current = null;
      setStatus("ready");
      setMessage("Quadro limpo e salvo");
      redraw();
    };
    const handleConnect = () => requestSync();

    socket.on("duoBoard:strokeAdded", handleStroke);
    socket.on("duoBoard:cleared", handleClear);
    socket.on("connect", handleConnect);
    requestSync();

    const canvas = canvasRef.current;
    const observer = typeof ResizeObserver !== "undefined" && canvas
      ? new ResizeObserver(() => redraw())
      : null;
    if (canvas) observer?.observe(canvas);

    return () => {
      socket.off("duoBoard:strokeAdded", handleStroke);
      socket.off("duoBoard:cleared", handleClear);
      socket.off("connect", handleConnect);
      observer?.disconnect();
    };
  }, [redraw, requestSync]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): SharedDrawingPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (status === "loading") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerRef.current = event.pointerId;
    const stroke: SharedDrawingStroke = {
      id: newStrokeId(),
      tool,
      color,
      size,
      points: [pointFromEvent(event)],
    };
    currentStrokeRef.current = stroke;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      const rect = canvas.getBoundingClientRect();
      drawStroke(context, stroke, rect.width, rect.height);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const stroke = currentStrokeRef.current;
    if (!stroke || activePointerRef.current !== event.pointerId) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const previous = stroke.points[stroke.points.length - 1];
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 0.0015) return;
    stroke.points.push(point);
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      const rect = canvas.getBoundingClientRect();
      drawStroke(context, stroke, rect.width, rect.height, stroke.points.length - 2);
    }
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const stroke = currentStrokeRef.current;
    if (!stroke || activePointerRef.current !== event.pointerId) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointerRef.current = null;
    currentStrokeRef.current = null;
    const storedStroke = { ...stroke, points: downsampleDrawingPoints(stroke.points) };
    strokesRef.current = [...strokesRef.current, storedStroke];
    setStatus("saving");
    setMessage("Salvando...");
    getSocket().emit("duoBoard:addStroke", { stroke: storedStroke }, (response: StrokeAck) => {
      if (response.ok) {
        setStatus("ready");
        setMessage("Desenho salvo e compartilhado");
        return;
      }
      setStatus("error");
      setMessage(response.error ?? "Não foi possível salvar o traço.");
      requestSync();
    });
  };

  const clearBoard = () => {
    if (!window.confirm("Apagar todo o desenho compartilhado? Essa ação não pode ser desfeita.")) return;
    setStatus("saving");
    setMessage("Apagando...");
    getSocket().emit("duoBoard:clear", (response: StrokeAck) => {
      if (response.ok) return;
      setStatus("error");
      setMessage(response.error ?? "Não foi possível apagar o quadro.");
    });
  };

  return (
    <section className="glass-panel w-full rounded-xl3 p-4 sm:p-5" aria-labelledby="shared-drawing-title">
      <div className="mb-3 flex items-start justify-between gap-3 text-left">
        <div>
          <h2 id="shared-drawing-title" className="font-display text-lg font-semibold text-ink">Nosso Quadro</h2>
          <p className="mt-0.5 text-xs text-ink-soft">Desenhem juntos e continuem de onde pararam.</p>
        </div>
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${status === "error" ? "bg-red-500" : status === "saving" || status === "loading" ? "animate-pulse bg-amber-400" : "bg-emerald-500"}`} aria-hidden="true" />
      </div>

      <canvas
        ref={canvasRef}
        className="block aspect-[3/2] w-full cursor-crosshair select-none rounded-xl2 border border-black/10 bg-white shadow-inner"
        style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onContextMenu={(event) => event.preventDefault()}
        aria-label="Tela branca do Nosso Quadro"
      />

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2" aria-label="Ferramentas de desenho">
            <button
              type="button"
              onClick={() => setTool("brush")}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${tool === "brush" ? "bg-rose text-white shadow-soft" : "bg-surface/80 text-ink-soft hover:text-ink"}`}
              aria-pressed={tool === "brush"}
            >
              <Paintbrush size={15} /> Pincel
            </button>
            <button
              type="button"
              onClick={() => setTool("eraser")}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${tool === "eraser" ? "bg-rose text-white shadow-soft" : "bg-surface/80 text-ink-soft hover:text-ink"}`}
              aria-pressed={tool === "eraser"}
            >
              <Eraser size={15} /> Borracha
            </button>
          </div>
          <button
            type="button"
            onClick={clearBoard}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-rose-deep transition-colors hover:bg-rose/10"
          >
            <Trash2 size={15} /> Apagar tudo
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2" aria-label="Cores do pincel">
          {SHARED_DRAWING_COLORS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => { setColor(item.value); setTool("brush"); }}
              className={`h-8 w-8 rounded-full border shadow-sm transition-transform hover:scale-110 ${color === item.value && tool === "brush" ? "scale-110 ring-2 ring-rose ring-offset-2 ring-offset-transparent" : "border-black/15"}`}
              style={{ backgroundColor: item.value }}
              aria-label={item.label}
              aria-pressed={color === item.value && tool === "brush"}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2" aria-label="Tamanho do pincel">
          <span className="mr-1 text-xs font-medium text-ink-soft">Tamanho</span>
          {SHARED_DRAWING_SIZES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSize(item.value)}
              className={`min-h-9 rounded-full px-3 text-xs font-semibold transition-colors ${size === item.value ? "bg-ink text-surface" : "bg-surface/80 text-ink-soft hover:text-ink"}`}
              aria-pressed={size === item.value}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className={`mt-3 text-left text-[11px] ${status === "error" ? "text-red-600" : "text-ink-soft/80"}`} role="status">
        {message}
      </p>
    </section>
  );
}
