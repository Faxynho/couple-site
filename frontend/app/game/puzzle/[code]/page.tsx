"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGameRoom } from "@/hooks/useGameRoom";
import { usePuzzle } from "@/hooks/usePuzzle";
import PuzzleBoard from "@/components/PuzzleBoard";
import SidePanel from "@/components/SidePanel";
import WinModal from "@/components/WinModal";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { PUZZLE_IMAGES } from "@/lib/games";

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

  const imageSrc = PUZZLE_IMAGES.find((img) => img.id === state.imageId)?.file ?? PUZZLE_IMAGES[0].file;
  const finalElapsed = state.solved && state.solvedAt ? state.solvedAt - state.startedAt : 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-5 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <Logo size={36} />
        <span className="rounded-full bg-white/60 px-4 py-1.5 text-sm font-medium text-ink-soft">
          Sala {room.code}
        </span>
      </motion.div>

      <div className="flex flex-col-reverse gap-6 sm:flex-row">
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
        <SidePanel
          startedAt={state.startedAt}
          solved={state.solved}
          solvedAt={state.solvedAt}
          moves={state.moves}
          players={room.players}
          onRestart={resetGame}
          onNewImage={() => {
            const currentIndex = PUZZLE_IMAGES.findIndex((img) => img.id === state.imageId);
            const next = PUZZLE_IMAGES[(currentIndex + 1) % PUZZLE_IMAGES.length];
            newImage(next.id);
          }}
          onBack={() => router.push("/")}
        />
      </div>

      <WinModal
        visible={state.solved}
        elapsedLabel={formatFinalTime(finalElapsed)}
        moves={state.moves}
        onPlayAgain={resetGame}
        onBack={() => router.push("/")}
      />
    </main>
  );
}
