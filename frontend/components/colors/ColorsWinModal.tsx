"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Confetti from "../Confetti";
import Button from "../Button";
import { Player } from "@/lib/types";

interface ColorsWinModalProps {
  visible: boolean;
  players: Player[];
  selfId: string | null;
  scores: Record<string, number>;
  maxScore: number;
  difficultyLabel: string;
  mode?: "competitive" | "cooperative";
  onNewGame: () => void;
  onBack: () => void;
  onClose: () => void;
}

function feedbackFor(score: number, maxScore: number) {
  const pct = score / maxScore;
  if (pct >= 0.85) return "Olho de artista! 🎯";
  if (pct >= 0.65) return "Muito bom senso de cor!";
  if (pct >= 0.4) return "Nada mal!";
  return "As cores pregaram peças em vocês 😄";
}

export default function ColorsWinModal({
  visible,
  players,
  selfId,
  scores,
  maxScore,
  difficultyLabel,
  mode = "competitive",
  onNewGame,
  onBack,
  onClose,
}: ColorsWinModalProps) {
  const isCooperative = mode === "cooperative";
  const ranked = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  const isMultiplayer = players.length > 1 && !isCooperative;
  const topScore = ranked[0] ? scores[ranked[0].id] ?? 0 : 0;
  const isTie = isMultiplayer && ranked.length > 1 && (scores[ranked[1].id] ?? 0) === topScore;
  const sharedScore = scores[players[0]?.id] ?? 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <Confetti />
          <motion.div
            className="glass-panel relative w-full max-w-sm rounded-xl3 p-8 text-center"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-white/60 hover:text-ink"
            >
              <X size={18} />
            </button>

            <div className="mx-auto mb-3 text-5xl animate-pop-in">{isCooperative ? "🤝" : "🎨"}</div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              {isCooperative
                ? "Boa dupla!"
                : isMultiplayer
                  ? isTie
                    ? "Empate de olho afiado!"
                    : `${ranked[0].name} venceu esta rodada!`
                  : "Resultado final"}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">Dificuldade {difficultyLabel} — 5 rodadas concluídas.</p>

            {isCooperative ? (
              <div className="mt-6 rounded-xl2 border border-rose bg-rose/10 px-4 py-5">
                <p className="text-xs uppercase tracking-wide text-ink-soft">Pontuação da dupla</p>
                <p className="font-display text-4xl font-semibold text-ink tabular-nums">
                  {sharedScore.toFixed(1)}
                  <span className="text-base font-normal text-ink-soft">/{maxScore}</span>
                </p>
                <p className="mt-1 text-xs text-ink-soft">{feedbackFor(sharedScore, maxScore)}</p>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-2.5">
                {ranked.map((player, i) => {
                  const score = scores[player.id] ?? 0;
                  const isSelf = player.id === selfId;
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 rounded-xl2 border px-4 py-3 ${
                        isMultiplayer && i === 0 ? "border-rose bg-rose/10" : "border-white/70 bg-white/60"
                      }`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: player.color }} />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-ink">{isSelf ? "Você" : player.name}</p>
                        <p className="text-[11px] text-ink-soft">{feedbackFor(score, maxScore)}</p>
                      </div>
                      <p className="font-display text-xl font-semibold text-ink tabular-nums">
                        {score.toFixed(1)}
                        <span className="text-xs font-normal text-ink-soft">/{maxScore}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-7 flex flex-col gap-2">
              <Button onClick={onClose} className="w-full">
                Continuar visualizando
              </Button>
              <Button onClick={onNewGame} variant="secondary" className="w-full">
                Jogar de novo
              </Button>
              <Button onClick={onBack} variant="ghost" className="w-full">
                Voltar para os jogos
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
