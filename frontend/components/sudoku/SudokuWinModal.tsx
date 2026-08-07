"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Confetti from "../Confetti";
import Button from "../Button";

interface SudokuWinModalProps {
  visible: boolean;
  elapsedLabel: string;
  moves: number;
  difficultyLabel: string;
  onNewPuzzle: () => void;
  onBack: () => void;
  onClose: () => void;
}

export default function SudokuWinModal({
  visible,
  elapsedLabel,
  moves,
  difficultyLabel,
  onNewPuzzle,
  onBack,
  onClose,
}: SudokuWinModalProps) {
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
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-white/60 hover:text-ink"
            >
              <X size={18} />
            </button>

            <div className="mx-auto mb-3 text-5xl animate-pop-in">🔢</div>
            <h2 className="font-display text-2xl font-semibold text-ink">Sudoku completo!</h2>
            <p className="mt-1 text-sm text-ink-soft">Dificuldade {difficultyLabel} concluída.</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl2 bg-white/60 py-3">
                <p className="text-xs text-ink-soft">Tempo</p>
                <p className="font-display text-lg font-semibold text-ink">{elapsedLabel}</p>
              </div>
              <div className="rounded-xl2 bg-white/60 py-3">
                <p className="text-xs text-ink-soft">Jogadas</p>
                <p className="font-display text-lg font-semibold text-ink">{moves}</p>
              </div>
            </div>

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
