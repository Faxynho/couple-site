"use client";

import { motion } from "framer-motion";
import Button from "@/components/Button";
import { ChessPromotion, PIECE_NAME } from "@/lib/chessTypes";

const choices: ChessPromotion[] = ["q", "r", "b", "n"];
const files: Record<ChessPromotion, string> = { q: "queen", r: "rook", b: "bishop", n: "knight" };

export default function ChessPromotionModal({ open, color, onChoose }: { open: boolean; color: "w" | "b"; onChoose: (piece: ChessPromotion) => void }) {
  if (!open) return null;
  const team = color === "w" ? "pink" : "blue";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm"><motion.section initial={{ opacity: 0, y: 14, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="glass-panel w-full max-w-sm rounded-xl3 p-6 text-center shadow-soft"><p className="text-xs font-semibold uppercase tracking-[.18em] text-ink-soft">Promoção</p><h2 className="mt-2 font-display text-2xl font-semibold text-ink">Em quem o peão se torna?</h2><div className="mt-5 grid grid-cols-4 gap-2">{choices.map((piece) => <Button key={piece} variant="secondary" onClick={() => onChoose(piece)} className="flex flex-col !rounded-xl2 !px-1 !py-2"><img src={`/images/chess/${files[piece]}_${team}.png`} alt={PIECE_NAME[piece]} className="mx-auto h-12 w-12 object-contain"/><span className="mt-1 text-[10px]">{PIECE_NAME[piece]}</span></Button>)}</div></motion.section></div>;
}
