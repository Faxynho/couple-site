"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock3, RotateCcw, Shuffle, SlidersHorizontal } from "lucide-react";
import { SUDOKU_DIFFICULTIES, SudokuDifficulty } from "@/lib/sudokuTypes";

interface Player {
  id: string;
  name: string;
  color: string;
  connected: boolean;
}

interface SudokuControlsProps {
  roomCode: string;
  difficulty: string;
  startedAt: number;
  solved: boolean;
  solvedAt: number | null;
  moves: number;
  players: Player[];
  onNewPuzzle: (difficulty?: string) => void;
  onRestart: () => void;
  onBack: () => void;
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function SudokuControls({
  roomCode,
  difficulty,
  startedAt,
  solved,
  solvedAt,
  moves,
  players,
  onNewPuzzle,
  onRestart,
  onBack,
}: SudokuControlsProps) {
  const [now, setNow] = useState(Date.now());
  const [difficultyMenuOpen, setDifficultyMenuOpen] = useState(false);

  useEffect(() => {
    if (solved) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [solved]);

  const elapsed = (solved && solvedAt ? solvedAt : now) - startedAt;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel relative z-20 flex w-full max-w-[min(92vw,540px)] flex-col gap-3 rounded-xl3 p-4"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-white/60 hover:text-ink"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>

        <span className="font-display text-xs font-medium tracking-[0.15em] text-ink-soft">Sala {roomCode}</span>

        <div className="flex items-center gap-1.5 text-ink">
          <Clock3 size={15} className="text-ink-soft" />
          <span className="font-display text-sm font-semibold tabular-nums">{formatTime(elapsed)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {players.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 text-xs font-medium text-ink"
              style={{ opacity: p.connected ? 1 : 0.5 }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
          ))}
        </div>
        <span className="text-xs text-ink-soft">{moves} jogadas</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onNewPuzzle()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/70 px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-white"
        >
          <Shuffle size={14} /> Novo Sudoku
        </button>
        <button
          onClick={onRestart}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/70 px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-white"
        >
          <RotateCcw size={14} /> Reiniciar
        </button>
        <div className="relative flex-1">
          <button
            onClick={() => setDifficultyMenuOpen((v) => !v)}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-white/70 px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-white"
          >
            <SlidersHorizontal size={14} />
            {SUDOKU_DIFFICULTIES[difficulty as SudokuDifficulty]?.label ?? "Dificuldade"}
          </button>

          <AnimatePresence>
            {difficultyMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="glass-panel absolute right-0 top-11 z-10 flex w-40 flex-col gap-1 rounded-xl2 p-1.5"
              >
                {(Object.entries(SUDOKU_DIFFICULTIES) as [SudokuDifficulty, (typeof SUDOKU_DIFFICULTIES)[SudokuDifficulty]][]).map(
                  ([key, info]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setDifficultyMenuOpen(false);
                        onNewPuzzle(key);
                      }}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-white/60 ${
                        key === difficulty ? "font-semibold text-ink" : "text-ink-soft"
                      }`}
                    >
                      <span>{info.emoji}</span> {info.label}
                    </button>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
