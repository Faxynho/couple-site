"use client";

import { useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { SudokuCell } from "@/lib/sudokuTypes";

interface Player {
  id: string;
  color: string;
}

interface SudokuBoardProps {
  cells: SudokuCell[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onSetValue: (index: number, value: number) => void;
  players: Player[];
  selfId: string | null;
  locked: boolean;
}

function cellPosition(index: number) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
  return { row, col, box };
}

/** Verifica se o valor da célula colide com outra igual na mesma linha/coluna/bloco. */
function hasConflict(cells: SudokuCell[], index: number): boolean {
  const value = cells[index].value;
  if (value === 0) return false;
  const { row, col, box } = cellPosition(index);

  for (let i = 0; i < 81; i++) {
    if (i === index || cells[i].value !== value) continue;
    const p = cellPosition(i);
    if (p.row === row || p.col === col || p.box === box) return true;
  }
  return false;
}

export default function SudokuBoard({
  cells,
  selectedIndex,
  onSelect,
  onSetValue,
  players,
  selfId,
  locked,
}: SudokuBoardProps) {
  const colorByPlayer = Object.fromEntries(players.map((p) => [p.id, p.color]));
  const selected = selectedIndex !== null ? cellPosition(selectedIndex) : null;
  const selectedValue = selectedIndex !== null ? cells[selectedIndex].value : 0;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (selectedIndex === null || locked) return;
      const cell = cells[selectedIndex];

      if (e.key >= "1" && e.key <= "9") {
        if (!cell.isGiven) onSetValue(selectedIndex, Number(e.key));
      } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        if (!cell.isGiven) onSetValue(selectedIndex, 0);
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const { row, col } = cellPosition(selectedIndex);
        let nr = row;
        let nc = col;
        if (e.key === "ArrowUp") nr = Math.max(0, row - 1);
        if (e.key === "ArrowDown") nr = Math.min(8, row + 1);
        if (e.key === "ArrowLeft") nc = Math.max(0, col - 1);
        if (e.key === "ArrowRight") nc = Math.min(8, col + 1);
        onSelect(nr * 9 + nc);
      }
    },
    [selectedIndex, locked, cells, onSetValue, onSelect]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="mx-auto grid aspect-square w-full max-w-[min(92vw,540px)] grid-cols-9 grid-rows-9 gap-0 overflow-hidden rounded-xl2 border-2 border-ink/70 bg-white shadow-soft">
      {cells.map((cell, index) => {
        const { row, col, box } = cellPosition(index);
        const isSelected = index === selectedIndex;
        const isPeer = selected ? row === selected.row || col === selected.col || box === selected.box : false;
        const isSameValue = selectedValue !== 0 && cell.value === selectedValue;
        const conflict = hasConflict(cells, index);
        const holderColor = cell.filledBy ? colorByPlayer[cell.filledBy] : undefined;
        const isOwnEntry = cell.filledBy === selfId;

        return (
          <button
            key={index}
            type="button"
            disabled={locked}
            onClick={() => onSelect(index)}
            className={[
              "relative flex items-center justify-center font-display text-[clamp(0.85rem,3.6vw,1.35rem)] font-semibold transition-colors duration-150",
              col % 3 === 0 && col !== 0 ? "border-l-2 border-l-ink/70" : "border-l border-l-ink/10",
              row % 3 === 0 && row !== 0 ? "border-t-2 border-t-ink/70" : "border-t border-t-ink/10",
              cell.isGiven ? "text-ink" : "text-rose-deep",
              conflict ? "text-red-500" : "",
            ].join(" ")}
            style={{
              background: isSelected ? "#F6D3DE" : isSameValue ? "#DFCBF0AA" : isPeer ? "#FDF6EE" : "#FFFFFF",
            }}
          >
            {cell.value !== 0 && (
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
              >
                {cell.value}
              </motion.span>
            )}
            {!cell.isGiven && holderColor && (
              <span
                className="absolute bottom-[8%] right-[10%] h-[9%] w-[9%] rounded-full ring-1 ring-white"
                style={{ background: holderColor }}
                title={isOwnEntry ? "Preenchida por você" : "Preenchida pelo seu par"}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
