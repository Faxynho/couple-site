"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trophy, X } from "lucide-react";
import Button from "@/components/Button";
import Confetti from "@/components/Confetti";
import { MemoryMode, MemoryResultEntry } from "@/lib/memoryTypes";
import { Player } from "@/lib/types";

interface MemoryResultModalProps {
  visible: boolean;
  mode: MemoryMode;
  results: MemoryResultEntry[];
  players: Player[];
  selfId: string | null;
  onClose: () => void;
  onNewGame: () => void;
  onBack: () => void;
}

function playerName(players: Player[], id: string) {
  return players.find((player) => player.id === id)?.name ?? "Jogador";
}

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1_000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function MemoryResultModal({ visible, mode, results, players, selfId, onClose, onNewGame, onBack }: MemoryResultModalProps) {
  const first = results[0];
  const own = results.find((result) => result.playerId === selfId) ?? first;
  const isDuel = mode === "duel";
  const title = isDuel ? "Duelo encerrado!" : own?.completed ? "Memória afiada!" : "Tempo esgotado";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          {own?.completed && <Confetti />}
          <motion.div className="glass-panel relative w-full max-w-sm rounded-xl3 p-7 text-center" initial={{ opacity: 0, scale: 0.88, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }} onClick={(event) => event.stopPropagation()}>
            <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-surface/60 hover:text-ink"><X size={18} /></button>
            <span className="text-3xl">{isDuel ? "⚔️" : mode === "together" ? "🤝" : "🎉"}</span>
            <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-ink-soft">Pontuação baseada no ritmo de cada par encontrado.</p>

            {isDuel ? (
              <div className="mt-6 flex flex-col gap-2">
                {results.map((result) => (
                  <div key={result.playerId} className={`flex items-center justify-between rounded-xl2 px-4 py-3 ${result.place === 1 ? "bg-rose/15" : "bg-surface/60"}`}>
                    <div className="flex items-center gap-2 text-left">
                      {result.place === 1 && <Trophy size={16} className="text-rose" />}
                      <span className="text-sm font-medium text-ink">{result.place}º — {result.playerId === selfId ? "Você" : playerName(players, result.playerId)}</span>
                    </div>
                    <div className="text-right"><p className="font-display text-sm font-semibold text-ink">{result.score} pts</p><p className="text-[10px] text-ink-soft">{result.pairsFound} pares · {formatTime(result.timeUsedMs)}</p></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-3 gap-2">
                <div className="rounded-xl2 bg-surface/60 py-3"><p className="text-[11px] text-ink-soft">Pontos</p><p className="font-display text-lg font-semibold text-ink">{own?.score ?? 0}</p></div>
                <div className="rounded-xl2 bg-surface/60 py-3"><p className="text-[11px] text-ink-soft">Pares</p><p className="font-display text-lg font-semibold text-ink">{own?.pairsFound ?? 0}</p></div>
                <div className="rounded-xl2 bg-surface/60 py-3"><p className="text-[11px] text-ink-soft">Tempo</p><p className="font-display text-lg font-semibold text-ink">{own ? formatTime(own.timeUsedMs) : "--:--"}</p></div>
              </div>
            )}

            <div className="mt-7 flex flex-col gap-2"><Button onClick={onClose} className="w-full">Continuar visualizando</Button><Button onClick={onNewGame} variant="secondary" className="w-full">Jogar de novo</Button><Button onClick={onBack} variant="ghost" className="w-full">Voltar para os jogos</Button></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
