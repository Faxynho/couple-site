"use client";

import { motion } from "framer-motion";
import Button from "@/components/Button";
import { AirHockeyMode, AirHockeyResult } from "@/lib/airHockeyTypes";
import { Player } from "@/lib/types";

export default function AirHockeyResultModal({ open, results, players, selfId, mode, onNewGame, onBack }: { open: boolean; results: AirHockeyResult[]; players: Player[]; selfId: string; mode: AirHockeyMode; onNewGame: () => void; onBack: () => void }) {
  if (!open) return null;
  const own = results.find((result) => result.playerId === selfId);
  const title = mode === "solo" ? (own?.score ?? 0) > (own?.conceded ?? 0) ? "Você venceu!" : "O BOT venceu" : own?.outcome === "win" ? "Você venceu!" : own?.outcome === "draw" ? "Empate!" : "Seu rival venceu";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm"><motion.section initial={{ opacity: 0, scale: .94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="glass-panel w-full max-w-sm rounded-xl3 p-6 text-center shadow-soft"><span className="text-4xl">🏒</span><h2 className="mt-2 font-display text-2xl font-semibold text-ink">{title}</h2><p className="mt-1 text-sm text-ink-soft">Primeiro a 7 gols.</p><div className="mt-5 space-y-2 rounded-xl2 bg-surface/60 p-3 text-left">{results.map((result) => { const player=players.find((item)=>item.id===result.playerId); return <div key={result.playerId} className="flex items-center justify-between text-sm"><span className="font-medium text-ink">{result.playerId === "BOT" ? "🤖 BOT" : result.playerId === selfId ? "Você" : player?.name ?? "Adversário"}</span><span className="font-semibold tabular-nums text-ink">{result.score} <span className="text-ink-soft">×</span> {result.conceded}</span></div>; })}</div><div className="mt-5 grid grid-cols-2 gap-2"><Button onClick={onBack} variant="secondary">Voltar</Button><Button onClick={onNewGame}>Revanche</Button></div></motion.section></div>;
}
