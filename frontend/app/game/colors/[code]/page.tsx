"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useGameRoom } from "@/hooks/useGameRoom";
import { useColorGame } from "@/hooks/useColorGame";
import ColorMemorizeView from "@/components/colors/ColorMemorizeView";
import ColorPicker from "@/components/colors/ColorPicker";
import ColorRoundResult from "@/components/colors/ColorRoundResult";
import SeerLiveView from "@/components/colors/SeerLiveView";
import ColorsControls from "@/components/colors/ColorsControls";
import ColorsWinModal from "@/components/colors/ColorsWinModal";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { COLOR_DIFFICULTIES, ColorDifficulty } from "@/lib/colorTypes";

export default function ColorsGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();

  const { room, selfId, notFound } = useGameRoom(code);
  const { state, livePreview, submitGuess, nextRound, newGame, sendLivePreview } = useColorGame(code);

  const [localPhase, setLocalPhase] = useState<"memorize" | "guess">("memorize");
  const [showWinModal, setShowWinModal] = useState(false);
  const wasFinishedRef = useRef(false);

  useEffect(() => {
    setLocalPhase("memorize");
  }, [state?.currentRound]);

  useEffect(() => {
    if (state?.finished && !wasFinishedRef.current) {
      setShowWinModal(true);
    } else if (!state?.finished && wasFinishedRef.current) {
      // O estado é sincronizado pelo servidor: quando qualquer um dos dois
      // clica em "Jogar de novo", os dois recebem `finished: false` de
      // volta — o modal precisa fechar nos dois clientes, não só em quem clicou.
      setShowWinModal(false);
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
    return <LoadingScreen label="Preparando as cores..." />;
  }

  const isCooperative = state.mode === "cooperative";
  const isSeer = isCooperative && selfId === state.seerId;
  const isGuesser = isCooperative && selfId === state.guesserId;
  const seerName = room.players.find((p) => p.id === state.seerId)?.name ?? "seu par";
  const guesserName = room.players.find((p) => p.id === state.guesserId)?.name ?? "seu par";

  const connectedPlayers = room.players.filter((p) => p.connected);
  const currentRoundState = state.rounds[state.currentRound];
  const currentGuesses = currentRoundState?.guesses ?? {};
  const myGuess = selfId ? currentGuesses[selfId] : undefined;
  const allSubmitted = isCooperative
    ? Boolean(state.guesserId && currentGuesses[state.guesserId])
    : connectedPlayers.length > 0 && connectedPlayers.every((p) => currentGuesses[p.id]);

  const scores: Record<string, number> = {};
  if (isCooperative && state.guesserId) {
    const sharedTotal = state.rounds.reduce((sum, r) => sum + (r.guesses[state.guesserId as string]?.score ?? 0), 0);
    for (const player of room.players) scores[player.id] = sharedTotal;
  } else {
    for (const player of room.players) {
      scores[player.id] = state.rounds.reduce((sum, r) => sum + (r.guesses[player.id]?.score ?? 0), 0);
    }
  }
  const maxScore = state.totalRounds * 10;

  const memorizeDurationMs = state.difficulty === "hard" ? 4000 : 5500;
  const difficultyLabel = COLOR_DIFFICULTIES[state.difficulty as ColorDifficulty]?.label ?? state.difficulty;

  const handleSubmitGuess = (h: number, s: number, v: number) => {
    submitGuess(state.currentRound, h, s, v);
  };

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-cozy-gradient px-4 py-6 sm:py-8">
      <ColorsControls
        roomCode={room.code}
        difficulty={state.difficulty}
        mode={state.mode}
        seerId={state.seerId}
        guesserId={state.guesserId}
        currentRound={state.currentRound}
        totalRounds={state.totalRounds}
        players={room.players}
        selfId={selfId}
        scores={scores}
        onBack={() => router.push("/")}
      />

      <AnimatePresence initial={false}>
        {state.finished ? (
          <motion.div
            key="finished"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="glass-panel flex w-full max-w-sm flex-col items-center gap-3 rounded-xl3 p-7 text-center"
          >
            <span className="text-4xl">🎨</span>
            <h2 className="font-display text-lg font-semibold text-ink">Partida concluída!</h2>
            <p className="text-sm text-ink-soft">Confira o placar final.</p>
          </motion.div>
        ) : allSubmitted && currentRoundState ? (
          <ColorRoundResult
            key={`result-${state.currentRound}`}
            round={state.currentRound}
            totalRounds={state.totalRounds}
            target={currentRoundState.target}
            guesses={currentGuesses}
            players={room.players}
            selfId={selfId}
            onNext={nextRound}
            mode={state.mode}
            guesserId={state.guesserId}
          />
        ) : isCooperative && isSeer && currentRoundState ? (
          <SeerLiveView
            key={`seer-${state.currentRound}`}
            hex={currentRoundState.target.hex}
            round={state.currentRound}
            totalRounds={state.totalRounds}
            guesserName={guesserName}
            livePreview={livePreview}
          />
        ) : isCooperative && isGuesser ? (
          <ColorPicker
            key={`guess-coop-${state.currentRound}`}
            round={state.currentRound}
            totalRounds={state.totalRounds}
            hint={`${seerName} está vendo a cor e vai te guiar`}
            onChange={sendLivePreview}
            onSubmit={handleSubmitGuess}
          />
        ) : isCooperative ? (
          <motion.div
            key="sync"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="glass-panel flex w-full max-w-sm flex-col items-center gap-2 rounded-xl3 p-7 text-center"
          >
            <p className="text-sm text-ink-soft">Sincronizando papéis da dupla...</p>
          </motion.div>
        ) : myGuess ? (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex w-full max-w-md flex-col items-center gap-4"
          >
            <p className="text-xs uppercase tracking-wide text-ink-soft">
              Rodada {state.currentRound + 1} de {state.totalRounds}
            </p>
            <div
              className="aspect-[4/5] w-full rounded-xl3 shadow-glow sm:aspect-square"
              style={{ background: myGuess.hex }}
            />
            <div className="glass-panel flex w-full flex-col items-center gap-1 rounded-xl3 p-5 text-center">
              <p className="text-sm font-medium text-ink">Palpite enviado!</p>
              <p className="text-xs text-ink-soft">Aguardando seu par enviar o palpite dessa rodada...</p>
            </div>
          </motion.div>
        ) : localPhase === "memorize" && currentRoundState ? (
          <ColorMemorizeView
            key={`memorize-${state.currentRound}`}
            hex={currentRoundState.target.hex}
            round={state.currentRound}
            totalRounds={state.totalRounds}
            durationMs={memorizeDurationMs}
            onDone={() => setLocalPhase("guess")}
          />
        ) : (
          <ColorPicker
            key={`guess-${state.currentRound}`}
            round={state.currentRound}
            totalRounds={state.totalRounds}
            onSubmit={handleSubmitGuess}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
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

      <ColorsWinModal
        visible={showWinModal}
        players={room.players}
        selfId={selfId}
        scores={scores}
        maxScore={maxScore}
        difficultyLabel={difficultyLabel}
        mode={state.mode}
        onNewGame={() => {
          setShowWinModal(false);
          newGame(state.difficulty);
        }}
        onBack={() => router.push("/")}
        onClose={() => setShowWinModal(false)}
      />
    </main>
  );
}
