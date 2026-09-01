"use client";

import { motion } from "framer-motion";
import { Check, Shuffle } from "lucide-react";
import { GameId } from "@/lib/types";
import { GAMES } from "@/lib/games";

interface GameSequenceSuggestionProps {
  sequence: GameId[];
  sequenceProgress: GameId[];
  isHost: boolean;
  onShuffle: () => void;
  onPickGame: (gameId: GameId) => void;
  /** Visualização usada no catálogo Solo, sem progresso da sala ou ações. */
  preview?: boolean;
}

const gameById = new Map(GAMES.map((g) => [g.id, g]));

/**
 * Sugestão de sequência de jogos da sala Duo: uma ordem sorteada com todos os
 * jogos do catálogo. Vai marcando com um check os que já foram jogados até o
 * fim nesta rodada, e reseta sempre que a sequência é sorteada de novo.
 * Tocar num jogo da lista (só o host) já leva direto para a configuração dele.
 */
export default function GameSequenceSuggestion({
  sequence,
  sequenceProgress,
  isHost,
  onShuffle,
  onPickGame,
  preview = false,
}: GameSequenceSuggestionProps) {
  const doneCount = sequenceProgress.length;

  return (
    <div className="glass-panel w-full rounded-xl3 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-semibold text-ink">Sequência sugerida</p>
          <p className="text-xs text-ink-soft">
            {preview ? "Uma seleção para inspirar a próxima partida" : `${doneCount}/${sequence.length} jogados nesta rodada`}
          </p>
        </div>
        {isHost && !preview && (
          <button
            type="button"
            onClick={onShuffle}
            className="flex items-center gap-1.5 rounded-full bg-surface/70 px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface"
          >
            <Shuffle size={14} /> Sortear de novo
          </button>
        )}
      </div>

      <ol className="mt-4 flex flex-col gap-1.5">
        {sequence.map((gameId, index) => {
          const game = gameById.get(gameId);
          if (!game) return null;
          const done = sequenceProgress.includes(gameId);
          return (
            <motion.li key={gameId} layout>
              <button
                type="button"
                disabled={!isHost || preview}
                onClick={() => isHost && !preview && onPickGame(gameId)}
                className={`flex w-full items-center gap-3 rounded-xl2 border px-3 py-2.5 text-left transition-colors ${
                  done ? "border-sage/50 bg-sage/10" : "border-surface/70 bg-surface/50"
                } ${isHost ? "hover:bg-surface/80" : "cursor-default"}`}
              >
                <span className="font-display text-xs font-semibold text-ink-soft">{index + 1}</span>
                <span className="text-lg leading-none">{game.emoji}</span>
                <span className="flex-1 text-sm font-medium text-ink">{game.name}</span>
                {done && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage/30 text-sage">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
