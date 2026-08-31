"use client";

import { motion } from "framer-motion";
import Button from "@/components/Button";
import { ChessState } from "@/lib/chessTypes";

const reasons: Record<NonNullable<ChessState["result"]>["reason"], string> = { checkmate: "Xeque-mate", stalemate: "Afogamento", threefold: "Repetição de posição", "insufficient-material": "Material insuficiente", "fifty-move": "Regra dos 50 movimentos", draw: "Empate" };
export default function ChessResultModal({ state, selfId, onNewGame, onBack }: { state: ChessState; selfId: string; onNewGame: () => void; onBack: () => void }) {
  if (!state.result) return null;
  const win = state.result.winnerId === selfId;
  const draw = state.result.winnerId === null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm"><motion.section initial={{ opacity: 0, scale: .94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="glass-panel w-full max-w-sm rounded-xl3 p-6 text-center shadow-soft"><span className="text-4xl">{draw ? "🤝" : win ? "🏆" : "🌙"}</span><h2 className="mt-2 font-display text-2xl font-semibold text-ink">{draw ? "Empate" : win ? "Vitória!" : "Derrota"}</h2><p className="mt-1 text-sm text-ink-soft">{reasons[state.result.reason]}</p><div className="mt-5 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={onBack}>Voltar</Button><Button onClick={onNewGame}>Revanche</Button></div></motion.section></div>;
}
