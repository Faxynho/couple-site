"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Circle,
  Diamond,
  Eraser,
  Heart,
  Images,
  Minus,
  PaintBucket,
  Paintbrush,
  Pipette,
  Redo2,
  Save,
  Shapes,
  Square,
  Sparkles,
  Star,
  Trash2,
  Triangle,
  Undo2,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { drawStroke, rgbaToHex } from "@/lib/sharedDrawingRenderer";
import SharedDrawingGallery from "@/components/duo/SharedDrawingGallery";
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

interface GalleryAck {
  ok: boolean;
  count?: number;
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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryCount, setGalleryCount] = useState(0);
  const [savedToGallery, setSavedToGallery] = useState(false);
  const [savingToGallery, setSavingToGallery] = useState(false);
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const handleGalleryChanged = (payload?: { count?: number }) => {
      if (typeof payload?.count === "number") setGalleryCount(payload.count);
    };

    socket.on("duoBoard:galleryChanged", handleGalleryChanged);
    socket.on("duoBoard:strokeAdded", handleStroke);
    socket.on("duoBoard:changed", handleBoardChanged);
    socket.on("duoBoard:cleared", handleClear);
    socket.on("connect", handleConnect);
    requestSync();
    socket.emit("duoBoard:gallerySync", { metaOnly: true }, (response: GalleryAck) => {
      if (response?.ok && typeof response.count === "number") setGalleryCount(response.count);
    });

    const canvas = canvasRef.current;
    const observer = typeof ResizeObserver !== "undefined" && canvas
      ? new ResizeObserver(() => redraw())
      : null;
    if (canvas) observer?.observe(canvas);

    return () => {
      socket.off("duoBoard:galleryChanged", handleGalleryChanged);
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

  useEffect(() => () => {
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
  }, []);

  const saveToGallery = () => {
    if (savingToGallery) return;
    setSavingToGallery(true);
    setStatus("saving");
    setMessage("Salvando na galeria...");
    getSocket().emit("duoBoard:saveToGallery", (response: GalleryAck) => {
      setSavingToGallery(false);
      if (response?.ok) {
        if (typeof response.count === "number") setGalleryCount(response.count);
        setSavedToGallery(true);
        setStatus("ready");
        setMessage("Desenho guardado na galeria");
        if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
        savedFlashTimerRef.current = setTimeout(() => setSavedToGallery(false), 1800);
        return;
      }
      // Erro da galeria não afeta o quadro ao vivo, mas o estado visual
      // precisa refletir que o salvamento falhou e não ficou pendente.
      setStatus("error");
      setMessage(response?.error ?? "Não foi possível salvar na galeria.");
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
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="flex items-center justify-center gap-2.5 sm:gap-3">
          <Sparkles size={20} className="animate-floaty text-rose drop-shadow-[0_0_8px_rgba(232,80,140,0.45)]" aria-hidden="true" />
          <Heart size={22} className="text-rose-deep drop-shadow-[0_0_10px_rgba(232,80,140,0.5)]" fill="currentColor" aria-hidden="true" />
          <h2
            id="shared-drawing-title"
            className="bg-gradient-to-r from-rose-deep via-rose to-[#a56bd8] bg-clip-text font-display text-3xl font-extrabold tracking-tight text-transparent drop-shadow-[0_3px_10px_rgba(232,80,140,0.3)] sm:text-5xl"
          >
            Nosso Quadro
          </h2>
          <Heart size={22} className="text-rose-deep drop-shadow-[0_0_10px_rgba(232,80,140,0.5)]" fill="currentColor" aria-hidden="true" />
          <Sparkles size={20} className="animate-floaty text-rose drop-shadow-[0_0_8px_rgba(232,80,140,0.45)]" aria-hidden="true" />
        </div>
        <span className="mt-2 h-1 w-24 rounded-full bg-gradient-to-r from-transparent via-rose-deep to-transparent opacity-80 sm:w-36" aria-hidden="true" />
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
              <div className="absolute bottom-[calc(100%+0.55rem)] right-0 z-40 grid w-[min(15rem,calc(100vw-2rem))] grid-cols-4 gap-1.5 rounded-2xl border border-white/60 bg-surface/95 p-2 shadow-[0_14px_35px_rgba(48,20,43,0.28)] backdrop-blur-md sm:left-1/2 sm:right-auto sm:w-[15rem] sm:-translate-x-1/2" aria-label="Escolher forma">
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
          <button
            type="button"
            onClick={saveToGallery}
            disabled={!canUndo || status === "loading" || savingToGallery}
            className={`${toolButtonClass(savedToGallery)} disabled:cursor-not-allowed disabled:opacity-35`}
            aria-label="Salvar na galeria"
            title="Salvar na galeria"
          >
            {savedToGallery ? <Check size={18} /> : <Save size={18} />}
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

        <button
          type="button"
          onClick={() => setGalleryOpen(true)}
          className="group mx-auto inline-flex h-12 items-center gap-2.5 rounded-full border border-white/70 bg-surface/70 px-6 font-display text-base font-extrabold text-rose-deep shadow-soft transition-all hover:-translate-y-0.5 hover:bg-surface/90 hover:shadow-[0_12px_26px_-14px_rgba(232,80,140,0.6)]"
          aria-label="Abrir galeria de desenhos"
        >
          <Images size={20} className="transition-transform group-hover:scale-110" aria-hidden="true" />
          Galeria
          {galleryCount > 0 && (
            <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-rose px-2 py-0.5 text-xs font-bold text-white" aria-label={`${galleryCount} desenhos salvos`}>
              {galleryCount}
            </span>
          )}
        </button>
      </div>

      <p className={`mt-3 text-center text-[11px] ${status === "error" ? "text-red-600" : "text-ink-soft/80"}`} role="status">
        {message}
      </p>

      <SharedDrawingGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onCountChange={setGalleryCount}
      />
    </section>
  );
}
