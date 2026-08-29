"use client";

import { motion } from "framer-motion";
import AccountAvatar from "@/components/account/AccountAvatar";
import { AccountId } from "@/lib/accountSession";
import { Player } from "@/lib/types";

type Props = {
  player: Player | null;
  isBot?: boolean;
  score: number;
  local: boolean;
  photo?: string | null;
};

export default function AirHockeyScorePanel({ player, isBot = false, score, local, photo }: Props) {
  const name = isBot ? "BOT" : local ? "Você" : player?.name ?? "Adversário";
  const accent = local ? "#e8567d" : "#7657cf";
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-2xl border px-2 py-1.5 shadow-[0_6px_18px_rgba(35,16,29,.18)] sm:gap-2.5 sm:px-3 ${local ? "border-rose/35 bg-rose/10" : "border-violet-300/25 bg-violet-500/10"}`}>
      {isBot ? <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-base">🤖</span> : <AccountAvatar name={name} photo={photo} accountId={player?.accountId as AccountId | undefined} fallbackColor={player?.color} size={32} className="ring-1 ring-white/50" />}
      <div className="min-w-0 text-left">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[.12em] text-ink-soft sm:text-xs">{name}</p>
        <div className="mt-1 flex gap-1" aria-label={`${score} de 7 gols`}>
          {Array.from({ length: 7 }, (_, index) => {
            const filled = index < score;
            return <motion.span key={`${index}-${filled ? score : "empty"}`} initial={filled ? { scale: .45, opacity: .35 } : false} animate={{ scale: filled ? 1 : .82, opacity: filled ? 1 : .36 }} transition={{ type: "spring", stiffness: 460, damping: 18 }} className="h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2" style={{ backgroundColor: filled ? accent : "rgba(120,86,104,.34)", boxShadow: filled ? `0 0 7px ${accent}` : "none" }} />;
          })}
        </div>
      </div>
      <motion.strong key={score} initial={{ scale: 1 }} animate={{ scale: [1, 1.24, 1] }} transition={{ duration: .38 }} className="ml-auto font-display text-2xl font-semibold tabular-nums sm:text-3xl" style={{ color: accent }}>{score}</motion.strong>
    </div>
  );
}
