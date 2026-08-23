"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useGameRoom } from "@/hooks/useGameRoom";
import { useQuizGame } from "@/hooks/useQuizGame";
import QuizControls from "@/components/quiz/QuizControls";
import QuizQuestionCard from "@/components/quiz/QuizQuestionCard";
import QuizPlayersBar from "@/components/quiz/QuizPlayersBar";
import QuizResultModal from "@/components/quiz/QuizResultModal";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import Logo from "@/components/Logo";

export default function QuizGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();

  const { room, selfId, notFound } = useGameRoom(code);
  const { state, submitAnswer, newGame } = useQuizGame(code);

  const [showResultModal, setShowResultModal] = useState(false);
  const wasFinishedRef = useRef(false);

  useEffect(() => {
    if (state?.finished && !wasFinishedRef.current) {
      setShowResultModal(true);
    }
    wasFinishedRef.current = Boolean(state?.finished);
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

  if (!room || !state) {
    return <LoadingScreen label="Sorteando as perguntas..." />;
  }

  const currentQuestion = state.questions[state.currentIndex];
  const ownAnswer = selfId ? state.players[selfId]?.answers[state.currentIndex] ?? null : null;
  const revealed = state.phase === "revealed";

  const players = room.players.filter((p) => state.expectedPlayers.includes(p.id));
  const scores: Record<string, number> = {};
  const hasAnswered: Record<string, boolean> = {};
  for (const p of players) {
    scores[p.id] = state.players[p.id]?.score ?? 0;
    hasAnswered[p.id] = Boolean(state.players[p.id]?.answers[state.currentIndex]);
  }

  // Só no modo Duelo: identifica o adversário e sua resposta na pergunta
  // atual, para avisar se ele acertou ou errou depois da revelação.
  const opponentPlayer = state.mode === "duel" ? players.find((p) => p.id !== selfId) ?? null : null;
  const opponentResult = opponentPlayer
    ? { name: opponentPlayer.name, answer: state.players[opponentPlayer.id]?.answers[state.currentIndex] ?? null }
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center gap-5 bg-cozy-gradient px-4 py-6 sm:py-8">
      <QuizControls
        roomCode={room.code}
        difficulty={state.difficulty}
        mode={state.mode}
        questionIndex={state.currentIndex}
        totalQuestions={state.questions.length}
        phase={state.phase}
        questionStartedAt={state.questionStartedAt}
        timeLimitMs={state.timeLimitMs}
        players={players}
        onNewGame={(difficulty) => newGame(difficulty)}
        onBack={() => router.push("/")}
      />

      <QuizPlayersBar players={players} scores={scores} hasAnswered={hasAnswered} selfId={selfId} />

      <AnimatePresence mode="wait">
        {currentQuestion && (
          <QuizQuestionCard
            question={currentQuestion}
            ownAnswer={ownAnswer}
            revealed={revealed}
            onAnswer={(optionIndex) => submitAnswer(state.currentIndex, optionIndex)}
            opponent={opponentResult}
          />
        )}
      </AnimatePresence>

      <QuizResultModal
        open={showResultModal}
        onClose={() => setShowResultModal(false)}
        onReopen={() => setShowResultModal(true)}
        onPlayAgain={() => {
          setShowResultModal(false);
          newGame(state.difficulty);
        }}
        onBackToGames={() => router.push("/")}
        state={state}
        players={players}
        selfId={selfId}
        mode={state.mode}
      />
    </main>
  );
}
