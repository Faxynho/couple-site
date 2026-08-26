"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy } from "lucide-react";
import Confetti from "../Confetti";
import Button from "../Button";
import { SudokuResultEntry } from "@/lib/sudokuTypes";
import { MatchMode } from "@/lib/matchModes";

interface Player {
  id: string;
  name: string;
  color: string;
}

interface SudokuWinModalProps {
  visible: boolean;
  mode: MatchMode;
  elapsedLabel: string;
  moves: number;
  difficultyLabel: string;
  selfId: string | null;
  players: Player[];
  results: SudokuResultEntry[];
  onNewPuzzle: () => void;
  onBack: () => void;
  onClose: () => void;
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function playerName(players: Player[], id: string) {
  return players.find((p) => p.id === id)?.name ?? "Jogador";
}

export default function SudokuWinModal({
  visible,
  mode,
  elapsedLabel,
  moves,
  difficultyLabel,
  selfId,
  players,
  results,
  onNewPuzzle,
  onBack,
  onClose,
}: SudokuWinModalProps) {
  const isDuel = mode === "duel" && results.length > 0;
  const winner = results[0];
  const runnerUp = results[1];
  const diffMs = winner && runnerUp ? runnerUp.timeMs - winner.timeMs : null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <Confetti />
          <motion.div
            className="glass-panel relative w-full max-w-sm rounded-xl3 p-8 text-center"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface/60 hover:text-ink"
            >
              <X size={18} />
            </button>

            <div className="mx-auto mb-3 text-5xl animate-pop-in">🔢</div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              {isDuel ? "Duelo encerrado!" : "Sudoku completo!"}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">Dificuldade {difficultyLabel} concluída.</p>

            {isDuel ? (
              <div className="mt-6 flex flex-col gap-2">
                {results.map((r) => {
                  const isSelf = r.playerId === selfId;
                  const isWinner = r.place === 1;
                  return (
                    <div
                      key={r.playerId}
                      className={`flex items-center justify-between rounded-xl2 px-4 py-3 ${
                        isWinner ? "bg-rose/15" : "bg-surface/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-left">
                        {isWinner && <Trophy size={16} className="text-rose" />}
                        <span className="text-sm font-medium text-ink">
                          {r.place}º — {playerName(players, r.playerId)}
                          {isSelf ? " (você)" : ""}
                        </span>
                      </div>
                      <span className="font-display text-sm font-semibold tabular-nums text-ink">
                        {formatTime(r.timeMs)}
                      </span>
                    </div>
                  );
                })}
                {diffMs !== null && (
                  <p className="mt-1 text-xs text-ink-soft">Diferença de {formatTime(diffMs)} entre 1º e 2º lugar.</p>
                )}
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl2 bg-surface/60 py-3">
                  <p className="text-xs text-ink-soft">Tempo</p>
                  <p className="font-display text-lg font-semibold text-ink">{elapsedLabel}</p>
                </div>
                <div className="rounded-xl2 bg-surface/60 py-3">
                  <p className="text-xs text-ink-soft">Jogadas</p>
                  <p className="font-display text-lg font-semibold text-ink">{moves}</p>
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-col gap-2">
              <Button onClick={onClose} className="w-full">
                Continuar visualizando
              </Button>
              <Button onClick={onNewPuzzle} variant="secondary" className="w-full">
                Jogar outro Sudoku
              </Button>
              <Button onClick={onBack} variant="ghost" className="w-full">
                Voltar para os jogos
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
