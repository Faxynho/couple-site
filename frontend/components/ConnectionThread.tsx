"use client";

import { motion } from "framer-motion";
import { Player } from "@/lib/types";

interface ConnectionThreadProps {
  players: Player[];
  maxPlayers: number;
  selfId: string | null;
}

function Avatar({ player, placeholder }: { player?: Player; placeholder?: boolean }) {
  const initial = player?.name?.trim()?.[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex flex-col items-center gap-2">
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
      <span className="text-xs font-medium text-ink-soft max-w-[5rem] truncate">
        {placeholder ? "Aguardando" : player?.name}
      </span>
    </div>
  );
}

export default function ConnectionThread({ players, maxPlayers }: ConnectionThreadProps) {
  const slots = Array.from({ length: maxPlayers }, (_, i) => players[i]);
  const bothPresent = players.filter((p) => p.connected).length === maxPlayers;

  return (
    <div className="relative flex items-center justify-center gap-10 py-4">
      <Avatar player={slots[0]} placeholder={!slots[0]} />

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

      <Avatar player={slots[1]} placeholder={!slots[1]} />
    </div>
  );
}
