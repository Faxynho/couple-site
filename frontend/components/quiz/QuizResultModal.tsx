"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Target, Clock3, RotateCw, ArrowLeft, Users } from "lucide-react";
import Button from "@/components/Button";
import { QuizMode, QuizState, computeQuizStats, computeTeamQuizStats } from "@/lib/quizTypes";

interface Player {
  id: string;
  name: string;
  color: string;
}

interface QuizResultModalProps {
  open: boolean;
  onClose: () => void;
  onReopen: () => void;
  onPlayAgain: () => void;
  onBackToGames: () => void;
  state: QuizState;
  players: Player[];
  selfId: string | null;
  mode: QuizMode;
}

function formatTime(ms: number | null) {
  if (ms === null) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function QuizResultModal({
  open,
  onClose,
  onReopen,
  onPlayAgain,
  onBackToGames,
  state,
  players,
  selfId,
  mode,
}: QuizResultModalProps) {
  const totalQuestions = state.questions.length;
  const isTogether = mode === "together";

  const rows = players.map((p) => ({
    player: p,
    stats: computeQuizStats(state, p.id),
  }));
  const teamStats = isTogether ? computeTeamQuizStats(state) : null;

  const winner =
    mode === "duel" && rows.length === 2
      ? rows[0].stats.score === rows[1].stats.score
        ? null
        : rows.reduce((a, b) => (a.stats.score > b.stats.score ? a : b))
      : null;
  const isDraw = mode === "duel" && rows.length === 2 && rows[0].stats.score === rows[1].stats.score;

  return (
    <>
      <AnimatePresence>
        {!open && state.finished && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={onReopen}
            className="glass-panel fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full px-5 py-3 text-sm font-medium text-ink shadow-glow"
          >
            🏆 Ver resultado final
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-ink/30 px-4 py-8 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel relative w-full max-w-md rounded-xl3 p-6 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-surface/60 hover:text-ink"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>

              <div className="text-center">
                <span className="text-3xl">{mode === "duel" ? "⚔️" : mode === "together" ? "🤝" : "🎉"}</span>
                <h2 className="mt-2 font-display text-xl font-semibold text-ink">
                  {mode === "duel" ? (isDraw ? "Empate!" : `${winner?.player.name} venceu!`) : "Quiz concluído!"}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">{totalQuestions} perguntas respondidas</p>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {isTogether && teamStats && (
                  <div className="rounded-xl2 bg-surface/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-display text-base font-semibold text-ink">
                        <Users size={16} className="text-ink-soft" />
                        Vocês dois
                      </span>
                      <span className="font-display text-lg font-bold tabular-nums text-ink">
                        {teamStats.score} pts
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-ink-soft">
                      <div>
                        <p className="font-display text-sm font-semibold text-ink">{teamStats.correct}</p>
                        <p>Acertos</p>
                      </div>
                      <div>
                        <p className="font-display text-sm font-semibold text-ink">{teamStats.wrong}</p>
                        <p>Erros</p>
                      </div>
                      <div>
                        <p className="font-display text-sm font-semibold text-ink">{teamStats.unanswered}</p>
                        <p>Não confirmadas</p>
                      </div>
                    </div>

                    {teamStats.bestCategory && (
                      <div className="mt-3 flex items-center justify-center gap-1 text-xs text-ink-soft">
                        <Target size={13} /> Melhor tema: {teamStats.bestCategory}
                      </div>
                    )}
                  </div>
                )}

                {!isTogether &&
                  rows.map(({ player, stats }) => (
                    <div key={player.id} className="rounded-xl2 bg-surface/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-display text-base font-semibold text-ink">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: player.color }} />
                          {player.name}
                          {player.id === selfId ? " (você)" : ""}
                          {winner?.player.id === player.id && <Trophy size={15} className="text-rose-deep" />}
                        </span>
                        <span className="font-display text-lg font-bold tabular-nums text-ink">{stats.score} pts</span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-ink-soft">
                        <div>
                          <p className="font-display text-sm font-semibold text-ink">{stats.correct}</p>
                          <p>Acertos</p>
                        </div>
                        <div>
                          <p className="font-display text-sm font-semibold text-ink">{stats.wrong}</p>
                          <p>Erros</p>
                        </div>
                        <div>
                          <p className="font-display text-sm font-semibold text-ink">{stats.unanswered}</p>
                          <p>Sem resposta</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-ink-soft">
                        <span className="flex items-center gap-1">
                          <Clock3 size={13} /> Tempo médio: {formatTime(stats.avgTimeMs)}
                        </span>
                        {stats.bestCategory && (
                          <span className="flex items-center gap-1">
                            <Target size={13} /> {stats.bestCategory}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                {mode === "duel" && rows.length === 2 && (
                  <p className="text-center text-xs text-ink-soft">
                    Diferença de pontos: {Math.abs(rows[0].stats.score - rows[1].stats.score)}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <Button onClick={onPlayAgain} className="w-full">
                  <RotateCw size={16} /> Jogar novamente
                </Button>
                <Button onClick={onBackToGames} variant="secondary" className="w-full">
                  <ArrowLeft size={16} /> Voltar aos jogos
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
