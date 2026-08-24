"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, RotateCw, ArrowLeft, Skull, Handshake } from "lucide-react";
import Button from "@/components/Button";
import { RPGState, RPG_CLASSES } from "@/lib/rpgTypes";

interface RPGResultModalProps {
  open: boolean;
  onClose: () => void;
  onReopen: () => void;
  onPlayAgain: () => void;
  onBackToGames: () => void;
  state: RPGState;
  namesById: Record<string, string>;
  selfId: string | null;
}

export default function RPGResultModal({
  open,
  onClose,
  onReopen,
  onPlayAgain,
  onBackToGames,
  state,
  namesById,
  selfId,
}: RPGResultModalProps) {
  const selfTeam = selfId ? state.combatants[selfId]?.team : undefined;
  const isDraw = state.winnerTeam === "draw";
  const selfWon = !isDraw && selfTeam !== undefined && state.winnerTeam === selfTeam;

  const headline = isDraw ? "Empate!" : selfWon ? "🏆 Vitória!" : "Derrota...";
  const Icon = isDraw ? Handshake : selfWon ? Trophy : Skull;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={onReopen}
            className="glass-panel fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full px-5 py-3 text-sm font-medium text-ink shadow-glow"
          >
            🏆 Ver resultado da batalha
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4 py-8 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl3 p-6"
            >
              <button
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-white/60 hover:text-ink"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>

              <div className="text-center">
                <Icon size={34} className={`mx-auto ${selfWon ? "text-amber-500" : isDraw ? "text-ink-soft" : "text-ink-soft"}`} />
                <h2 className="mt-2 font-display text-xl font-semibold text-ink">{headline}</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {state.finishReason === "roundLimit"
                    ? "⏱️ Limite de rodadas atingido — venceu quem tinha mais vida restante."
                    : `Batalha decidida na rodada ${state.round}.`}
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {state.order.map((id) => {
                  const c = state.combatants[id];
                  const def = RPG_CLASSES[c.classId];
                  const name = id === "BOT" ? "BOT" : namesById[id] ?? "Jogador";
                  const won = state.winnerTeam === c.team;
                  return (
                    <div key={id} className="rounded-xl2 bg-white/60 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
                          <span className="text-lg leading-none">{def.emoji}</span>
                          {id === selfId ? "Você" : name}
                          {!isDraw && won && <Trophy size={13} className="text-amber-500" />}
                        </span>
                        <span className="text-xs text-ink-soft">{def.name}</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-soft">
                        ❤️ {Math.max(0, c.hp)}/{c.maxHp} vida restante {!c.alive && "· derrotado"}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <Button onClick={onPlayAgain} className="w-full">
                  <RotateCw size={16} /> Jogar novamente
                </Button>
                <Button onClick={onBackToGames} variant="secondary" className="w-full">
                  <ArrowLeft size={16} /> Voltar aos modos
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
