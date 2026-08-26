"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Clock3, MoreVertical, RotateCcw, ImagePlus, X } from "lucide-react";
import { Player } from "@/lib/types";

interface SidePanelProps {
  roomCode?: string;
  startedAt: number;
  solved: boolean;
  solvedAt: number | null;
  moves: number;
  players: Player[];
  selfId?: string | null;
  isHost?: boolean;
  onKick?: (playerId: string) => void;
  onRestart: () => void;
  onNewImage: () => void;
  onBack: () => void;
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function SidePanel({
  roomCode,
  startedAt,
  solved,
  solvedAt,
  moves,
  players,
  selfId,
  isHost,
  onKick,
  onRestart,
  onNewImage,
  onBack,
}: SidePanelProps) {
  const [now, setNow] = useState(Date.now());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (solved) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [solved]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const elapsed = (solved && solvedAt ? solvedAt : now) - startedAt;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel pointer-events-auto flex items-center gap-3 rounded-full px-3 py-2 sm:gap-4 sm:px-4"
    >
      <button
        onClick={onBack}
        aria-label="Voltar para os jogos"
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-white/60 hover:text-ink"
      >
        <ArrowLeft size={17} />
      </button>

      <div className="hidden h-5 w-px bg-ink/10 sm:block" />

      {roomCode && (
        <span className="hidden font-display text-xs font-medium tracking-[0.15em] text-ink-soft sm:inline">
          {roomCode}
        </span>
      )}

      <div className="hidden h-5 w-px bg-ink/10 sm:block" />

      <div className="flex items-center gap-1.5 text-ink">
        <Clock3 size={14} className="text-ink-soft" />
        <span className="font-display text-sm font-semibold tabular-nums">{formatTime(elapsed)}</span>
      </div>

      <div className="flex items-center gap-1.5 text-ink">
        <span className="text-xs text-ink-soft">Movs</span>
        <span className="font-display text-sm font-semibold tabular-nums">{moves}</span>
      </div>

      <div className="flex items-center -space-x-1.5">
        {players.map((p) => {
          const canKick = Boolean(isHost && onKick && p.id !== selfId);
          return (
            <span key={p.id} className="relative inline-flex">
              <span
                title={p.name}
                className="h-3 w-3 rounded-full ring-2 ring-white"
                style={{ background: p.connected ? p.color : "#D9D0D4" }}
              />
              {canKick && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onKick!(p.id);
                  }}
                  aria-label={`Remover ${p.name} da sala`}
                  title="Remover da sala"
                  className="absolute -right-1.5 -top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-ink-soft shadow-soft transition-colors hover:bg-rose/20 hover:text-rose-deep"
                >
                  <X size={8} strokeWidth={3} />
                </button>
              )}
            </span>
          );
        })}
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Mais opções"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-white/60 hover:text-ink"
        >
          <MoreVertical size={17} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="glass-panel absolute right-0 top-11 flex w-44 flex-col gap-1 rounded-xl2 p-1.5"
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onRestart();
                }}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-white/60"
              >
                <RotateCcw size={15} /> Reiniciar
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onNewImage();
                }}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-white/60"
              >
                <ImagePlus size={15} /> Nova imagem
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
