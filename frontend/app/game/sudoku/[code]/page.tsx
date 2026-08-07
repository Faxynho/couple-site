"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useGameRoom } from "@/hooks/useGameRoom";
import { useSudokuGame } from "@/hooks/useSudokuGame";
import SudokuBoard from "@/components/sudoku/SudokuBoard";
import SudokuNumberPad from "@/components/sudoku/SudokuNumberPad";
import SudokuControls from "@/components/sudoku/SudokuControls";
import SudokuWinModal from "@/components/sudoku/SudokuWinModal";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { SUDOKU_DIFFICULTIES, SudokuDifficulty } from "@/lib/sudokuTypes";

function formatFinalTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function SudokuGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();

  const { room, selfId, notFound } = useGameRoom(code);
  const { state, setCell, newPuzzle, resetGame } = useSudokuGame(code);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const wasSolvedRef = useRef(false);

  useEffect(() => {
    if (state?.solved && !wasSolvedRef.current) {
      setShowWinModal(true);
    }
    wasSolvedRef.current = Boolean(state?.solved);
  }, [state?.solved, state?.solvedAt]);

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <Logo size={44} />
        <p className="text-ink-soft">Não encontramos essa sala. Ela pode ter expirado ou o link está incorreto.</p>
        <Button onClick={() => router.push("/")}>Voltar para o início</Button>
      </main>
    );
  }

  if (!room || !state) {
    return <LoadingScreen label="Preparando o Sudoku..." />;
  }

  const finalElapsed = state.solved && state.solvedAt ? state.solvedAt - state.startedAt : 0;
  const difficultyLabel = SUDOKU_DIFFICULTIES[state.difficulty as SudokuDifficulty]?.label ?? state.difficulty;

  const handleSetValue = (index: number, value: number) => {
    setCell(index, value);
  };

  return (
    <main className="flex min-h-screen flex-col items-center gap-5 bg-cozy-gradient px-4 py-6 sm:py-8">
      <SudokuControls
        roomCode={room.code}
        difficulty={state.difficulty}
        startedAt={state.startedAt}
        solved={state.solved}
        solvedAt={state.solvedAt}
        moves={state.moves}
        players={room.players}
        onNewPuzzle={(difficulty) => newPuzzle(difficulty)}
        onRestart={resetGame}
        onBack={() => router.push("/")}
      />

      <SudokuBoard
        cells={state.cells}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onSetValue={handleSetValue}
        players={room.players}
        selfId={selfId}
        locked={state.solved}
      />

      <div className="w-full max-w-[min(92vw,540px)]">
        <SudokuNumberPad cells={state.cells} selectedIndex={selectedIndex} onPick={(v) => selectedIndex !== null && handleSetValue(selectedIndex, v)} disabled={state.solved} />
      </div>

      <AnimatePresence>
        {state.solved && !showWinModal && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowWinModal(true)}
            className="glass-panel fixed bottom-4 left-4 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-ink shadow-soft"
          >
            <Sparkles size={16} className="text-rose" />
            Ver resultado
          </motion.button>
        )}
      </AnimatePresence>

      <SudokuWinModal
        visible={showWinModal}
        elapsedLabel={formatFinalTime(finalElapsed)}
        moves={state.moves}
        difficultyLabel={difficultyLabel}
        onNewPuzzle={() => {
          setShowWinModal(false);
          newPuzzle(state.difficulty);
        }}
        onBack={() => router.push("/")}
        onClose={() => setShowWinModal(false)}
      />
    </main>
  );
}
