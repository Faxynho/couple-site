"use client";

import { useRouter } from "next/navigation";
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

  // O imageId que vem do servidor já É o caminho direto da imagem
  // (ex.: "/images/puzzle/aurora.jpg") — não precisa mais de catálogo/lookup.
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