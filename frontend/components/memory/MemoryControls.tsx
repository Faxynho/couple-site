"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Clock3, RotateCw, SlidersHorizontal } from "lucide-react";
import { MEMORY_DIFFICULTIES, MEMORY_MODES, MemoryDifficulty, MemoryMode, MemoryPlayerProgress } from "@/lib/memoryTypes";
import { Player } from "@/lib/types";
import PlayerChip from "@/components/PlayerChip";
import { isPersistentDuoRoomCode } from "@/lib/persistentDuo";

interface MemoryControlsProps {
  roomCode: string;
  difficulty: MemoryDifficulty;
  mode: MemoryMode;
  pairCount: number;
  previewEndsAt: number;
  deadlineAt: number | null;
  progress: Record<string, MemoryPlayerProgress>;
  players: Player[];
  selfId: string | null;
  isHost: boolean;
  onKick?: (playerId: string) => void;
  onNewGame: (difficulty?: string) => void;
  onBack: () => void;
}

function formatSeconds(ms: number) {
  return `${Math.max(0, Math.ceil(ms / 1_000))}s`;
}

export default function MemoryControls({
  roomCode,
  difficulty,
  mode,
  pairCount,
  previewEndsAt,
  deadlineAt,
  progress,
  players,
  selfId,
  isHost,
  onKick,
  onNewGame,
  onBack,
}: MemoryControlsProps) {
  const [now, setNow] = useState(Date.now());
  const [difficultyMenuOpen, setDifficultyMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  const previewing = deadlineAt === null;
  const remainingMs = previewing ? previewEndsAt - now : deadlineAt - now;
  const own = selfId ? progress[selfId] : undefined;
  const sharedScore = own?.score ?? 0;
  const combo = own?.combo ?? 0;
  const modeLabel = mode === "solo" ? "Solo" : mode === "duel" ? "Duelo" : "Juntos";
  const standings = players.map((player) => ({ player, progress: progress[player.id] })).filter((entry) => entry.progress);
  const leader = standings.reduce<{ playerId: string; pairsFound: number; score: number } | null>((current, entry) => {
    if (!current || entry.progress!.pairsFound > current.pairsFound || (entry.progress!.pairsFound === current.pairsFound && entry.progress!.score > current.score)) {
      return { playerId: entry.player.id, pairsFound: entry.progress!.pairsFound, score: entry.progress!.score };
    }
    return current;
  }, null);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel relative z-20 flex w-full max-w-[min(94vw,620px)] flex-col gap-3 rounded-xl3 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-surface/60 hover:text-ink" aria-label="Voltar">
          <ArrowLeft size={18} />
        </button>
        <span className="font-display text-xs font-medium tracking-[0.15em] text-ink-soft">{mode === "solo" ? "Modo solo" : isPersistentDuoRoomCode(roomCode) ? "Nosso lobby" : `Sala ${roomCode}`}</span>
        <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-ink">
          <Clock3 size={15} className="text-ink-soft" />
          {formatSeconds(remainingMs)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {mode !== "solo" && players.map((player) => <PlayerChip key={player.id} player={player} selfId={selfId} isHost={isHost} onKick={onKick} />)}
          <span className="rounded-full bg-surface/60 px-3 py-1 text-xs font-medium text-ink">
            {previewing ? "Memorize as posições" : `${modeLabel} · ${sharedScore} pts`}
          </span>
          {combo > 0 && (
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: combo >= 4 ? [1, 1.04, 1] : 1, opacity: 1 }}
              transition={{ duration: combo >= 4 ? 0.7 : 0.25 }}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${combo >= 4 ? "bg-amber-400/25 text-amber-700 dark:text-amber-200" : combo >= 2 ? "bg-orange-400/20 text-orange-700 dark:text-orange-200" : "bg-surface/60 text-ink-soft"}`}
            >
              🔥 Combo x{combo}
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!previewing && own && <span className="text-xs text-ink-soft">{own.pairsFound} pares encontrados</span>}
          <span className="flex items-center gap-1 text-xs text-ink-soft">
            {MEMORY_MODES[mode].emoji} {MEMORY_MODES[mode].label}
          </span>
        </div>
      </div>

      {mode === "duel" && standings.length > 1 && (
        <div className="grid grid-cols-2 gap-1.5 rounded-xl2 bg-surface/45 p-1.5">
          {standings.map(({ player, progress: playerProgress }) => {
            const isLeader = Boolean(leader && player.id === leader.playerId);
            return (
              <div key={player.id} className={`min-w-0 rounded-lg px-2.5 py-2 ${isLeader ? "bg-rose/10" : "bg-surface/35"}`}>
                <div className="flex items-center justify-between gap-1 text-xs">
                  <span className="truncate font-medium text-ink">{player.name}</span>
                  {playerProgress?.finished && <span className="text-[10px] text-sage">Concluído</span>}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-1 text-[11px] text-ink-soft">
                  <span>{playerProgress?.pairsFound ?? 0}/{pairCount} pares</span>
                  <span>{playerProgress?.score ?? 0} pts</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => onNewGame()} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface/70 px-3 py-2 text-xs font-medium text-ink hover:bg-surface">
          <RotateCw size={14} /> Nova partida
        </button>
        <div className="relative flex-1">
          <button onClick={() => setDifficultyMenuOpen((value) => !value)} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-surface/70 px-3 py-2 text-xs font-medium text-ink hover:bg-surface">
            <SlidersHorizontal size={14} /> {MEMORY_DIFFICULTIES[difficulty].label}
          </button>
          <AnimatePresence>
            {difficultyMenuOpen && (
              <motion.div initial={{ opacity: 0, scale: 0.92, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: -6 }} className="glass-panel absolute right-0 top-11 z-20 flex w-52 flex-col gap-1 rounded-xl2 p-1.5">
                {(Object.entries(MEMORY_DIFFICULTIES) as [MemoryDifficulty, (typeof MEMORY_DIFFICULTIES)[MemoryDifficulty]][]).map(([key, info]) => (
                  <button key={key} onClick={() => { setDifficultyMenuOpen(false); onNewGame(key); }} className={`rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface/60 ${key === difficulty ? "font-semibold text-ink" : "text-ink-soft"}`}>
                    <span>{info.emoji}</span> {info.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
