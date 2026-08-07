"use client";

import { motion } from "framer-motion";
import { Eraser } from "lucide-react";
import { SudokuCell } from "@/lib/sudokuTypes";

interface SudokuNumberPadProps {
  cells: SudokuCell[];
  selectedIndex: number | null;
  onPick: (value: number) => void;
  disabled: boolean;
}

export default function SudokuNumberPad({ cells, selectedIndex, onPick, disabled }: SudokuNumberPadProps) {
  const counts = new Array(10).fill(0);
  for (const cell of cells) counts[cell.value]++;

  const selectedCell = selectedIndex !== null ? cells[selectedIndex] : null;
  const canType = !disabled && selectedCell !== null && !selectedCell.isGiven;

  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => {
        const remaining = 9 - counts[digit];
        const complete = remaining <= 0;
        return (
          <motion.button
            key={digit}
            type="button"
            disabled={!canType || complete}
            whileTap={canType && !complete ? { scale: 0.9 } : undefined}
            onClick={() => onPick(digit)}
            className={`relative flex aspect-square items-center justify-center rounded-xl2 font-display text-xl font-bold shadow-soft transition-colors sm:text-2xl ${
              complete
                ? "cursor-default bg-white/40 text-ink-soft/40"
                : canType
                ? "bg-white/85 text-ink hover:bg-white"
                : "bg-white/50 text-ink-soft/60"
            }`}
          >
            {digit}
          </motion.button>
        );
      })}
      <motion.button
        type="button"
        disabled={!canType}
        whileTap={canType ? { scale: 0.9 } : undefined}
        onClick={() => onPick(0)}
        className={`col-span-5 flex aspect-square items-center justify-center gap-2 rounded-xl2 shadow-soft transition-colors sm:col-span-1 sm:aspect-auto ${
          canType ? "bg-white/85 text-ink hover:bg-white" : "bg-white/50 text-ink-soft/60"
        }`}
        aria-label="Apagar"
      >
        <Eraser size={20} />
      </motion.button>
    </div>
  );
}
