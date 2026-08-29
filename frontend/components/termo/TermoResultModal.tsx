"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trophy, X } from "lucide-react";
import Button from "@/components/Button";
import Confetti from "@/components/Confetti";
import { TermoMode, TermoResultEntry, TermoVariant } from "@/lib/termoTypes";
import { Player } from "@/lib/types";

interface Props {
  open: boolean;
  mode: TermoMode;
  variant: TermoVariant;
  results: TermoResultEntry[];
  solutions: string[];
  players: Player[];
  selfId: string;
  onClose: () => void;
  onNewGame: () => void;
  onBack: () => void;
}

function time(ms: number) { const seconds = Math.floor(Math.max(0, ms) / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function name(players: Player[], id: string, selfId: string) { return id === selfId ? "Você" : players.find((player) => player.id === id)?.name ?? "Jogador"; }

export default function TermoResultModal({ open, mode, variant, results, solutions, players, selfId, onClose, onNewGame, onBack }: Props) {
  const own = results.find((result) => result.playerId === selfId);
  const title = mode === "duel" ? own?.outcome === "win" ? "Vitória no duelo!" : own?.outcome === "draw" ? "Duelo empatado" : "Duelo encerrado" : own?.completed ? "Palavras encontradas!" : "Tentativas encerradas";
  return <AnimatePresence>{open && (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      {own?.outcome === "win" || (mode === "solo" && own?.completed) ? <Confetti /> : null}
      <motion.div className="glass-panel relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl3 p-6 text-center" initial={{ opacity: 0, scale: .9, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .94 }} onClick={(event) => event.stopPropagation()}>
        <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 rounded-full p-2 text-ink-soft hover:bg-surface/60"><X size={18} /></button>
        <span className="text-3xl">{mode === "duel" ? "⚔️" : own?.completed ? "✨" : "🌙"}</span>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-ink-soft">{variant === "one" ? "1 palavra" : variant === "dueto" ? "2 palavras" : "4 palavras"} · {own?.solvedCount ?? 0}/{solutions.length} encontradas</p>
        {mode === "duel" && <div className="mt-5 space-y-2">{results.map((result) => <div key={result.playerId} className={`flex items-center justify-between rounded-xl2 px-4 py-3 ${result.outcome === "win" ? "bg-rose/15" : "bg-surface/60"}`}><span className="flex items-center gap-2 text-sm font-medium text-ink">{result.outcome === "win" && <Trophy size={15} className="text-rose" />}{name(players, result.playerId, selfId)}</span><span className="text-right text-xs text-ink-soft">{result.solvedCount}/{solutions.length} · {result.attemptsUsed} tent. · {time(result.timeUsedMs)}</span></div>)}</div>}
        {mode === "solo" && <div className="mt-5 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl2 bg-surface/60 p-3"><p className="text-[10px] text-ink-soft">Tentativas</p><p className="font-display text-lg text-ink">{own?.attemptsUsed ?? 0}</p></div><div className="rounded-xl2 bg-surface/60 p-3"><p className="text-[10px] text-ink-soft">Tempo</p><p className="font-display text-lg text-ink">{own ? time(own.timeUsedMs) : "--:--"}</p></div></div>}
        <div className="mt-5 rounded-xl2 bg-surface/60 p-3 text-left"><p className="text-xs font-semibold text-ink">Soluções</p><div className="mt-2 flex flex-wrap gap-1.5">{solutions.map((solution) => <span key={solution} className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink">{solution}</span>)}</div></div>
        <div className="mt-6 flex flex-col gap-2"><Button className="w-full" onClick={onNewGame}>{mode === "duel" ? "Revanche" : "Jogar novamente"}</Button><Button className="w-full" variant="ghost" onClick={onBack}>Voltar para os jogos</Button></div>
      </motion.div>
    </motion.div>
  )}</AnimatePresence>;
}
