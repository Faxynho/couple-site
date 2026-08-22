"use client";

import { useCallback, useMemo, useState } from "react";
import { WordSearchWordEntry } from "@/lib/wordsearchTypes";

interface Pos {
  row: number;
  col: number;
}

interface WordSearchGridProps {
  size: number;
  letters: string[];
  words: WordSearchWordEntry[];
  onSubmitSelection: (startRow: number, startCol: number, endRow: number, endCol: number) => void;
  locked: boolean;
}

/** Projeta o ponto atual na direção reta mais próxima (das 8 possíveis) a
 *  partir do início do arrasto — permite arrastar "livre" com o dedo/mouse
 *  e ainda assim selecionar sempre uma linha reta. */
function snapToLine(start: Pos, current: Pos): Pos {
  const dRow = current.row - start.row;
  const dCol = current.col - start.col;
  if (dRow === 0 && dCol === 0) return start;
  const angle = Math.atan2(dRow, dCol);
  const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  const dr = Math.round(Math.sin(snapped));
  const dc = Math.round(Math.cos(snapped));
  const length = Math.max(Math.abs(dRow), Math.abs(dCol));
  return { row: start.row + dr * length, col: start.col + dc * length };
}

export default function WordSearchGrid({ size, letters, words, onSubmitSelection, locked }: WordSearchGridProps) {
  const [start, setStart] = useState<Pos | null>(null);
  const [current, setCurrent] = useState<Pos | null>(null);

  const foundCellMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const w of words) {
      if (!w.cells) continue;
      for (const c of w.cells) map.set(c.row * size + c.col, true);
    }
    return map;
  }, [words, size]);

  const selectedLine = useMemo(() => {
    if (!start || !current) return null;
    const end = snapToLine(start, current);
    const dRow = end.row - start.row;
    const dCol = end.col - start.col;
    const isStraight = dRow === 0 || dCol === 0 || Math.abs(dRow) === Math.abs(dCol);
    if (!isStraight) return null;
    const length = Math.max(Math.abs(dRow), Math.abs(dCol)) + 1;
    const dr = Math.sign(dRow);
    const dc = Math.sign(dCol);
    const cells: Pos[] = [];
    for (let i = 0; i < length; i++) {
      const r = start.row + dr * i;
      const c = start.col + dc * i;
      if (r < 0 || r >= size || c < 0 || c >= size) break;
      cells.push({ row: r, col: c });
    }
    return { end, cells };
  }, [start, current, size]);

  const selectedSet = useMemo(() => {
    const set = new Set<number>();
    selectedLine?.cells.forEach((c) => set.add(c.row * size + c.col));
    return set;
  }, [selectedLine, size]);

  const cellFromPoint = useCallback(
    (clientX: number, clientY: number): Pos | null => {
      const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const target = el?.closest("[data-row][data-col]") as HTMLElement | null;
      if (!target) return null;
      const row = Number(target.dataset.row);
      const col = Number(target.dataset.col);
      if (Number.isNaN(row) || Number.isNaN(col)) return null;
      return { row, col };
    },
    []
  );

  const handlePointerDown = (row: number, col: number) => (e: React.PointerEvent) => {
    if (locked) return;
    e.preventDefault();
    setStart({ row, col });
    setCurrent({ row, col });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!start || locked) return;
    const pos = cellFromPoint(e.clientX, e.clientY);
    if (pos) setCurrent(pos);
  };

  const finishDrag = useCallback(() => {
    if (start && selectedLine && selectedLine.cells.length >= 2) {
      onSubmitSelection(start.row, start.col, selectedLine.end.row, selectedLine.end.col);
    }
    setStart(null);
    setCurrent(null);
  }, [start, selectedLine, onSubmitSelection]);

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerLeave={() => start && finishDrag()}
      className="glass-panel w-full max-w-[min(94vw,520px)] touch-none select-none rounded-xl2 p-3"
    >
      <div
        className="mx-auto grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))`, maxWidth: `${Math.min(size * 38, 480)}px` }}
      >
        {letters.map((letter, idx) => {
          const row = Math.floor(idx / size);
          const col = idx % size;
          const isFound = foundCellMap.has(idx);
          const isSelected = selectedSet.has(idx);
          return (
            <button
              key={idx}
              type="button"
              data-row={row}
              data-col={col}
              onPointerDown={handlePointerDown(row, col)}
              disabled={locked}
              className={`aspect-square touch-none rounded-[3px] border text-center font-display text-xs font-semibold uppercase transition-colors sm:text-sm ${
                isSelected
                  ? "border-rose bg-rose/30 text-ink"
                  : isFound
                  ? "border-sage/60 bg-sage/25 text-ink"
                  : "border-white/70 bg-white/85 text-ink"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
