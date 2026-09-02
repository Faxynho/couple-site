"use client";

import { motion } from "framer-motion";
import { Dices, ListChecks } from "lucide-react";

interface GameCatalogActionsProps {
  onRandom: () => void;
  onToggleSuggestion: () => void;
  suggestionOpen: boolean;
}

export default function GameCatalogActions({ onRandom, onToggleSuggestion, suggestionOpen }: GameCatalogActionsProps) {
  return (
    <div className="mt-2 grid w-full grid-cols-2 gap-2.5">
      <motion.button
        type="button"
        onClick={onRandom}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        className="catalog-action catalog-action-random flex min-w-0 items-center justify-center gap-2 rounded-xl2 border border-surface/70 bg-surface/55 px-3 py-2.5 text-xs font-semibold text-ink shadow-sm transition-colors hover:border-rose/40 hover:bg-rose/10 sm:text-sm"
      >
        <Dices size={16} className="shrink-0 text-rose-deep" />
        <span className="truncate">Jogo Aleatório</span>
      </motion.button>
      <motion.button
        type="button"
        onClick={onToggleSuggestion}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        aria-expanded={suggestionOpen}
        className={`catalog-action catalog-action-suggestion flex min-w-0 items-center justify-center gap-2 rounded-xl2 border px-3 py-2.5 text-xs font-semibold shadow-sm transition-colors sm:text-sm ${suggestionOpen ? "border-rose/50 bg-rose/10 text-ink" : "border-surface/70 bg-surface/55 text-ink hover:border-rose/40 hover:bg-rose/10"}`}
      >
        <ListChecks size={16} className="shrink-0 text-rose-deep" />
        <span className="truncate">Sugestão de Jogos</span>
      </motion.button>
    </div>
  );
}
