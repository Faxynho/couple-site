"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useRoomSession } from "@/hooks/useRoomSession";
import { useQuizGame } from "@/hooks/useQuizGame";
import QuizControls from "@/components/quiz/QuizControls";
import QuizQuestionCard from "@/components/quiz/QuizQuestionCard";
import QuizPlayersBar from "@/components/quiz/QuizPlayersBar";
import QuizResultModal from "@/components/quiz/QuizResultModal";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { playSoundEffect } from "@/lib/sound";

function isQuizWinner(state: { expectedPlayers: string[]; players: Record<string, { score: number }> }, selfId: string | null) {
  if (!selfId || state.expectedPlayers.length !== 2) return false;
  const opponentId = state.expectedPlayers.find((id) => id !== selfId);
  return opponentId ? (state.players[selfId]?.score ?? 0) > (state.players[opponentId]?.score ?? 0) : false;
}

export default function QuizGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();

  const { room, selfId, notFound, kicked, backToConfig, backToGameSelect, kickPlayer } = useRoomSession(code);
  const { state, submitAnswer, newGame } = useQuizGame(code);

  const [showResultModal, setShowResultModal] = useState(false);
  const wasFinishedRef = useRef(false);
  const previousAnswerKey = useRef<string | null>(null);

  useEffect(() => {
    if (kicked) router.push("/?aviso=expulso");
  }, [kicked, router]);

  useEffect(() => {
    if (!room) return;
    if (room.gameId !== "quiz" || (room.status !== "playing" && room.status !== "finished")) {
      if (room.roomMode === "duo") {
        router.push(`/sala/${room.code}`);
      } else {
        router.push("/solo");
      }
    }
  }, [room, router]);

  useEffect(() => {
    if (state?.finished && !wasFinishedRef.current) {
      if (state.mode !== "duel" || isQuizWinner(state, selfId)) playSoundEffect("victory");
      setShowResultModal(true);
    } else if (!state?.finished && wasFinishedRef.current) {
      // O estado do quiz é sincronizado pelo servidor: quando qualquer um dos
      // dois clica em "Jogar novamente" (ou troca a dificuldade), os dois
      // recebem `finished: false` de volta — então o modal precisa fechar
      // nos dois clientes, não só em quem clicou.
      setShowResultModal(false);
    }
    wasFinishedRef.current = Boolean(state?.finished);
  }, [state?.finished, state?.finishedAt]);

  useEffect(() => {
    const answer = state?.mode === "together"
      ? state.teamAnswers?.[state.currentIndex] ?? null
      : selfId && state
      ? state.players[selfId]?.answers[state.currentIndex] ?? null
      : null;
    const key = answer ? `${state?.currentIndex}:${answer.optionIndex}` : null;
    if (!answer) {
      previousAnswerKey.current = null;
      return;
    }
    if (state?.phase === "revealed" && key !== previousAnswerKey.current) {
      playSoundEffect(answer.correct ? "crosswordCorrect" : "memoryWrong");
      previousAnswerKey.current = key;
    }
  }, [selfId, state?.currentIndex, state?.players, state?.teamAnswers, state?.mode, state?.phase]);

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

  if (!room || !state || room.gameId !== "quiz") {
    return <LoadingScreen label="Sorteando as perguntas..." />;
  }

  const handleAnswer = (optionIndex: number) => {
    playSoundEffect("quizSelect");
    submitAnswer(state.currentIndex, optionIndex);
  };

  const isHost = Boolean(selfId && room.hostId === selfId);
  // Numa sala Duo, "voltar" leva para a configuração (sem sair da sala); numa
  // sala Solo, não há sala para voltar — sai direto para a grade de jogos.
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

  const currentQuestion = state.questions[state.currentIndex];
  const isTogether = state.mode === "together";

  // No modo "Juntos" a resposta é da dupla (a mesma pra os dois); no Solo/Duelo
  // é individual. `computeQuizStats`/pontuação individual não fazem sentido em
  // "Juntos" — lá tudo vem de `teamScore`/`teamAnswers`, compartilhados.
  const ownAnswer = isTogether
    ? state.teamAnswers?.[state.currentIndex] ?? null
    : selfId
    ? state.players[selfId]?.answers[state.currentIndex] ?? null
    : null;
  const revealed = state.phase === "revealed";

  const players = room.players.filter((p) => state.expectedPlayers.includes(p.id));
  const scores: Record<string, number> = {};
  const hasAnswered: Record<string, boolean> = {};
  for (const p of players) {
    scores[p.id] = isTogether ? state.teamScore ?? 0 : state.players[p.id]?.score ?? 0;
    hasAnswered[p.id] = isTogether
      ? state.pendingSelections?.[p.id] != null
      : Boolean(state.players[p.id]?.answers[state.currentIndex]);
  }

  // Só no modo Duelo: identifica o adversário e sua resposta na pergunta
  // atual, para avisar se ele acertou ou errou depois da revelação.
  const opponentPlayer = state.mode === "duel" ? players.find((p) => p.id !== selfId) ?? null : null;
  const opponentResult = opponentPlayer
    ? { name: opponentPlayer.name, answer: state.players[opponentPlayer.id]?.answers[state.currentIndex] ?? null }
    : null;

  // Só no "Juntos": quem é o par, e em qual alternativa cada um está com o
  // dedo em cima agora (antes de confirmar) — pra ajudar a bater a resposta.
  const partnerPlayer = isTogether ? players.find((p) => p.id !== selfId) ?? null : null;
  const togetherPicks = isTogether
    ? {
        selfPick: selfId ? state.pendingSelections?.[selfId] ?? null : null,
        partnerPick: partnerPlayer ? state.pendingSelections?.[partnerPlayer.id] ?? null : null,
        partnerName: partnerPlayer?.name ?? null,
      }
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
        selfId={selfId}
        isHost={isHost}
        onKick={kickPlayer}
        onNewGame={(difficulty) => newGame(difficulty)}
        onBack={handleBackToConfig}
      />

      <QuizPlayersBar players={players} scores={scores} hasAnswered={hasAnswered} selfId={selfId} />

      <AnimatePresence mode="wait">
        {currentQuestion && (
          <QuizQuestionCard
            question={currentQuestion}
            ownAnswer={ownAnswer}
            revealed={revealed}
            onAnswer={handleAnswer}
            mode={state.mode}
            opponent={opponentResult}
            together={togetherPicks}
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
        onBackToGames={handleBackToGameSelect}
        state={state}
        players={players}
        selfId={selfId}
        mode={state.mode}
      />
    </main>
  );
}
