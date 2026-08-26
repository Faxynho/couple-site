"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Player } from "@/lib/types";

interface ConnectionThreadProps {
  players: Player[];
  maxPlayers: number;
  selfId: string | null;
  /** Quando informado (e o jogador atual for host), mostra um "×" para
   *  expulsar o convidado — sempre visível, para saber de cara se alguém caiu
   *  e poder tirar quem não deveria estar na sala. */
  isHost?: boolean;
  onKick?: (playerId: string) => void;
}

function Avatar({
  player,
  placeholder,
  canKick,
  onKick,
}: {
  player?: Player;
  placeholder?: boolean;
  canKick?: boolean;
  onKick?: (playerId: string) => void;
}) {
  const initial = player?.name?.trim()?.[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="flex h-16 w-16 items-center justify-center rounded-full font-display text-xl font-semibold text-white shadow-soft"
          style={{
            background: placeholder ? "rgba(255,255,255,0.5)" : player?.color,
            border: placeholder ? "2px dashed rgba(122,108,114,0.35)" : "2px solid white",
          }}
        >
          {placeholder ? "…" : initial}
        </motion.div>
        {canKick && player && onKick && (
          <button
            type="button"
            onClick={() => onKick(player.id)}
            aria-label={`Remover ${player.name} da sala`}
            title="Remover da sala"
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink-soft shadow-soft transition-colors hover:bg-rose/20 hover:text-rose-deep"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <span className="text-xs font-medium text-ink-soft max-w-[5rem] truncate">
        {placeholder ? "Aguardando" : player?.name}
      </span>
    </div>
  );
}

export default function ConnectionThread({ players, maxPlayers, selfId, isHost, onKick }: ConnectionThreadProps) {
  const slots = Array.from({ length: maxPlayers }, (_, i) => players[i]);
  const bothPresent = players.filter((p) => p.connected).length === maxPlayers;

  return (
    <div className="relative flex items-center justify-center gap-10 py-4">
      <Avatar player={slots[0]} placeholder={!slots[0]} canKick={isHost && slots[0]?.id !== selfId} onKick={onKick} />

      <svg width="96" height="24" viewBox="0 0 96 24" className="shrink-0">
        <line x1="4" y1="12" x2="92" y2="12" stroke="#E9D9E1" strokeWidth="3" strokeLinecap="round" />
        <motion.line
          x1="4"
          y1="12"
          x2="92"
          y2="12"
          stroke="url(#thread-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="10 6"
          animate={bothPresent ? { strokeDashoffset: [0, -32] } : { strokeDashoffset: 0 }}
          transition={bothPresent ? { duration: 1.4, repeat: Infinity, ease: "linear" } : undefined}
          opacity={bothPresent ? 1 : 0.35}
        />
        <defs>
          <linearGradient id="thread-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E893AA" />
            <stop offset="100%" stopColor="#8FB0DE" />
          </linearGradient>
        </defs>
      </svg>

      <Avatar player={slots[1]} placeholder={!slots[1]} canKick={isHost && slots[1]?.id !== selfId} onKick={onKick} />
    </div>
  );
}
