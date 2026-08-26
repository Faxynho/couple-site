"use client";

import { useCallback, useMemo, useState } from "react";
import { WordSearchWordEntry } from "@/lib/wordsearchTypes";

interface Pos {
  row: number;
  col: number;
}

interface Player {
  id: string;
  color: string;
}

interface WordSearchGridProps {
  size: number;
  letters: string[];
  words: WordSearchWordEntry[];
  players: Player[];
  selfId: string | null;
  onSubmitSelection: (startRow: number, startCol: number, endRow: number, endCol: number) => void;
  locked: boolean;
}

/** Projeta o ponto atual na direção reta mais próxima (das 8 possíveis). */
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

export default function WordSearchGrid({
  size,
  letters,
  words,
  players,
  selfId,
  onSubmitSelection,
  locked,
}: WordSearchGridProps) {
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

  const foundLines = useMemo(() => {
    // No modo duelo, o servidor só envia `cells` para a palavra encontrada
    // pelo próprio jogador. Portanto, se uma palavra foi encontrada apenas
    // pelo oponente, ela terá foundBy, mas não terá cells e nenhuma linha será
    // desenhada nesta grade.
    return words.filter((w) => w.cells && w.cells.length >= 2 && w.foundBy?.length);
  }, [words]);

  const playerColor = useCallback(
    (id: string) => players.find((p) => p.id === id)?.color ?? "#E88AA5",
    [players]
  );

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

  const cellFromPoint = useCallback((clientX: number, clientY: number): Pos | null => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const target = el?.closest("[data-row][data-col]") as HTMLElement | null;
    if (!target) return null;
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    if (Number.isNaN(row) || Number.isNaN(col)) return null;
    return { row, col };
  }, []);

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
        className="relative mx-auto grid gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0,1fr))`,
          maxWidth: `${Math.min(size * 38, 480)}px`,
        }}
      >
        {/* Linhas permanentes das palavras encontradas. Ficam atrás das letras,
            são finas e atravessam o centro das células sem esconder o texto. */}
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {foundLines.map((word) => {
            const first = word.cells![0];
            const last = word.cells![word.cells!.length - 1];
            const x1 = ((first.col + 0.5) / size) * 100;
            const y1 = ((first.row + 0.5) / size) * 100;
            const x2 = ((last.col + 0.5) / size) * 100;
            const y2 = ((last.row + 0.5) / size) * 100;

            // Em Juntos, foundBy contém quem encontrou a palavra e a mesma
            // marcação é compartilhada pelos dois. Se ambos encontrarem,
            // mostramos as duas linhas, levemente deslocadas.
            const foundBy = word.foundBy ?? [];
            return foundBy.map((playerId, lineIndex) => {
              const dX = x2 - x1;
              const dY = y2 - y1;
              const length = Math.max(1, Math.hypot(dX, dY));
              const offset = foundBy.length > 1 && lineIndex === 1 ? 0.9 : 0;
              const ox = (-dY / length) * offset;
              const oy = (dX / length) * offset;

              return (
                <line
                  key={`${word.id}-${playerId}-${lineIndex}`}
                  x1={x1 + ox}
                  y1={y1 + oy}
                  x2={x2 + ox}
                  y2={y2 + oy}
                  stroke={playerColor(playerId)}
                  strokeWidth="0.7"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              );
            });
          })}
        </svg>

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
              className={`relative z-10 aspect-square touch-none rounded-[3px] border text-center font-display text-xs font-semibold uppercase transition-colors sm:text-sm ${
                isSelected
                  ? "border-rose bg-rose/30 text-ink"
                  : isFound
                  ? "border-sage/60 bg-sage/25 text-ink"
                  : "border-surface/70 bg-surface/85 text-ink"
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
