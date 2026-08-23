"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface Player {
  id: string;
  name: string;
  color: string;
  connected: boolean;
}

interface QuizPlayersBarProps {
  players: Player[];
  scores: Record<string, number>;
  hasAnswered: Record<string, boolean>;
  selfId: string | null;
}

export default function QuizPlayersBar({ players, scores, hasAnswered, selfId }: QuizPlayersBarProps) {
  if (players.length < 2) return null;

  return (
    <div className="flex w-full max-w-[min(94vw,560px)] items-center justify-center gap-3">
      {players.map((p) => (
        <motion.div
          key={p.id}
          layout
          className="glass-panel flex flex-1 items-center justify-between gap-2 rounded-xl2 px-4 py-2.5"
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-sm font-medium text-ink">
              {p.name}
              {p.id === selfId ? " (você)" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasAnswered[p.id] && <Check size={14} className="text-sage" />}
            <span className="font-display text-sm font-semibold tabular-nums text-ink">{scores[p.id] ?? 0}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
