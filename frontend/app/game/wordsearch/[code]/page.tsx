"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useGameRoom } from "@/hooks/useGameRoom";
import { useWordSearchGame } from "@/hooks/useWordSearchGame";
import WordSearchGrid from "@/components/wordsearch/WordSearchGrid";
import WordSearchWordList from "@/components/wordsearch/WordSearchWordList";
import WordSearchControls from "@/components/wordsearch/WordSearchControls";
import WordSearchResultModal from "@/components/wordsearch/WordSearchResultModal";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { WORDSEARCH_DIFFICULTIES, WordSearchDifficulty, isFullWordSearchProgress } from "@/lib/wordsearchTypes";
import { MatchMode } from "@/lib/matchModes";

export default function WordSearchGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();

  const { room, selfId, notFound } = useGameRoom(code);
  const { state, submitSelection, newPuzzle } = useWordSearchGame(code);

  const [showResultModal, setShowResultModal] = useState(false);
  const wasMatchFinishedRef = useRef(false);

  const ownProgressRaw = selfId && state ? state.progress[selfId] : undefined;
  const ownProgress = ownProgressRaw && isFullWordSearchProgress(ownProgressRaw) ? ownProgressRaw : null;

  useEffect(() => {
    if (state?.finished && !wasMatchFinishedRef.current) {
      setShowResultModal(true);
    }
    wasMatchFinishedRef.current = Boolean(state?.finished);
  }, [state?.finished, state?.finishedAt]);

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
    return <LoadingScreen label="Escondendo as palavras..." />;
  }

  const difficultyLabel = WORDSEARCH_DIFFICULTIES[state.difficulty as WordSearchDifficulty]?.label ?? state.difficulty;
  const mode = state.mode as MatchMode;
  const foundCount = Object.keys(ownProgress.found).length;
  const selfFinishedWaitingForOthers = ownProgress.finished && !state.finished;

  return (
    <main className="flex min-h-screen flex-col items-center gap-5 bg-cozy-gradient px-4 py-6 sm:py-8">
      <WordSearchControls
        roomCode={room.code}
        difficulty={state.difficulty}
        mode={mode}
        startedAt={state.startedAt}
        finished={state.finished}
        foundCount={foundCount}
        totalCount={state.words.length}
        players={room.players}
        onNewPuzzle={(difficulty) => newPuzzle(difficulty)}
        onBack={() => router.push("/")}
      />

      <WordSearchGrid
        size={state.size}
        letters={state.letters}
        words={state.words}
        onSubmitSelection={submitSelection}
        locked={ownProgress.finished}
      />

      <WordSearchWordList words={state.words} />

      <AnimatePresence>
        {selfFinishedWaitingForOthers && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="glass-panel fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-medium text-ink shadow-soft"
          >
            Você encontrou tudo! Aguardando seu par concluir...
          </motion.div>
        )}
        {state.finished && !showResultModal && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowResultModal(true)}
            className="glass-panel fixed bottom-4 left-4 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-ink shadow-soft"
          >
            <Sparkles size={16} className="text-rose" />
            Ver resultado
          </motion.button>
        )}
      </AnimatePresence>

      <WordSearchResultModal
        visible={showResultModal}
        mode={mode}
        difficultyLabel={difficultyLabel}
        selfId={selfId}
        players={room.players}
        results={state.results}
        selfTimeMs={ownProgress.timeMs}
        selfMistakes={ownProgress.mistakes}
        onNewPuzzle={() => {
          setShowResultModal(false);
          newPuzzle(state.difficulty);
        }}
        onBack={() => router.push("/")}
        onClose={() => setShowResultModal(false)}
      />
    </main>
  );
}
