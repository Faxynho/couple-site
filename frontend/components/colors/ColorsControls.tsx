"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { COLOR_DIFFICULTIES, ColorDifficulty } from "@/lib/colorTypes";
import { Player } from "@/lib/types";
import PlayerChip from "@/components/PlayerChip";
import { isPersistentDuoRoomCode } from "@/lib/persistentDuo";

interface ColorsControlsProps {
  roomCode: string;
  difficulty: string;
  mode: string;
  seerId: string | null;
  guesserId: string | null;
  currentRound: number;
  totalRounds: number;
  players: Player[];
  selfId: string | null;
  isHost?: boolean;
  onKick?: (playerId: string) => void;
  scores: Record<string, number>;
  onBack: () => void;
}

export default function ColorsControls({
  roomCode,
  difficulty,
  mode,
  seerId,
  guesserId,
  currentRound,
  totalRounds,
  players,
  selfId,
  isHost,
  onKick,
  scores,
  onBack,
}: ColorsControlsProps) {
  const difficultyLabel = COLOR_DIFFICULTIES[difficulty as ColorDifficulty]?.label ?? difficulty;
  const isCooperative = mode === "cooperative";

  function roleTag(playerId: string): string | null {
    if (!isCooperative) return null;
    if (playerId === seerId) return "👁️";
    if (playerId === guesserId) return "🎯";
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel flex w-full max-w-[min(92vw,540px)] flex-col gap-3 rounded-xl3 p-4"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface/60 hover:text-ink"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>

        <span className="font-display text-xs font-medium tracking-[0.15em] text-ink-soft">{isPersistentDuoRoomCode(roomCode) ? "Nosso lobby" : `Sala ${roomCode}`}</span>

        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-surface/60 px-3 py-1 text-xs font-medium text-ink">
            {isCooperative ? "🤝 Juntos" : "⚔️ Um contra o outro"}
          </span>
          <span className="rounded-full bg-surface/60 px-3 py-1 text-xs font-medium text-ink">{difficultyLabel}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: totalRounds }, (_, i) => (
          <span
            key={i}
            className="h-2 flex-1 rounded-full transition-colors"
            style={{ background: i < currentRound ? "#E893AA" : i === currentRound ? "#F2A6B8" : "rgba(122,108,114,0.2)" }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {players.map((p) => {
            const tag = roleTag(p.id);
            return (
              <PlayerChip
                key={p.id}
                player={p}
                isHost={isHost}
                selfId={selfId}
                onKick={onKick}
                labelOverride={p.id === selfId ? "Você" : p.name}
              >
                {tag && <span>{tag}</span>}
                {!isCooperative && (
                  <span className="font-display font-semibold tabular-nums">{(scores[p.id] ?? 0).toFixed(1)}</span>
                )}
              </PlayerChip>
            );
          })}
          {isCooperative && (
            <span className="flex items-center gap-1 rounded-full bg-rose/15 px-2.5 py-1 text-xs font-medium text-ink">
              Pontuação da dupla
              <span className="font-display font-semibold tabular-nums">
                {(scores[players[0]?.id] ?? 0).toFixed(1)}
              </span>
            </span>
          )}
        </div>
        <span className="text-xs text-ink-soft">
          Rodada {currentRound + 1}/{totalRounds}
        </span>
      </div>
    </motion.div>
  );
}
