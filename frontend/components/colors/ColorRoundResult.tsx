"use client";

import { motion } from "framer-motion";
import Button from "../Button";
import { ColorGuess, ColorTarget } from "@/lib/colorTypes";
import { Player } from "@/lib/types";

interface ColorRoundResultProps {
  round: number;
  totalRounds: number;
  target: ColorTarget;
  guesses: Record<string, ColorGuess>;
  players: Player[];
  selfId: string | null;
  onNext: () => void;
  /** No cooperativo, mostra um único palpite compartilhado em vez da lista por jogador. */
  mode?: "competitive" | "cooperative";
  guesserId?: string | null;
}

function scoreLabel(score: number) {
  if (score >= 8.5) return "Quase perfeito!";
  if (score >= 6) return "Muito perto";
  if (score >= 3.5) return "Na direção certa";
  return "Longe do alvo";
}

/** Painel dividido ao meio, colado, mostrando a cor original e o palpite lado a lado. */
function SplitCompare({ target, guess, label }: { target: string; guess: string; label: string }) {
  return (
    <div className="relative flex aspect-[5/3] w-full overflow-hidden rounded-xl3 shadow-glow">
      <div className="flex-1" style={{ background: target }} />
      <div className="flex-1" style={{ background: guess }} />

      <div className="absolute inset-x-0 bottom-0 flex bg-gradient-to-t from-black/30 to-transparent px-4 py-3 text-[11px] font-medium text-white/90">
        <span className="flex-1">Original</span>
        <span className="flex-1 text-right">{label}</span>
      </div>
    </div>
  );
}

export default function ColorRoundResult({
  round,
  totalRounds,
  target,
  guesses,
  players,
  selfId,
  onNext,
  mode = "competitive",
  guesserId,
}: ColorRoundResultProps) {
  const isLastRound = round === totalRounds - 1;

  if (mode === "cooperative") {
    const sharedGuess = guesserId ? guesses[guesserId] : undefined;
    const guesserName = players.find((p) => p.id === guesserId)?.name ?? "quem adivinhou";

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="flex w-full max-w-md flex-col items-center gap-4"
      >
        <p className="text-xs uppercase tracking-wide text-ink-soft">
          Rodada {round + 1} de {totalRounds}
        </p>

        {sharedGuess && (
          <div className="relative w-full">
            <SplitCompare
              target={target.hex}
              guess={sharedGuess.hex}
              label={guesserId === selfId ? "Seu palpite" : `Palpite de ${guesserName}`}
            />
            <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-white bg-ink shadow-glow">
              <span className="font-display text-xl font-semibold leading-none text-white">
                {sharedGuess.score.toFixed(1)}
              </span>
              <span className="text-[9px] leading-none text-white/70">/10</span>
            </div>
          </div>
        )}

        <div className="glass-panel flex w-full items-center justify-center gap-2 rounded-xl2 px-4 py-3 text-center">
          <span className="text-lg leading-none">🤝</span>
          <p className="text-sm text-ink">
            <span className="font-medium">{sharedGuess ? scoreLabel(sharedGuess.score) : "Sem palpite"}</span> — vocês
            pontuam juntos nessa rodada.
          </p>
        </div>

        <Button onClick={onNext} className="w-full">
          {isLastRound ? "Ver resultado final" : "Próxima rodada"}
        </Button>
      </motion.div>
    );
  }

  const orderedPlayers = [...players].sort((a) => (a.id === selfId ? -1 : 1));
  const [primaryPlayer, ...otherPlayers] = orderedPlayers;
  const primaryGuess = primaryPlayer ? guesses[primaryPlayer.id] : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex w-full max-w-md flex-col items-center gap-4"
    >
      <p className="text-xs uppercase tracking-wide text-ink-soft">
        Rodada {round + 1} de {totalRounds}
      </p>

      {primaryGuess && (
        <div className="relative w-full">
          <SplitCompare
            target={target.hex}
            guess={primaryGuess.hex}
            label={primaryPlayer.id === selfId ? "Seu palpite" : primaryPlayer.name}
          />
          <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-white bg-ink shadow-glow">
            <span className="font-display text-xl font-semibold leading-none text-white">
              {primaryGuess.score.toFixed(1)}
            </span>
            <span className="text-[9px] leading-none text-white/70">/10</span>
          </div>
        </div>
      )}

      {otherPlayers.length > 0 && (
        <div className="flex w-full flex-col gap-2.5">
          {otherPlayers.map((player) => {
            const guess = guesses[player.id];
            return (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-xl2 border border-white/70 bg-white/50 px-3 py-2.5"
              >
                <div
                  className="h-11 w-11 shrink-0 rounded-full border-2 border-white shadow-soft"
                  style={{ background: guess?.hex ?? "transparent" }}
                />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-ink">{player.name}</p>
                  <p className="text-xs text-ink-soft">{guess ? scoreLabel(guess.score) : "Sem palpite"}</p>
                </div>
                <p className="font-display text-lg font-semibold tabular-nums text-ink">
                  {guess ? guess.score.toFixed(1) : "–"}
                  <span className="text-xs font-normal text-ink-soft">/10</span>
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Button onClick={onNext} className="w-full">
        {isLastRound ? "Ver resultado final" : "Próxima rodada"}
      </Button>
    </motion.div>
  );
}
