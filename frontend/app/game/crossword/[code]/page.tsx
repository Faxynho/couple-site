"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useGameRoom } from "@/hooks/useGameRoom";
import { useCrosswordGame } from "@/hooks/useCrosswordGame";
import CrosswordGrid from "@/components/crossword/CrosswordGrid";
import CluesList from "@/components/crossword/CluesList";
import CrosswordControls from "@/components/crossword/CrosswordControls";
import CrosswordResultModal from "@/components/crossword/CrosswordResultModal";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { CROSSWORD_DIFFICULTIES, CrosswordDifficulty, CrosswordDirection, isFullProgress } from "@/lib/crosswordTypes";
import { MatchMode } from "@/lib/matchModes";

export default function CrosswordGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();

  const { room, selfId, notFound } = useGameRoom(code);
  const { state, setCell, newPuzzle } = useCrosswordGame(code);

  const [selected, setSelected] = useState<number | null>(null);
  const [direction, setDirection] = useState<CrosswordDirection>("across");
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const wasMatchFinishedRef = useRef(false);
  const wasSelfFinishedRef = useRef(false);

  const ownProgressRaw = selfId && state ? state.progress[selfId] : undefined;
  const ownProgress = ownProgressRaw && isFullProgress(ownProgressRaw) ? ownProgressRaw : null;

  useEffect(() => {
    if (state?.finished && !wasMatchFinishedRef.current) {
      setShowResultModal(true);
    } else if (!state?.finished && wasMatchFinishedRef.current) {
      // O estado é sincronizado pelo servidor: quando qualquer um dos dois
      // clica em "Jogar de novo", os dois recebem `finished: false` de
      // volta — o modal precisa fechar nos dois clientes, não só em quem clicou.
      setShowResultModal(false);
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
    return <LoadingScreen label="Montando a grade..." />;
  }

  const difficultyLabel = CROSSWORD_DIFFICULTIES[state.difficulty as CrosswordDifficulty]?.label ?? state.difficulty;
  const mode = state.mode as MatchMode;
  const selfFinishedWaitingForOthers = ownProgress.finished && !state.finished;

  return (
    <main className="flex min-h-screen flex-col items-center gap-5 bg-cozy-gradient px-4 py-6 sm:py-8">
      <CrosswordControls
        roomCode={room.code}
        difficulty={state.difficulty}
        mode={mode}
        startedAt={state.startedAt}
        finished={state.finished}
        players={room.players}
        progress={state.progress}
        selfId={selfId}
        onNewPuzzle={(difficulty) => newPuzzle(difficulty)}
        onBack={() => router.push("/")}
      />

      <CrosswordGrid
        rows={state.rows}
        cols={state.cols}
        cells={state.cells}
        words={state.words}
        values={ownProgress.values}
        completedWordIds={ownProgress.completedWordIds}
        onSetValue={setCell}
        locked={ownProgress.finished}
        selected={selected}
        direction={direction}
        onSelectedChange={setSelected}
        onDirectionChange={setDirection}
        onActiveWordChange={setActiveWordId}
      />

      <CluesList
        words={state.words}
        completedWordIds={ownProgress.completedWordIds}
        activeWordId={activeWordId}
        onSelectWord={(word) => {
          setDirection(word.direction);
          setSelected(word.row * state.cols + word.col);
        }}
      />

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

      <CrosswordResultModal
        visible={showResultModal}
        mode={mode}
        difficultyLabel={difficultyLabel}
        selfId={selfId}
        players={room.players}
        results={state.results}
        selfTimeMs={ownProgress.timeMs}
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
