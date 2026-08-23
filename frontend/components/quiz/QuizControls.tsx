"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock3, RotateCw, SlidersHorizontal } from "lucide-react";
import { QUIZ_DIFFICULTIES, QUIZ_MODES, QuizDifficulty, QuizMode, QuizPhase } from "@/lib/quizTypes";

interface Player {
  id: string;
  name: string;
  color: string;
  connected: boolean;
}

interface QuizControlsProps {
  roomCode: string;
  difficulty: QuizDifficulty;
  mode: QuizMode;
  questionIndex: number;
  totalQuestions: number;
  phase: QuizPhase;
  questionStartedAt: number;
  timeLimitMs: number;
  players: Player[];
  onNewGame: (difficulty?: string) => void;
  onBack: () => void;
}

export default function QuizControls({
  roomCode,
  difficulty,
  mode,
  questionIndex,
  totalQuestions,
  phase,
  questionStartedAt,
  timeLimitMs,
  players,
  onNewGame,
  onBack,
}: QuizControlsProps) {
  const [now, setNow] = useState(Date.now());
  const [difficultyMenuOpen, setDifficultyMenuOpen] = useState(false);

  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(interval);
  }, [phase, questionStartedAt]);

  const remainingMs = phase === "active" ? Math.max(0, timeLimitMs - (now - questionStartedAt)) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progress = phase === "active" ? remainingMs / timeLimitMs : 0;
  const urgent = phase === "active" && remainingSeconds <= 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel flex w-full max-w-[min(94vw,560px)] flex-col gap-3 rounded-xl3 p-4"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-white/60 hover:text-ink"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>

        <span className="font-display text-xs font-medium tracking-[0.15em] text-ink-soft">
          {mode === "solo" ? "Modo solo" : `Sala ${roomCode}`}
        </span>

        <div className={`flex items-center gap-1.5 ${urgent ? "text-rose-deep" : "text-ink"}`}>
          <Clock3 size={15} className={urgent ? "text-rose-deep" : "text-ink-soft"} />
          <span className="font-display text-sm font-semibold tabular-nums">
            {phase === "active" ? `${remainingSeconds}s` : "—"}
          </span>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/60">
        <motion.div
          className={`h-full rounded-full ${urgent ? "bg-rose-deep" : "bg-rose"}`}
          animate={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
          transition={{ ease: "linear", duration: 0.15 }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mode !== "solo" &&
            players.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 text-xs font-medium text-ink"
                style={{ opacity: p.connected ? 1 : 0.5 }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                {p.name}
              </span>
            ))}
          <span className="text-xs text-ink-soft">
            Pergunta {questionIndex + 1}/{totalQuestions}
          </span>
        </div>
        <span className="flex items-center gap-1 text-xs text-ink-soft">
          {QUIZ_MODES[mode].emoji} {QUIZ_MODES[mode].label}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onNewGame()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/70 px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-white"
        >
          <RotateCw size={14} /> Novo quiz
        </button>
        <div className="relative flex-1">
          <button
            onClick={() => setDifficultyMenuOpen((v) => !v)}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-white/70 px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-white"
          >
            <SlidersHorizontal size={14} />
            {QUIZ_DIFFICULTIES[difficulty]?.label ?? "Dificuldade"}
          </button>

          <AnimatePresence>
            {difficultyMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="glass-panel absolute right-0 top-11 z-10 flex w-48 flex-col gap-1 rounded-xl2 p-1.5"
              >
                {(Object.entries(QUIZ_DIFFICULTIES) as [QuizDifficulty, (typeof QUIZ_DIFFICULTIES)[QuizDifficulty]][]).map(
                  ([key, info]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setDifficultyMenuOpen(false);
                        onNewGame(key);
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
