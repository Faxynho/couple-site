"use client";

import { WordSearchWordEntry } from "@/lib/wordsearchTypes";

interface WordSearchWordListProps {
  words: WordSearchWordEntry[];
}

/** Lista de palavras a encontrar — marcadas quando já encontradas. */
export default function WordSearchWordList({ words }: WordSearchWordListProps) {
  return (
    <div className="glass-panel flex w-full max-w-[min(94vw,520px)] flex-wrap justify-center gap-2 rounded-xl2 p-4">
      {words.map((w) => {
        const found = Boolean(w.cells);
        return (
          <span
            key={w.id}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              found ? "bg-sage/25 text-ink-soft line-through decoration-ink-soft/60" : "bg-white/70 text-ink"
            }`}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
}
