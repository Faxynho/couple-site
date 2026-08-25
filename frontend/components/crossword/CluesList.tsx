"use client";

import { CrosswordWordDef } from "@/lib/crosswordTypes";

interface Player {
  id: string;
  name: string;
  color: string;
}

interface CluesListProps {
  words: CrosswordWordDef[];
  completedWordIds: string[];
  completedWordBy: Record<string, string[]>;
  activeWordId: string | null;
  players: Player[];
  selfId: string | null;
  onSelectWord: (word: CrosswordWordDef) => void;
}

/** Lista organizada de pistas, mostrando discretamente a cor de quem acertou. */
export default function CluesList({
  words,
  completedWordIds,
  completedWordBy,
  activeWordId,
  players,
  selfId,
  onSelectWord,
}: CluesListProps) {
  const completedSet = new Set(completedWordIds);
  const across = words.filter((w) => w.direction === "across").sort((a, b) => a.number - b.number);
  const down = words.filter((w) => w.direction === "down").sort((a, b) => a.number - b.number);
  const colorOf = (id: string) => players.find((p) => p.id === id)?.color ?? "#E88AA5";

  const renderGroup = (title: string, list: CrosswordWordDef[]) => (
    <div className="min-w-[140px] flex-1">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">{title}</p>
      <ul className="flex flex-col gap-1">
        {list.map((w) => {
          const done = completedSet.has(w.id);
          const active = activeWordId === w.id;
          const owners = completedWordBy[w.id] ?? [];
          const opponentId = owners.find((id) => id !== selfId);
          const opponentFound = Boolean(opponentId);
          const ownerColor = opponentFound ? colorOf(opponentId!) : undefined;

          return (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => onSelectWord(w)}
                className={`w-full rounded-lg border-l-[3px] px-2 py-1.5 text-left text-xs transition-colors ${
                  active
                    ? "border-rose bg-rose/20 font-medium text-ink"
                    : done
                    ? "line-through decoration-ink-soft/50"
                    : "border-transparent text-ink-soft hover:bg-white/60 hover:text-ink"
                }`}
                style={
                  !active && done
                    ? opponentFound
                      ? {
                          borderLeftColor: ownerColor,
                          color: ownerColor,
                          backgroundColor: "rgba(255,255,255,0.78)",
                        }
                      : {
                          borderLeftColor: "rgba(120,120,120,0.35)",
                          backgroundColor: "rgba(120,120,120,0.10)",
                          color: "#777",
                        }
                    : undefined
                }
                title={
                  opponentFound
                    ? `Acertada por ${players.find((p) => p.id === opponentId)?.name ?? "seu par"}`
                    : done
                    ? "Acertada por você"
                    : undefined
                }
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
