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
import { isFullProgress, SUDOKU_DIFFICULTIES, SudokuDifficulty } from "@/lib/sudokuTypes";
import { MatchMode } from "@/lib/matchModes";

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
  const wasMatchFinishedRef = useRef(false);
  const wasSelfFinishedRef = useRef(false);

  const ownProgressRaw = selfId && state ? state.progress[selfId] : undefined;
  const ownProgress = ownProgressRaw && isFullProgress(ownProgressRaw) ? ownProgressRaw : null;

  useEffect(() => {
    if (state?.finished && !wasMatchFinishedRef.current) {
      setShowWinModal(true);
    } else if (!state?.finished && wasMatchFinishedRef.current) {
      // O estado é sincronizado pelo servidor: quando qualquer um dos dois
      // clica em "Jogar de novo", os dois recebem `finished: false` de
      // volta — o modal precisa fechar nos dois clientes, não só em quem clicou.
      setShowWinModal(false);
    }
    wasMatchFinishedRef.current = Boolean(state?.finished);
  }, [state?.finished, state?.finishedAt]);

  useEffect(() => {
    wasSelfFinishedRef.current = Boolean(ownProgress?.finished);
  }, [ownProgress?.finished]);

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <Logo size={44} />
        <p className="text-ink-soft">Não encontramos essa sala. Ela pode ter expirado ou o link está incorreto.</p>
        <Button onClick={() => router.push("/")}>Voltar para o início</Button>
      </main>
    );
  }

  if (!room || !state || !ownProgress) {
    return <LoadingScreen label="Preparando o Sudoku..." />;
  }

  const mode = state.mode as MatchMode;
  const finalElapsed = ownProgress.finished && ownProgress.finishedAt ? ownProgress.finishedAt - state.startedAt : 0;
  const difficultyLabel = SUDOKU_DIFFICULTIES[state.difficulty as SudokuDifficulty]?.label ?? state.difficulty;
  const selfFinishedWaitingForOthers = ownProgress.finished && !state.finished;

  const handleSetValue = (index: number, value: number) => {
    setCell(index, value);
  };

  return (
    <main className="flex min-h-screen flex-col items-center gap-5 bg-cozy-gradient px-4 py-6 sm:py-8">
      <SudokuControls
        roomCode={room.code}
        difficulty={state.difficulty}
        mode={mode}
        startedAt={state.startedAt}
        finished={state.finished}
        moves={ownProgress.moves}
        players={room.players}
        progress={state.progress}
        selfId={selfId}
        onNewPuzzle={(difficulty) => newPuzzle(difficulty)}
        onRestart={resetGame}
        onBack={() => router.push("/")}
      />

      <SudokuBoard
        cells={ownProgress.cells}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onSetValue={handleSetValue}
        players={room.players}
        selfId={selfId}
        locked={ownProgress.finished}
      />

      <div className="w-full max-w-[min(92vw,540px)]">
        <SudokuNumberPad
          cells={ownProgress.cells}
          selectedIndex={selectedIndex}
          onPick={(v) => selectedIndex !== null && handleSetValue(selectedIndex, v)}
          disabled={ownProgress.finished}
        />
      </div>

      <AnimatePresence>
        {selfFinishedWaitingForOthers && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="glass-panel fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-medium text-ink shadow-soft"
          >
            Você terminou! Aguardando seu par concluir a grade...
          </motion.div>
        )}
        {state.finished && !showWinModal && (
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
        mode={mode}
        elapsedLabel={formatFinalTime(finalElapsed)}
        moves={ownProgress.moves}
        difficultyLabel={difficultyLabel}
        selfId={selfId}
        players={room.players}
        results={state.results}
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
