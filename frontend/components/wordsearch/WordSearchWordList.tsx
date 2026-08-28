"use client";

import { WordSearchWordEntry } from "@/lib/wordsearchTypes";

interface Player {
  id: string;
  name: string;
  color: string;
}

interface WordSearchWordListProps {
  words: WordSearchWordEntry[];
  players: Player[];
  selfId: string | null;
}

/**
 * Lista de palavras encontradas.
 *
 * No modo duelo:
 * - Se somente o oponente encontrou: mostra a cor do oponente.
 * - Se somente você encontrou: usa a aparência normal de encontrada.
 * - Se os dois encontraram: dá prioridade à sua própria marcação,
 *   para que você consiga identificar claramente que também encontrou.
 *
 * No modo juntos, como a descoberta é compartilhada, a palavra continua
 * sendo tratada como encontrada normalmente.
 */
export default function WordSearchWordList({
  words,
  players,
  selfId,
}: WordSearchWordListProps) {
  const colorOf = (id: string) =>
    players.find((p) => p.id === id)?.color ?? "#E88AA5";

  const nameOf = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "seu par";

  return (
    <div className="glass-panel flex w-full max-w-[min(94vw,520px)] flex-wrap justify-center gap-2 rounded-xl2 p-4">
      {words.map((w) => {
        const foundBy = w.foundBy ?? [];

        const found = foundBy.length > 0;

        // IMPORTANTE:
        // Primeiro verificamos se VOCÊ encontrou.
        // Isso resolve o caso em que o oponente encontrou primeiro
        // e você encontrou a mesma palavra depois.
        const selfFound =
          selfId !== null && foundBy.includes(selfId);

        // Só consideramos oponente como responsável visual quando
        // você ainda NÃO encontrou a palavra.
        const opponentId = foundBy.find((id) => id !== selfId);
        const opponentFound = !selfFound && Boolean(opponentId);

        const ownerColor =
          opponentFound && opponentId
            ? colorOf(opponentId)
            : selfFound && selfId
            ? colorOf(selfId)
            : undefined;

        let title: string | undefined;

        if (selfFound && opponentId) {
          title = `Encontrada por você e ${nameOf(opponentId)}`;
        } else if (selfFound) {
          title = "Encontrada por você";
        } else if (opponentFound && opponentId) {
          title = `Encontrada por ${nameOf(opponentId)}`;
        }

        return (
          <span
            key={w.id}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              found
                ? "line-through decoration-ink-soft/60"
                : "border-transparent bg-surface/70 text-ink"
            }`}
            style={
              found
                ? opponentFound
                  ? {
                      // Oponente encontrou e você ainda não.
                      borderColor: ownerColor,
                      borderLeftWidth: 3,
                      color: ownerColor,
                      backgroundColor: "rgb(var(--color-surface) / 0.82)",
                    }
                  : {
                      // Você encontrou.
                      // Mesmo que o oponente também tenha encontrado,
                      // sua marcação passa a ter prioridade.
                      borderColor: "rgba(90,90,90,0.18)",
                      backgroundColor: "rgb(var(--color-surface) / 0.55)",
                      color: "rgb(var(--color-ink-soft))",
                    }
                : undefined
            }
            title={title}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
}
