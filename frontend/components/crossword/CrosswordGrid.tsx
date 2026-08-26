"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { CrosswordCell, CrosswordDirection, CrosswordWordDef } from "@/lib/crosswordTypes";

interface CrosswordGridProps {
  rows: number;
  cols: number;
  cells: CrosswordCell[];
  words: CrosswordWordDef[];
  values: (string | null)[];
  completedWordIds: string[];
  onSetValue: (row: number, col: number, letter: string) => void;
  locked: boolean;
  selected: number | null;
  direction: CrosswordDirection;
  onSelectedChange: (index: number | null) => void;
  onDirectionChange: (direction: CrosswordDirection) => void;
  onActiveWordChange: (wordId: string | null) => void;
}

/** Grade de Palavras Cruzadas: clique para selecionar/alternar direção.
 *  Um input de texto invisível fica sempre focado na célula selecionada —
 *  é ele que faz o teclado (físico ou virtual, no celular) aparecer e
 *  captura o que foi digitado; Backspace/setas/Tab continuam sendo
 *  tratados via evento de teclado, que também funciona com o input focado. */
export default function CrosswordGrid({
  rows,
  cols,
  cells,
  words,
  values,
  completedWordIds,
  onSetValue,
  locked,
  selected,
  direction,
  onSelectedChange,
  onDirectionChange,
  onActiveWordChange,
}: CrosswordGridProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const wordsByCell = useMemo(() => {
    const map = new Map<number, { across?: CrosswordWordDef; down?: CrosswordWordDef }>();
    for (const w of words) {
      const dr = w.direction === "down" ? 1 : 0;
      const dc = w.direction === "across" ? 1 : 0;
      for (let i = 0; i < w.length; i++) {
        const idx = (w.row + dr * i) * cols + (w.col + dc * i);
        const entry = map.get(idx) ?? {};
        entry[w.direction] = w;
        map.set(idx, entry);
      }
    }
    return map;
  }, [words, cols]);

  const completedSet = useMemo(() => new Set(completedWordIds), [completedWordIds]);

  const activeWord = useMemo(() => {
    if (selected === null) return null;
    const entry = wordsByCell.get(selected);
    if (!entry) return null;
    return entry[direction] ?? entry.across ?? entry.down ?? null;
  }, [selected, direction, wordsByCell]);

  useEffect(() => {
    onActiveWordChange(activeWord?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWord]);

  const activeWordCellSet = useMemo(() => {
    const set = new Set<number>();
    if (!activeWord) return set;
    const dr = activeWord.direction === "down" ? 1 : 0;
    const dc = activeWord.direction === "across" ? 1 : 0;
    for (let i = 0; i < activeWord.length; i++) {
      set.add((activeWord.row + dr * i) * cols + (activeWord.col + dc * i));
    }
    return set;
  }, [activeWord, cols]);

  /** Move um único passo a partir de `from`; retorna null se sair da grade ou cair num bloco. */
  const step = useCallback(
    (from: number, dRow: number, dCol: number): number | null => {
      const r = Math.floor(from / cols) + dRow;
      const c = (from % cols) + dCol;
      if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
      const idx = r * cols + c;
      if (cells[idx]?.block) return null;
      return idx;
    },
    [cells, rows, cols]
  );

  const handleSelect = (idx: number) => {
    if (locked || cells[idx].block) return;
    if (selected === idx) {
      const entry = wordsByCell.get(idx);
      if (entry?.across && entry?.down) onDirectionChange(direction === "across" ? "down" : "across");
    } else {
      onSelectedChange(idx);
      const entry = wordsByCell.get(idx);
      if (entry) {
        if (direction === "across" && !entry.across && entry.down) onDirectionChange("down");
        if (direction === "down" && !entry.down && entry.across) onDirectionChange("across");
      }
    }
    // Foca o input invisível para abrir o teclado do celular (e manter o
    // foco funcional no desktop). Precisa ser síncrono ao clique/toque —
    // é o próprio gesto do usuário que autoriza o navegador a abrir o teclado.
    hiddenInputRef.current?.focus({ preventScroll: true });
  };

  // Sempre que a célula selecionada mudar (inclusive por navegação com
  // as setas), garante que o input invisível continue focado — é o que
  // mantém o teclado do celular aberto enquanto a pessoa preenche a grade.
  useEffect(() => {
    if (locked || selected === null) return;
    hiddenInputRef.current?.focus({ preventScroll: true });
  }, [selected, locked]);

  /** Captura o que foi digitado (teclado físico ou virtual) através do
   *  input invisível — mais confiável em celulares do que ler `keydown`,
   *  já que muitos teclados virtuais não disparam eventos de tecla
   *  completos para cada letra. */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    e.target.value = "";
    if (locked || selected === null) return;
    const letters = raw.replace(/[^a-zA-ZÀ-ú]/g, "");
    if (!letters) return;
    const letter = letters[letters.length - 1].toUpperCase();
    const row = Math.floor(selected / cols);
    const col = selected % cols;
    onSetValue(row, col, letter);
    const dRow = direction === "down" ? 1 : 0;
    const dCol = direction === "across" ? 1 : 0;
    const next = step(selected, dRow, dCol);
    if (next !== null) onSelectedChange(next);
  };

  useEffect(() => {
    if (locked) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selected === null) return;
      const row = Math.floor(selected / cols);
      const col = selected % cols;

      if (e.key === "Backspace" || e.key === "Delete") {
        if (values[selected]) {
          onSetValue(row, col, "");
        } else {
          const dRow = direction === "down" ? -1 : 0;
          const dCol = direction === "across" ? -1 : 0;
          const prev = step(selected, dRow, dCol);
          if (prev !== null) {
            onSelectedChange(prev);
            onSetValue(Math.floor(prev / cols), prev % cols, "");
          }
        }
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        let dRow = 0;
        let dCol = 0;
        if (e.key === "ArrowUp") { dRow = -1; onDirectionChange("down"); }
        if (e.key === "ArrowDown") { dRow = 1; onDirectionChange("down"); }
        if (e.key === "ArrowLeft") { dCol = -1; onDirectionChange("across"); }
        if (e.key === "ArrowRight") { dCol = 1; onDirectionChange("across"); }
        const next = step(selected, dRow, dCol);
        if (next !== null) onSelectedChange(next);
      } else if (e.key === "Tab") {
        e.preventDefault();
        onDirectionChange(direction === "across" ? "down" : "across");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, direction, cols, step, onSetValue, onSelectedChange, onDirectionChange, values, locked]);

  return (
    <div className="glass-panel relative w-full max-w-[min(94vw,560px)] overflow-auto rounded-xl2 p-3">
      {/* Input invisível, sempre focado na célula ativa. É o que faz o
          teclado do celular (e o do desktop) aparecer — sem ele, os
          quadradinhos são só botões e nenhum navegador abre teclado algum. */}
      <input
        ref={hiddenInputRef}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-label="Digite a letra da célula selecionada"
        value=""
        onChange={handleInputChange}
        disabled={locked}
        className="absolute left-0 top-0 h-px w-px overflow-hidden opacity-0"
        style={{ pointerEvents: "none" }}
      />

      <div
        className="mx-auto grid select-none gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, maxWidth: `${Math.min(cols * 42, 520)}px` }}
      >
        {cells.map((cell, idx) => {
          if (cell.block) {
            return <div key={idx} className="aspect-square rounded-[3px] bg-ink/10" />;
          }
          const value = values[idx];
          const isSelected = selected === idx;
          const isInActiveWord = activeWordCellSet.has(idx);
          const entry = wordsByCell.get(idx);
          const isWordDone =
            (entry?.across && completedSet.has(entry.across.id)) || (entry?.down && completedSet.has(entry.down.id));
          return (
            // O wrapper (não o botão) define o tamanho do quadrado no grid.
            // O botão fica "absolute inset-0" preenchendo o wrapper, então o
            // texto da letra digitada nunca influencia a altura da célula —
            // sem isso, a linha esticava e a grade ficava torta ao digitar.
            <div key={idx} className="relative aspect-square">
              <button
                type="button"
                onClick={() => handleSelect(idx)}
                disabled={locked}
                className={`absolute inset-0 flex items-center justify-center rounded-[3px] border font-display text-sm font-semibold uppercase leading-none transition-colors sm:text-base ${
                  isSelected
                    ? "border-rose bg-rose/25 text-ink"
                    : isWordDone
                    ? "border-sage/60 bg-sage/20 text-ink"
                    : isInActiveWord
                    ? "border-rose/40 bg-rose/10 text-ink"
                    : "border-surface/70 bg-surface/85 text-ink hover:bg-surface"
                }`}
              >
                {cell.number !== null && (
                  <span className="absolute left-0.5 top-0 text-[8px] font-medium leading-none text-ink-soft">
                    {cell.number}
                  </span>
                )}
                {value}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
