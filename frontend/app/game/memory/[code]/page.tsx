"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useRoomSession } from "@/hooks/useRoomSession";
import { useMemoryGame } from "@/hooks/useMemoryGame";
import { useMemorySounds } from "@/hooks/useMemorySounds";
import MemoryBoard from "@/components/memory/MemoryBoard";
import MemoryControls from "@/components/memory/MemoryControls";
import MemoryResultModal from "@/components/memory/MemoryResultModal";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import Logo from "@/components/Logo";

export default function MemoryGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();
  const { room, selfId, notFound, kicked, backToConfig, backToGameSelect, kickPlayer } = useRoomSession(code);
  const { state, flipCard, newGame } = useMemoryGame(code);
  const [showResult, setShowResult] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const wasFinished = useRef(false);
  const wasOwnFinished = useRef(false);
  const previousProgress = useRef<{ pairsFound: number; mistakes: number } | null>(null);
  const { play } = useMemorySounds();

  useEffect(() => {
    if (!room) return;
    if (room.gameId !== "memory" || (room.status !== "playing" && room.status !== "finished")) {
      router.push(room.roomMode === "duo" ? `/sala/${room.code}` : "/solo");
    }
  }, [room, router]);

  useEffect(() => {
    const ownProgress = selfId && state ? state.progress[selfId] : undefined;
    const ownFinished = Boolean(ownProgress?.finished);
    const justFinished = ownFinished && !wasOwnFinished.current && previousProgress.current !== null;
    let celebrationTimer: ReturnType<typeof setTimeout> | undefined;

    if (justFinished) {
      setCelebrating(true);
      play("victory");
      if (state?.finished) {
        celebrationTimer = setTimeout(() => {
          setCelebrating(false);
          setShowResult(true);
        }, 1_100);
      }
    } else if (state?.finished && !wasFinished.current) {
      setShowResult(true);
      setCelebrating(false);
    } else if (!state?.finished && wasFinished.current) {
      setShowResult(false);
      setCelebrating(false);
    }

    wasOwnFinished.current = ownFinished;
    wasFinished.current = Boolean(state?.finished);

    if (ownProgress) {
      const previous = previousProgress.current;
      if (previous) {
        if (ownProgress.pairsFound > previous.pairsFound) {
          play("match");
          if (ownProgress.combo >= 2) play("combo");
        } else if (ownProgress.mistakes > previous.mistakes) {
          play("wrong");
        }
      }
      previousProgress.current = { pairsFound: ownProgress.pairsFound, mistakes: ownProgress.mistakes };
    }

    return () => {
      if (celebrationTimer) clearTimeout(celebrationTimer);
    };
  }, [play, selfId, state]);

  if (kicked) return null;
  if (notFound) {
    return <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center"><Logo size={44} /><p className="text-ink-soft">Não encontramos essa sala. Ela pode ter expirado ou o link está incorreto.</p><Button onClick={() => router.push("/")}>Voltar para o início</Button></main>;
  }
  if (!room || !state || room.gameId !== "memory" || !selfId || !state.progress[selfId]) {
    return <LoadingScreen label="Preparando o jogo da memória..." />;
  }

  const ownProgress = state.progress[selfId];
  const isHost = room.hostId === selfId;
  const previewing = state.playStartedAt === null;
  const locked = state.finished || ownProgress.finished;
  const completedWhileOpponentPlays = state.mode === "duel" && ownProgress.finished && !state.finished;
  const handleFlip = (slotId: string) => {
    play("flip");
    flipCard(slotId);
  };

  const handleBackToConfig = () => {
    if (room.roomMode === "duo") {
      backToConfig();
      router.push(`/sala/${room.code}`);
    } else router.push("/solo");
  };
  const handleBackToGames = () => {
    if (room.roomMode === "duo") {
      backToGameSelect();
      router.push(`/sala/${room.code}`);
    } else router.push("/solo");
  };

  return (
    <main className="flex min-h-screen flex-col items-center gap-5 bg-cozy-gradient px-4 py-6 sm:py-8">
      <MemoryControls
        roomCode={room.code}
        difficulty={state.difficulty}
        mode={state.mode}
        pairCount={state.pairCount}
        previewEndsAt={state.previewEndsAt}
        deadlineAt={state.deadlineAt}
        progress={state.progress}
        players={room.players}
        selfId={selfId}
        isHost={isHost}
        onKick={kickPlayer}
        onNewGame={newGame}
        onBack={handleBackToConfig}
      />

      <AnimatePresence mode="wait">
        {previewing ? (
          <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-center">
            <h1 className="font-display text-xl font-semibold text-ink">Memorize as posições</h1>
            <p className="mt-1 text-sm text-ink-soft">Em instantes, as cartas vão virar.</p>
          </motion.div>
        ) : completedWhileOpponentPlays ? (
          <motion.div key="waiting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel w-full max-w-md rounded-xl3 p-5 text-center">
            <h1 className="font-display text-lg font-semibold text-ink">Seu tabuleiro está completo!</h1>
            <p className="mt-1 text-sm text-ink-soft">Seu resultado foi guardado. Seu par continua jogando até terminar ou o tempo acabar.</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <MemoryBoard slots={state.slots} rows={state.rows} cols={state.cols} progress={ownProgress} previewing={previewing} locked={locked} onFlip={handleFlip} celebrating={celebrating} />

      {ownProgress.mismatchUntil !== null && !state.finished && <p className="text-sm text-rose-deep">Quase! Observe bem esse par antes das cartas virarem.</p>}

      {state.finished && !showResult && (
        <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.95 }} onClick={() => setShowResult(true)} className="glass-panel fixed bottom-4 left-4 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-ink shadow-soft">
          <Sparkles size={16} className="text-rose" /> Ver resultado
        </motion.button>
      )}

      <MemoryResultModal visible={showResult} mode={state.mode} results={state.results} players={room.players} selfId={selfId} onClose={() => setShowResult(false)} onNewGame={() => { setShowResult(false); newGame(state.difficulty); }} onBack={handleBackToGames} />
    </main>
  );
}
