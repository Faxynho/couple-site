"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Circle,
  Diamond,
  Eraser,
  Heart,
  Minus,
  PaintBucket,
  Paintbrush,
  Pipette,
  Redo2,
  Shapes,
  Square,
  Star,
  Trash2,
  Triangle,
  Undo2,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import {
  clampDrawingSize,
  downsampleDrawingPoints,
  SHARED_DRAWING_COLORS,
  SHARED_DRAWING_DEFAULT_SIZE,
  SHARED_DRAWING_MAX_SIZE,
  SHARED_DRAWING_MIN_SIZE,
  SHARED_DRAWING_SIZE_STEP,
  SharedDrawingBoardSnapshot,
  SharedDrawingPoint,
  SharedDrawingShape,
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

type UiTool = SharedDrawingTool | "eyedropper";

const SHAPES: Array<{ id: SharedDrawingShape; label: string; icon: typeof Square }> = [
  { id: "line", label: "Linha", icon: Minus },
  { id: "square", label: "Quadrado", icon: Square },
  { id: "rectangle", label: "Retângulo", icon: Square },
  { id: "circle", label: "Círculo", icon: Circle },
  { id: "triangle", label: "Triângulo", icon: Triangle },
  { id: "star", label: "Estrela", icon: Star },
  { id: "diamond", label: "Losango", icon: Diamond },
  { id: "arrow", label: "Seta", icon: ArrowRight },
];

function newStrokeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function hexToRgba(hex: string): [number, number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
    255,
  ];
}

function rgbaToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function floodFill(
  context: CanvasRenderingContext2D,
  point: SharedDrawingPoint,
  color: string,
  width: number,
  height: number
) {
  const pixelWidth = context.canvas.width;
  const pixelHeight = context.canvas.height;
  if (pixelWidth <= 0 || pixelHeight <= 0) return;

  const scaleX = pixelWidth / width;
  const scaleY = pixelHeight / height;
  const startX = Math.max(0, Math.min(pixelWidth - 1, Math.floor(point.x * width * scaleX)));
  const startY = Math.max(0, Math.min(pixelHeight - 1, Math.floor(point.y * height * scaleY)));
  const image = context.getImageData(0, 0, pixelWidth, pixelHeight);
  const data = image.data;
  const startIndex = (startY * pixelWidth + startX) * 4;
  const target = [
    data[startIndex],
    data[startIndex + 1],
    data[startIndex + 2],
    data[startIndex + 3],
  ];
  const replacement = hexToRgba(color);
  if (target.every((value, index) => value === replacement[index])) return;

  const matches = (index: number) =>
    data[index] === target[0]
    && data[index + 1] === target[1]
    && data[index + 2] === target[2]
    && data[index + 3] === target[3];

  const stack: Array<[number, number]> = [[startX, startY]];
  const visited = new Uint8Array(pixelWidth * pixelHeight);

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const pixelIndex = y * pixelWidth + x;
    if (visited[pixelIndex]) continue;
    visited[pixelIndex] = 1;
    const index = pixelIndex * 4;
    if (!matches(index)) continue;

    data[index] = replacement[0];
    data[index + 1] = replacement[1];
    data[index + 2] = replacement[2];
    data[index + 3] = replacement[3];

    if (x > 0) stack.push([x - 1, y]);
    if (x + 1 < pixelWidth) stack.push([x + 1, y]);
    if (y > 0) stack.push([x, y - 1]);
    if (y + 1 < pixelHeight) stack.push([x, y + 1]);
  }

  context.putImageData(image, 0, 0);
}

function shapeBounds(start: SharedDrawingPoint, end: SharedDrawingPoint, width: number, height: number) {
  return {
    x1: start.x * width,
    y1: start.y * height,
    x2: end.x * width,
    y2: end.y * height,
  };
}

function drawShape(
  context: CanvasRenderingContext2D,
  stroke: SharedDrawingStroke,
  width: number,
  height: number
) {
  if (!stroke.shape || stroke.points.length < 2) return;
  const { x1, y1, x2, y2 } = shapeBounds(stroke.points[0], stroke.points[1], width, height);
  context.beginPath();

  if (stroke.shape === "line") {
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
  } else if (stroke.shape === "rectangle") {
    context.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  } else if (stroke.shape === "square") {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    context.rect(x1, y1, Math.sign(dx || 1) * side, Math.sign(dy || 1) * side);
  } else if (stroke.shape === "circle") {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    context.ellipse(cx, cy, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
  } else if (stroke.shape === "triangle") {
    context.moveTo((x1 + x2) / 2, y1);
    context.lineTo(x2, y2);
    context.lineTo(x1, y2);
    context.closePath();
  } else if (stroke.shape === "diamond") {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    context.moveTo(cx, y1);
    context.lineTo(x2, cy);
    context.lineTo(cx, y2);
    context.lineTo(x1, cy);
    context.closePath();
  } else if (stroke.shape === "star") {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const outer = Math.max(2, Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2);
    const inner = outer * 0.45;
    for (let index = 0; index < 10; index += 1) {
      const radius = index % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
  } else if (stroke.shape === "arrow") {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = Math.max(10, context.lineWidth * 3);
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.moveTo(x2, y2);
    context.lineTo(x2 - Math.cos(angle - Math.PI / 6) * head, y2 - Math.sin(angle - Math.PI / 6) * head);
    context.moveTo(x2, y2);
    context.lineTo(x2 - Math.cos(angle + Math.PI / 6) * head, y2 - Math.sin(angle + Math.PI / 6) * head);
  }

  context.stroke();
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

  if (stroke.tool === "fill") {
    floodFill(context, points[0], stroke.color, width, height);
  } else if (stroke.tool === "shape") {
    drawShape(context, stroke, width, height);
  } else if (points.length === 1) {
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
  const [tool, setTool] = useState<UiTool>("brush");
  const [shape, setShape] = useState<SharedDrawingShape>("line");
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [color, setColor] = useState<string>(SHARED_DRAWING_COLORS[0].value);
  const [size, setSize] = useState<number>(SHARED_DRAWING_DEFAULT_SIZE);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("Carregando desenho...");

  const renderBoard = useCallback((preview?: SharedDrawingStroke | null) => {
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
    if (preview) drawStroke(context, preview, rect.width, rect.height);
  }, []);

  const redraw = useCallback(() => renderBoard(), [renderBoard]);

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

  const submitStroke = (stroke: SharedDrawingStroke) => {
    const storedStroke = {
      ...stroke,
      size: clampDrawingSize(stroke.size),
      points: stroke.tool === "brush" || stroke.tool === "eraser"
        ? downsampleDrawingPoints(stroke.points)
        : stroke.points,
    };
    strokesRef.current = [...strokesRef.current, storedStroke];
    setCanUndo(true);
    setCanRedo(false);
    setStatus("saving");
    setMessage("Salvando...");
    redraw();
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

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (status === "loading") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();

    const point = pointFromEvent(event);

    if (tool === "eyedropper") {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (canvas && context) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(point.x * rect.width * scaleX)));
        const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(point.y * rect.height * scaleY)));
        const pixel = context.getImageData(x, y, 1, 1).data;
        setColor(pixel[3] === 0 ? "#ffffff" : rgbaToHex(pixel[0], pixel[1], pixel[2]));
        setTool("brush");
        setMessage("Cor capturada");
      }
      return;
    }

    if (tool === "fill") {
      submitStroke({
        id: newStrokeId(),
        tool: "fill",
        color,
        size,
        points: [point],
      });
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerRef.current = event.pointerId;
    const stroke: SharedDrawingStroke = {
      id: newStrokeId(),
      tool: tool === "shape" ? "shape" : tool,
      color,
      size,
      points: [point],
      ...(tool === "shape" ? { shape } : {}),
    };
    currentStrokeRef.current = stroke;

    if (tool !== "shape") {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (canvas && context) {
        const rect = canvas.getBoundingClientRect();
        drawStroke(context, stroke, rect.width, rect.height);
      }
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const stroke = currentStrokeRef.current;
    if (!stroke || activePointerRef.current !== event.pointerId) return;
    event.preventDefault();
    const point = pointFromEvent(event);

    if (stroke.tool === "shape") {
      stroke.points = [stroke.points[0], point];
      renderBoard(stroke);
      return;
    }

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

    if (stroke.tool === "shape") {
      const end = pointFromEvent(event);
      stroke.points = [stroke.points[0], end];
      if (Math.hypot(end.x - stroke.points[0].x, end.y - stroke.points[0].y) < 0.004) {
        redraw();
        return;
      }
    }

    submitStroke(stroke);
  };

  const changeHistory = (action: "undo" | "redo") => {
    setStatus("saving");
    setMessage(action === "undo" ? "Desfazendo..." : "Refazendo...");
    getSocket().emit(`duoBoard:${action}`, (response: BoardAck) => {
      if (response.ok && response.board) {
        applyBoard(response.board, action === "undo" ? "Última ação desfeita" : "Ação refeita");
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

  const toolButtonClass = (active = false, danger = false) =>
    `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl2 transition-colors sm:h-10 sm:w-10 sm:rounded-full ${
      active
        ? "bg-rose text-white shadow-soft"
        : danger
          ? "bg-surface/35 text-rose-deep hover:bg-rose/10"
          : "bg-surface/55 text-ink-soft hover:bg-surface/80 hover:text-ink"
    }`;

  return (
    <section className="mx-auto w-full max-w-2xl py-1" aria-labelledby="shared-drawing-title">
      <div className="mb-4 flex items-center justify-center gap-2 text-center">
        <Heart size={17} className="text-rose-deep drop-shadow-[0_0_8px_rgba(232,80,140,0.4)]" fill="currentColor" aria-hidden="true" />
        <h2 id="shared-drawing-title" className="font-display text-xl font-extrabold tracking-tight text-rose-deep drop-shadow-[0_2px_8px_rgba(232,80,140,0.28)] sm:text-2xl">
          Nosso Quadro
        </h2>
        <Heart size={17} className="text-rose-deep drop-shadow-[0_0_8px_rgba(232,80,140,0.4)]" fill="currentColor" aria-hidden="true" />
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
        <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Ferramentas de desenho">
          <button type="button" onClick={() => changeHistory("undo")} disabled={!canUndo || status === "loading" || status === "saving"} className={`${toolButtonClass()} disabled:cursor-not-allowed disabled:opacity-35`} aria-label="Desfazer último traço" title="Desfazer">
            <Undo2 size={18} />
          </button>
          <button type="button" onClick={() => changeHistory("redo")} disabled={!canRedo || status === "loading" || status === "saving"} className={`${toolButtonClass()} disabled:cursor-not-allowed disabled:opacity-35`} aria-label="Refazer último traço" title="Refazer">
            <Redo2 size={18} />
          </button>
          <button type="button" onClick={() => { setTool("brush"); setShapeMenuOpen(false); }} className={toolButtonClass(tool === "brush")} aria-label="Pincel" title="Pincel" aria-pressed={tool === "brush"}>
            <Paintbrush size={18} />
          </button>
          <button type="button" onClick={() => { setTool("eraser"); setShapeMenuOpen(false); }} className={toolButtonClass(tool === "eraser")} aria-label="Borracha" title="Borracha" aria-pressed={tool === "eraser"}>
            <Eraser size={18} />
          </button>
          <button type="button" onClick={() => { setTool("fill"); setShapeMenuOpen(false); }} className={toolButtonClass(tool === "fill")} aria-label="Lata de tinta" title="Lata de tinta" aria-pressed={tool === "fill"}>
            <PaintBucket size={18} />
          </button>
          <button type="button" onClick={() => { setTool("eyedropper"); setShapeMenuOpen(false); }} className={toolButtonClass(tool === "eyedropper")} aria-label="Conta-gotas" title="Conta-gotas" aria-pressed={tool === "eyedropper"}>
            <Pipette size={18} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => { setTool("shape"); setShapeMenuOpen((open) => !open); }}
              className={toolButtonClass(tool === "shape")}
              aria-label="Formas"
              title="Formas"
              aria-pressed={tool === "shape"}
              aria-expanded={shapeMenuOpen}
            >
              <Shapes size={18} />
            </button>
            {shapeMenuOpen && (
              <div className="absolute bottom-[calc(100%+0.55rem)] left-1/2 z-40 grid w-[15rem] -translate-x-1/2 grid-cols-4 gap-1.5 rounded-2xl border border-white/60 bg-surface/95 p-2 shadow-[0_14px_35px_rgba(48,20,43,0.28)] backdrop-blur-md" aria-label="Escolher forma">
                {SHAPES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setShape(id); setTool("shape"); setShapeMenuOpen(false); }}
                    className={`flex aspect-square items-center justify-center rounded-xl transition-colors ${shape === id ? "bg-rose text-white" : "text-ink-soft hover:bg-surface hover:text-ink"}`}
                    aria-label={label}
                    title={label}
                    aria-pressed={shape === id}
                  >
                    <Icon size={19} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={clearBoard} className={toolButtonClass(false, true)} aria-label="Apagar tudo" title="Apagar tudo">
            <Trash2 size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Cores do pincel">
          {SHARED_DRAWING_COLORS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => { setColor(item.value); if (tool === "eraser" || tool === "eyedropper") setTool("brush"); }}
              className={`h-7 w-7 justify-self-center rounded-full border shadow-sm transition-transform hover:scale-110 sm:h-8 sm:w-8 ${color === item.value ? "scale-110 ring-2 ring-rose ring-offset-2 ring-offset-transparent" : "border-black/15"}`}
              style={{ backgroundColor: item.value }}
              aria-label={item.label}
              aria-pressed={color === item.value}
            />
          ))}
          <label
            className={`relative inline-flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/70 shadow-sm transition-transform hover:scale-110 sm:h-8 sm:w-8 ${!SHARED_DRAWING_COLORS.some((item) => item.value === color) ? "scale-110 ring-2 ring-rose ring-offset-2 ring-offset-transparent" : ""}`}
            style={{ backgroundColor: color }}
            title="Escolher qualquer cor"
          >
            <span className="text-sm font-bold text-white mix-blend-difference" aria-hidden="true">+</span>
            <input
              type="color"
              value={color}
              onChange={(event) => {
                setColor(event.target.value.toLowerCase());
                if (tool === "eraser" || tool === "eyedropper") setTool("brush");
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Escolher qualquer cor"
            />
          </label>
        </div>

        <div className="flex items-center gap-3 px-1" aria-label="Tamanho do pincel">
          <Paintbrush size={15} className="shrink-0 text-ink-soft" aria-hidden="true" />
          <input
            type="range"
            min={SHARED_DRAWING_MIN_SIZE}
            max={SHARED_DRAWING_MAX_SIZE}
            step={SHARED_DRAWING_SIZE_STEP}
            value={size}
            onChange={(event) => setSize(clampDrawingSize(Number(event.target.value)))}
            className="h-2 w-full cursor-pointer accent-rose"
            aria-label="Tamanho do pincel"
          />
          <span className="w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums text-ink-soft">
            {Math.round(size * 1000)}
          </span>
        </div>
      </div>

      <p className={`mt-3 text-center text-[11px] ${status === "error" ? "text-red-600" : "text-ink-soft/80"}`} role="status">
        {message}
      </p>
    </section>
  );
}
