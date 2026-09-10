"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useRoomSession } from "@/hooks/useRoomSession";
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
import { playSoundEffect } from "@/lib/sound";
import { useDuelFirstFinishCelebration } from "@/hooks/useDuelFirstFinishCelebration";

function formatFinalTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function SudokuGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();

  const { room, selfId, notFound, kicked, backToConfig, backToGameSelect, kickPlayer } = useRoomSession(code);
  const { state, setCell, hint, newPuzzle, resetGame } = useSudokuGame(code);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [markedIndices, setMarkedIndices] = useState<Set<number>>(new Set());
  const [showWinModal, setShowWinModal] = useState(false);
  const wasMatchFinishedRef = useRef(false);

  // Se o host trocar de jogo (ou voltar pra escolha de jogo) enquanto o
  // convidado ainda está nesta tela, o socket vai começar a mandar
  // `game:state` de outro jogo (formato diferente) pra cá — sem essa
  // trava, ler `state.progress[selfId]` explode com o formato errado.
  const isActiveGame = room?.gameId === "sudoku";
  const ownProgressRaw = isActiveGame && selfId && state ? state.progress?.[selfId] : undefined;
  const ownProgress = ownProgressRaw && isFullProgress(ownProgressRaw) ? ownProgressRaw : null;
  const opponentId = selfId && state ? state.expectedPlayers?.find((playerId) => playerId !== selfId) : undefined;
  const firstFinishCelebration = useDuelFirstFinishCelebration({
    enabled: room?.roomMode === "duo" && state?.mode === "duel",
    matchKey: state?.startedAt,
    ownFinished: Boolean(ownProgress?.finished),
    opponentFinished: opponentId ? Boolean(state?.progress?.[opponentId]?.finished) : false,
    matchFinished: Boolean(state?.finished),
  });

  useEffect(() => {
    if (!room) return;
    if (room.gameId !== "sudoku" || (room.status !== "playing" && room.status !== "finished")) {
      if (room.roomMode === "duo") {
        router.push(`/sala/${room.code}`);
      } else {
        router.push("/solo");
      }
    }
  }, [room, router]);

  useEffect(() => {
    if (state?.finished && !wasMatchFinishedRef.current) {
      if (state.mode === "together" || state.results[0]?.playerId === selfId) playSoundEffect("victory");
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
    if (state?.startedAt) {
      setMarkedIndices(new Set());
      setSelectedIndex(null);
    }
  }, [state?.startedAt]);

  if (kicked) return null;

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

  const isHost = room.roomKind === "persistent-duo" || Boolean(selfId && room.hostId === selfId);
  const handleBackToConfig = () => {
    if (room.roomMode === "duo") {
      backToConfig();
      router.push(`/sala/${room.code}`);
    } else {
      router.push("/solo");
    }
  };
  const handleBackToGameSelect = () => {
    if (room.roomMode === "duo") {
      backToGameSelect();
      router.push(`/sala/${room.code}`);
    } else {
      router.push("/solo");
    }
  };

  const mode = state.mode as MatchMode;
  const finalElapsed = ownProgress.finished && ownProgress.finishedAt ? ownProgress.finishedAt - state.startedAt : 0;
  const difficultyLabel = SUDOKU_DIFFICULTIES[state.difficulty as SudokuDifficulty]?.label ?? state.difficulty;
  const selfFinishedWaitingForOthers = ownProgress.finished && !state.finished;

  const handleSetValue = (index: number, value: number) => {
    playSoundEffect("sudokuPlace");
    setCell(index, value);
  };

  return (
    <main className="flex min-h-screen flex-col items-center gap-5 bg-cozy-gradient px-4 py-6 sm:py-8">
      {firstFinishCelebration}
      <SudokuControls
        roomCode={room.code}
        difficulty={state.difficulty}
        mode={mode}
        startedAt={state.startedAt}
        finished={state.finished}
        moves={ownProgress.moves}
        players={room.players}
        progress={state.progress}
        hintsUsedByPlayer={state.hintsUsedByPlayer}
        selfId={selfId}
        isHost={isHost}
        onKick={room.roomKind === "persistent-duo" ? undefined : kickPlayer}
        onNewPuzzle={(difficulty) => newPuzzle(difficulty)}
        onRestart={resetGame}
        onHint={hint}
        onBack={handleBackToConfig}
      />

      <SudokuBoard
        cells={ownProgress.cells}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onSetValue={handleSetValue}
        players={room.players}
        selfId={selfId}
        locked={ownProgress.finished}
        markedIndices={markedIndices}
        onToggleMark={(index) => setMarkedIndices((current) => {
          const next = new Set(current);
          if (next.has(index)) next.delete(index);
          else next.add(index);
          return next;
        })}
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
        onBack={handleBackToGameSelect}
        onClose={() => setShowWinModal(false)}
      />
    </main>
  );
}
