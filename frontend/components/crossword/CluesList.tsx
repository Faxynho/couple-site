"use client";

import { CrosswordWordDef } from "@/lib/crosswordTypes";

interface CluesListProps {
  words: CrosswordWordDef[];
  completedWordIds: string[];
  activeWordId: string | null;
  onSelectWord: (word: CrosswordWordDef) => void;
}

/** Lista organizada de pistas, separadas em Horizontais/Verticais. */
export default function CluesList({ words, completedWordIds, activeWordId, onSelectWord }: CluesListProps) {
  const completedSet = new Set(completedWordIds);
  const across = words.filter((w) => w.direction === "across").sort((a, b) => a.number - b.number);
  const down = words.filter((w) => w.direction === "down").sort((a, b) => a.number - b.number);

  const renderGroup = (title: string, list: CrosswordWordDef[]) => (
    <div className="flex-1 min-w-[140px]">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">{title}</p>
      <ul className="flex flex-col gap-1">
        {list.map((w) => {
          const done = completedSet.has(w.id);
          const active = activeWordId === w.id;
          return (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => onSelectWord(w)}
                className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                  active
                    ? "bg-rose/20 text-ink font-medium"
                    : done
                    ? "bg-sage/15 text-ink-soft line-through decoration-ink-soft/50"
                    : "text-ink-soft hover:bg-white/60 hover:text-ink"
                }`}
              >
                <span className="font-semibold">{w.number}.</span> {w.clue}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="glass-panel flex w-full max-w-[min(94vw,560px)] flex-wrap gap-4 rounded-xl2 p-4">
      {renderGroup("Horizontais", across)}
      {renderGroup("Verticais", down)}
    </div>
  );
}
