"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useGameRoom } from "@/hooks/useGameRoom";
import { usePuzzle } from "@/hooks/usePuzzle";
import PuzzleBoard from "@/components/PuzzleBoard";
import SidePanel from "@/components/SidePanel";
import WinModal from "@/components/WinModal";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { usePuzzleImages } from "@/hooks/usePuzzleImages";

function formatFinalTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function PuzzleGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();

  const { room, selfId, notFound } = useGameRoom(code);
  const { state, remoteDrags, pickup, drag, drop, resetGame, newImage } = usePuzzle(code);
  const { images } = usePuzzleImages();

  // "Resolvido" (estado do jogo, permanente) é separado de "modal aberto"
  // (estado local, pode ser fechado/reaberto sem afetar o jogo em nada).
  const [showWinModal, setShowWinModal] = useState(false);
  const wasSolvedRef = useRef(false);

  useEffect(() => {
    if (state?.solved && !wasSolvedRef.current) {
      setShowWinModal(true);
    }
    wasSolvedRef.current = Boolean(state?.solved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.solved, state?.solvedAt]);

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <Logo size={44} />
        <p className="text-ink-soft">
          Não encontramos essa sala. Ela pode ter expirado ou o link está incorreto.
        </p>
        <Button onClick={() => router.push("/")}>Voltar para o início</Button>
      </main>
    );
  }

  if (!room || !state) {
    return <LoadingScreen label="Preparando o quebra-cabeça..." />;
  }

  const imageSrc = state.imageId;
  const finalElapsed = state.solved && state.solvedAt ? state.solvedAt - state.startedAt : 0;

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-cozy-gradient">
      <div className="relative flex-1">
        <PuzzleBoard
          state={state}
          imageSrc={imageSrc}
          selfId={selfId}
          players={room.players}
          remoteDrags={remoteDrags}
          onPickup={pickup}
          onDrag={drag}
          onDrop={drop}
        />

        {/* HUD flutuante — não ocupa espaço do quadro, só sobrepõe no canto */}
        <div className="pointer-events-none absolute left-3 top-3 right-3 sm:left-4 sm:top-4">
          <SidePanel
            roomCode={room.code}
            startedAt={state.startedAt}
            solved={state.solved}
            solvedAt={state.solvedAt}
            moves={state.moves}
            players={room.players}
            onRestart={resetGame}
            onNewImage={() => {
              if (images.length === 0) return;
              const currentIndex = images.findIndex((img) => img.file === state.imageId);
              const next = images[(currentIndex + 1) % images.length];
              newImage(next.file, state.difficulty, next.width, next.height);
            }}
            onBack={() => router.push("/")}
          />
        </div>

        {/* Botão discreto para reabrir o resumo da vitória depois de fechado */}
        <AnimatePresence>
          {state.solved && !showWinModal && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setShowWinModal(true)}
              className="glass-panel pointer-events-auto absolute bottom-4 left-4 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-ink shadow-soft"
            >
              <Sparkles size={16} className="text-rose" />
              Ver resultado
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <WinModal
        visible={showWinModal}
        elapsedLabel={formatFinalTime(finalElapsed)}
        moves={state.moves}
        onPlayAgain={resetGame}
        onBack={() => router.push("/")}
        onClose={() => setShowWinModal(false)}
      />
    </main>
  );
}
