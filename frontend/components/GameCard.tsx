"use client";

import { motion } from "framer-motion";
import { GameDefinition } from "@/lib/types";
import Button from "./Button";

interface GameCardProps {
  game: GameDefinition;
  index: number;
  onPlay: (game: GameDefinition) => void;
  /** Texto do botão — "Jogar juntos" (padrão, usado na sala Duo) ou "Jogar sozinho" (grade Solo). */
  ctaLabel?: string;
}

export default function GameCard({ game, index, onPlay, ctaLabel = "Jogar juntos" }: GameCardProps) {
  return (
    <motion.div
      layoutId={"minigame-config-" + game.id}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6 }}
      className="game-card group relative overflow-hidden rounded-xl3 glass-panel p-5 flex flex-col gap-4"
    >
      <div
        className="relative h-40 rounded-xl2 overflow-hidden bg-beige animate-floaty"
        style={{ animationDelay: `${index * 0.3}s` }}
      >
        <img
          src={game.image}
          alt={game.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-3 right-3 text-2xl drop-shadow-sm">{game.emoji}</span>
      </div>

      <div className="flex-1">
        <h3 className="font-display text-lg font-semibold text-ink">{game.name}</h3>
        <p className="mt-1 text-sm text-ink-soft leading-relaxed">{game.description}</p>
      </div>

      {game.available ? (
        <Button onClick={() => onPlay(game)} className="w-full">
          {ctaLabel}
        </Button>
      ) : (
        <div className="w-full rounded-full bg-surface/50 py-3 text-center text-sm text-ink-soft">
          Em breve ✨
        </div>
      )}
    </motion.div>
  );
}
