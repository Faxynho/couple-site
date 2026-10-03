"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Heart, ImageOff, Images, Loader2, Pencil, Trash2, X } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { drawStroke } from "@/lib/sharedDrawingRenderer";
import type { SharedDrawingGalleryItem, SharedDrawingStroke } from "@/lib/sharedDrawingBoard";

interface GalleryAck {
  ok: boolean;
  items?: SharedDrawingGalleryItem[];
  count?: number;
  error?: string;
}

const AUTHOR_NAMES: Record<SharedDrawingGalleryItem["savedBy"], string> = {
  andre: "André",
  flavia: "Flávia",
};

function formatSavedAt(timestamp: number) {
  try {
    const date = new Date(timestamp);
    const day = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${day} · ${time}`;
  } catch {
    return "";
  }
}

/** Miniatura fiel do desenho: mesma proporção do quadro e mesma renderização de traços. */
function GalleryCanvas({ strokes, label }: { strokes: SharedDrawingStroke[]; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visibleRef = useRef(false);

  const render = useCallback(() => {
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
    for (const stroke of strokes) drawStroke(context, stroke, rect.width, rect.height);
  }, [strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Desenha só quando o cartão aparece na tela (baldes de tinta são caros em muitos canvases).
    const draw = () => {
      visibleRef.current = true;
      render();
    };
    let intersection: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      intersection = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) draw();
      }, { rootMargin: "200px" });
      intersection.observe(canvas);
    } else {
      draw();
    }
    const resize = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
        if (visibleRef.current) render();
      })
      : null;
    resize?.observe(canvas);
    return () => {
      intersection?.disconnect();
      resize?.disconnect();
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className="block aspect-[3/2] w-full select-none rounded-xl2 border border-white/80 bg-white shadow-[0_14px_30px_-20px_rgba(68,24,62,0.55)] sm:aspect-[5/3]"
      style={{ touchAction: "pan-y" }}
      onContextMenu={(event) => event.preventDefault()}
      role="img"
      aria-label={label}
    />
  );
}

interface SharedDrawingGalleryProps {
  open: boolean;
  onClose: () => void;
  /** Avisa o quadro quando a quantidade de desenhos muda (apagar na galeria). */
  onCountChange?: (count: number) => void;
}

export default function SharedDrawingGallery({ open, onClose, onCountChange }: SharedDrawingGalleryProps) {
  const [items, setItems] = useState<SharedDrawingGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const load = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    getSocket().emit("duoBoard:gallerySync", (response: GalleryAck) => {
      if (!response?.ok || !response.items) {
        setError(response?.error ?? "Não foi possível carregar a galeria.");
        setLoading(false);
        return;
      }
      setItems(response.items);
      onCountChange?.(response.items.length);
      setLoading(false);
    });
  }, [onCountChange]);

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setPendingDeleteId(null);
      return;
    }
    load();
    const socket = getSocket();
    const handleChanged = () => load(false);
    socket.on("duoBoard:galleryChanged", handleChanged);
    socket.on("connect", handleChanged);
    return () => {
      socket.off("duoBoard:galleryChanged", handleChanged);
      socket.off("connect", handleChanged);
    };
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (pendingDeleteId) setPendingDeleteId(null);
      else onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose, pendingDeleteId]);

  const deleteItem = (id: string) => {
    setDeletingId(id);
    getSocket().emit("duoBoard:galleryDelete", { id }, (response: GalleryAck) => {
      setDeletingId(null);
      setPendingDeleteId(null);
      if (!response?.ok) {
        setError(response?.error ?? "Não foi possível apagar o desenho.");
        load(false);
        return;
      }
      setError(null);
      setItems((current) => {
        const next = current.filter((item) => item.id !== id);
        onCountChange?.(next.length);
        if (next.length === 0) setEditing(false);
        return next;
      });
    });
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shared-drawing-gallery-title"
            className="flex max-h-[92vh] w-full max-w-[calc(42rem+2.5rem)] flex-col overflow-hidden rounded-[28px] border border-surface/70 bg-[#fdf6ee] shadow-[0_24px_80px_rgba(15,23,42,0.3)] dark:bg-[#221b20]"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <header className="flex items-center gap-3 border-b border-ink/10 px-5 py-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose/15 text-rose-deep">
                <Images size={22} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 id="shared-drawing-gallery-title" className="truncate font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                  Galeria do Quadro
                </h3>
                <p className="text-xs font-semibold text-ink-soft">
                  {loading ? "Carregando..." : items.length === 0 ? "Nenhum desenho salvo ainda" : `${items.length} ${items.length === 1 ? "desenho guardado" : "desenhos guardados"}`}
                </p>
              </div>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setEditing((value) => !value); setPendingDeleteId(null); }}
                  className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors ${editing ? "bg-rose text-white shadow-soft" : "bg-surface/70 text-ink-soft hover:bg-surface hover:text-ink"}`}
                  aria-pressed={editing}
                  aria-label={editing ? "Concluir edição da galeria" : "Editar galeria"}
                >
                  {editing ? <Check size={16} aria-hidden="true" /> : <Pencil size={16} aria-hidden="true" />}
                  <span>{editing ? "Concluir" : "Editar"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface/70 text-ink-soft transition-colors hover:bg-surface hover:text-ink"
                aria-label="Fechar galeria"
                title="Fechar"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              {error && (
                <p className="mb-4 rounded-2xl bg-red-500/10 px-4 py-2.5 text-center text-xs font-semibold text-red-600" role="alert">
                  {error}
                </p>
              )}

              {loading ? (
                <div className="flex flex-col items-center gap-3 py-16 text-ink-soft">
                  <Loader2 size={28} className="animate-spin" aria-hidden="true" />
                  <span className="text-sm font-semibold">Abrindo a galeria...</span>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose/10 text-rose-deep">
                    <ImageOff size={30} aria-hidden="true" />
                  </span>
                  <p className="font-display text-lg font-extrabold text-ink">A galeria está vazia</p>
                  <p className="max-w-xs text-sm text-ink-soft">
                    Desenhem algo no quadro e toque no botão de salvar para guardar aqui os desenhos de vocês.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-6">
                  <AnimatePresence initial={false}>
                  {items.map((item, index) => {
                    const author = AUTHOR_NAMES[item.savedBy] ?? "Alguém";
                    const confirming = pendingDeleteId === item.id;
                    return (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.25, delay: Math.min(index, 4) * 0.04 }}
                        className="relative"
                      >
                        <GalleryCanvas strokes={item.strokes} label={`Desenho salvo por ${author}`} />

                        {editing && (
                          <div className="absolute right-3 top-3">
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(item.id)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-red-500 shadow-[0_6px_18px_rgba(48,20,43,0.3)] transition-transform hover:scale-105 hover:bg-red-500 hover:text-white"
                              aria-label={`Apagar desenho salvo por ${author}`}
                              title="Apagar da galeria"
                            >
                              <Trash2 size={18} aria-hidden="true" />
                            </button>
                          </div>
                        )}

                        <AnimatePresence>
                          {confirming && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl2 bg-slate-950/70 p-4 text-center backdrop-blur-[2px]"
                              role="alertdialog"
                              aria-label="Confirmar exclusão do desenho"
                            >
                              <p className="font-display text-lg font-extrabold text-white">Apagar este desenho?</p>
                              <p className="text-xs text-white/80">Ele sai da galeria dos dois e não dá para desfazer.</p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteId(null)}
                                  disabled={deletingId === item.id}
                                  className="h-10 rounded-full bg-white/90 px-5 text-sm font-bold text-ink transition-colors hover:bg-white disabled:opacity-60"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteItem(item.id)}
                                  disabled={deletingId === item.id}
                                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-red-500 px-5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                                >
                                  {deletingId === item.id ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
                                  Apagar
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-soft">
                          <Heart size={12} className="text-rose-deep" fill="currentColor" aria-hidden="true" />
                          <span>Salvo por {author}</span>
                          <span aria-hidden="true">·</span>
                          <time dateTime={new Date(item.savedAt).toISOString()}>{formatSavedAt(item.savedAt)}</time>
                        </div>
                      </motion.li>
                    );
                  })}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
