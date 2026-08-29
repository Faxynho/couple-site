"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { TermoGuess } from "@/lib/termoTypes";

interface TermoBoardProps {
  guesses: TermoGuess[];
  maxAttempts: number;
  currentWord: string;
  active: boolean;
  solved: boolean;
  index: number;
  boardCount: number;
}

const CELL_STYLE = {
  correct: "border-green-600 bg-green-600 text-white",
  present: "border-amber-500 bg-amber-500 text-white",
  absent: "border-stone-500 bg-stone-500 text-white",
};

export default function TermoBoard({ guesses, maxAttempts, currentWord, active, solved, index, boardCount }: TermoBoardProps) {
  const cellSize = boardCount === 1
    ? "clamp(2.35rem, min(13vw, 6.8vh), 4rem)"
    : boardCount === 2
      ? "clamp(1.65rem, min(calc((100vw - 6rem) / 10), 6vh), 4rem)"
      : "clamp(1.35rem, min(calc((100vw - 8rem) / 10), calc((100dvh - 20rem) / 18), 5.2vh), 3.25rem)";
  const boardGap = boardCount === 4 ? "gap-[clamp(.15rem,.35vh,.35rem)]" : "gap-[clamp(.2rem,.45vh,.5rem)]";
  const letterSize = boardCount === 4 ? "text-[clamp(.62rem,2vw,.95rem)]" : "text-[clamp(.75rem,2.5vw,1.35rem)]";
  const layoutStyle = { "--termo-cell-size": cellSize } as CSSProperties;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={solved ? { opacity: 1, y: 0, scale: [1, 1.015, 1] } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      style={layoutStyle}
      className={`glass-panel w-fit min-w-0 justify-self-center rounded-xl2 p-1.5 sm:p-2 ${solved ? "ring-1 ring-sage/70" : ""}`}
      aria-label={`Tabuleiro ${index + 1}${solved ? ", concluído" : ""}`}
    >
      <div className={`grid ${boardGap}`}>
        {Array.from({ length: maxAttempts }, (_, rowIndex) => {
          const guess = guesses[rowIndex];
          const preview = active && rowIndex === guesses.length ? currentWord : "";
          return (
            <div key={rowIndex} className={`grid grid-cols-5 ${boardGap}`}>
              {Array.from({ length: 5 }, (_, letterIndex) => {
                const letter = guess?.word[letterIndex] ?? preview[letterIndex] ?? "";
                const state = guess?.letters[letterIndex];
                return (
                  <motion.div
                    key={`${rowIndex}-${letterIndex}-${guess?.word ?? "draft"}`}
                    initial={guess ? { rotateX: -90, opacity: 0.35 } : false}
                    animate={{ rotateX: 0, opacity: 1, scale: letter && !guess ? [1, 1.06, 1] : 1 }}
                    transition={guess ? { duration: 0.26, delay: letterIndex * 0.085 } : { duration: 0.14 }}
                    className={`flex h-[var(--termo-cell-size)] w-[var(--termo-cell-size)] min-w-0 items-center justify-center rounded-[clamp(.3rem,1vw,.65rem)] border-2 font-display ${letterSize} font-semibold uppercase shadow-sm transition-colors ${
                      state ? CELL_STYLE[state] : letter ? "border-rose/60 bg-surface/80 text-ink" : "border-surface/90 bg-surface/35 text-ink"
                    }`}
                  >
                    {letter}
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>
      {solved && <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-sage">Palavra encontrada</p>}
    </motion.section>
  );
}
