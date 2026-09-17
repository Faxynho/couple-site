"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Heart, Paintbrush, Redo2, Trash2, Undo2 } from "lucide-react";
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
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
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

  const applyBoard = useCallback((board: SharedDrawingBoardSnapshot, nextMessage: string) => {
    strokesRef.current = board.strokes;
    currentStrokeRef.current = null;
    activePointerRef.current = null;
    setCanUndo(board.canUndo);
    setCanRedo(board.canRedo);
    setStatus("ready");
    setMessage(nextMessage);
    redraw();
  }, [redraw]);

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
      applyBoard(response.board, "Desenho salvo e compartilhado");
    });
  }, [applyBoard]);

  useEffect(() => {
    const socket = getSocket();
    const handleStroke = (stroke: SharedDrawingStroke) => {
      if (!strokesRef.current.some((item) => item.id === stroke.id)) {
        strokesRef.current = [...strokesRef.current, stroke];
        redraw();
      }
      setCanUndo(true);
      setCanRedo(false);
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
      setCanUndo(false);
      setCanRedo(false);
      setStatus("ready");
      setMessage("Quadro limpo e salvo");
      redraw();
    };
    const handleBoardChanged = (board: SharedDrawingBoardSnapshot) => {
      applyBoard(board, "Quadro atualizado e salvo");
    };
    const handleConnect = () => requestSync();

    socket.on("duoBoard:strokeAdded", handleStroke);
    socket.on("duoBoard:changed", handleBoardChanged);
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
      socket.off("duoBoard:changed", handleBoardChanged);
      socket.off("duoBoard:cleared", handleClear);
      socket.off("connect", handleConnect);
      observer?.disconnect();
    };
  }, [applyBoard, redraw, requestSync]);

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
    setCanUndo(true);
    setCanRedo(false);
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

  const changeHistory = (action: "undo" | "redo") => {
    setStatus("saving");
    setMessage(action === "undo" ? "Desfazendo..." : "Refazendo...");
    getSocket().emit(`duoBoard:${action}`, (response: BoardAck) => {
      if (response.ok && response.board) {
        applyBoard(response.board, action === "undo" ? "Último traço desfeito" : "Traço refeito");
        return;
      }
      setStatus("error");
      setMessage(response.error ?? `Não foi possível ${action === "undo" ? "desfazer" : "refazer"}.`);
      requestSync(false);
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
    <section className="mx-auto w-full max-w-2xl py-1" aria-labelledby="shared-drawing-title">
      <div className="mb-4 flex items-center justify-center gap-2 text-center">
        <Heart
          size={17}
          className="text-rose-deep drop-shadow-[0_0_8px_rgba(232,80,140,0.4)]"
          fill="currentColor"
          aria-hidden="true"
        />
        <h2
          id="shared-drawing-title"
          className="font-display text-xl font-extrabold tracking-tight text-rose-deep drop-shadow-[0_2px_8px_rgba(232,80,140,0.28)] sm:text-2xl"
        >
          Nosso Quadro
        </h2>
        <Heart
          size={17}
          className="text-rose-deep drop-shadow-[0_0_8px_rgba(232,80,140,0.4)]"
          fill="currentColor"
          aria-hidden="true"
        />
      </div>

      <canvas
        ref={canvasRef}
        className="block aspect-[3/2] w-full cursor-crosshair select-none rounded-xl2 border border-white/80 bg-white shadow-[0_18px_38px_-22px_rgba(68,24,62,0.55)] sm:aspect-[5/3]"
        style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onContextMenu={(event) => event.preventDefault()}
        aria-label="Tela branca do Nosso Quadro"
      />

      <div className="mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-5 gap-2" aria-label="Ferramentas de desenho">
          <button
            type="button"
            onClick={() => changeHistory("undo")}
            disabled={!canUndo || status === "loading" || status === "saving"}
            className="inline-flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl2 bg-surface/45 px-1 text-[10px] font-semibold text-ink-soft transition-colors hover:bg-surface/75 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-10 sm:flex-row sm:gap-1.5 sm:rounded-full sm:text-xs"
            aria-label="Desfazer último traço"
          >
            <Undo2 size={15} /> <span>Desfazer</span>
          </button>
          <button
            type="button"
            onClick={() => changeHistory("redo")}
            disabled={!canRedo || status === "loading" || status === "saving"}
            className="inline-flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl2 bg-surface/45 px-1 text-[10px] font-semibold text-ink-soft transition-colors hover:bg-surface/75 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-10 sm:flex-row sm:gap-1.5 sm:rounded-full sm:text-xs"
            aria-label="Refazer último traço"
          >
            <Redo2 size={15} /> <span>Refazer</span>
          </button>
          <button
            type="button"
            onClick={() => setTool("brush")}
            className={`inline-flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl2 px-1 text-[10px] font-semibold transition-colors sm:min-h-10 sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-2 sm:text-xs ${tool === "brush" ? "bg-rose text-white shadow-soft" : "bg-surface/55 text-ink-soft hover:bg-surface/75 hover:text-ink"}`}
            aria-pressed={tool === "brush"}
          >
            <Paintbrush size={15} /> Pincel
          </button>
          <button
            type="button"
            onClick={() => setTool("eraser")}
            className={`inline-flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl2 px-1 text-[10px] font-semibold transition-colors sm:min-h-10 sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-2 sm:text-xs ${tool === "eraser" ? "bg-rose text-white shadow-soft" : "bg-surface/55 text-ink-soft hover:bg-surface/75 hover:text-ink"}`}
            aria-pressed={tool === "eraser"}
          >
            <Eraser size={15} /> Borracha
          </button>
          <button
            type="button"
            onClick={clearBoard}
            className="inline-flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl2 bg-surface/35 px-1 text-center text-[10px] font-semibold leading-tight text-rose-deep transition-colors hover:bg-rose/10 sm:min-h-10 sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-2 sm:text-xs"
          >
            <Trash2 size={15} /> Apagar tudo
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Cores do pincel">
          {SHARED_DRAWING_COLORS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => { setColor(item.value); setTool("brush"); }}
              className={`h-7 w-7 justify-self-center rounded-full border shadow-sm transition-transform hover:scale-110 sm:h-8 sm:w-8 ${color === item.value && tool === "brush" ? "scale-110 ring-2 ring-rose ring-offset-2 ring-offset-transparent" : "border-black/15"}`}
              style={{ backgroundColor: item.value }}
              aria-label={item.label}
              aria-pressed={color === item.value && tool === "brush"}
            />
          ))}
          <label
            className={`relative inline-flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/70 shadow-sm transition-transform hover:scale-110 sm:h-8 sm:w-8 ${!SHARED_DRAWING_COLORS.some((item) => item.value === color) && tool === "brush" ? "scale-110 ring-2 ring-rose ring-offset-2 ring-offset-transparent" : ""}`}
            style={{ backgroundColor: color }}
            title="Escolher qualquer cor"
          >
            <span className="text-sm font-bold text-white mix-blend-difference" aria-hidden="true">+</span>
            <input
              type="color"
              value={color}
              onChange={(event) => {
                setColor(event.target.value.toLowerCase());
                setTool("brush");
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Escolher qualquer cor"
            />
          </label>
        </div>

        <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-2" aria-label="Tamanho do pincel">
          <span className="text-xs font-medium text-ink-soft">Tamanho</span>
          {SHARED_DRAWING_SIZES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSize(item.value)}
              className={`min-h-9 w-full rounded-full px-2 text-xs font-semibold transition-colors ${size === item.value ? "bg-surface text-ink shadow-soft" : "bg-surface/45 text-ink-soft hover:bg-surface/70 hover:text-ink"}`}
              aria-pressed={size === item.value}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className={`mt-3 text-center text-[11px] ${status === "error" ? "text-red-600" : "text-ink-soft/80"}`} role="status">
        {message}
      </p>
    </section>
  );
}
