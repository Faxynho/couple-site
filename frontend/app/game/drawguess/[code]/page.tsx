"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Clock3, Crown, Pencil, Send, Sparkles } from "lucide-react";
import AccountAvatar from "@/components/account/AccountAvatar";
import Button from "@/components/Button";
import Confetti from "@/components/Confetti";
import DrawGuessCanvas from "@/components/drawguess/DrawGuessCanvas";
import LoadingScreen from "@/components/LoadingScreen";
import { useAccountPhotos } from "@/hooks/useAccountPhotos";
import { useDrawGuessGame } from "@/hooks/useDrawGuessGame";
import { useRoomSession } from "@/hooks/useRoomSession";
import { averageDrawGuessTime, formatDrawGuessTime } from "@/lib/drawGuessTypes";
import { playSoundEffect } from "@/lib/sound";
import styles from "./DrawGuessGame.module.css";

export default function DrawGuessGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();
  const { room, selfId, notFound, kicked, backToConfig, backToGameSelect } = useRoomSession(code);
  const game = useDrawGuessGame(code);
  const photos = useAccountPhotos();
  const [guess, setGuess] = useState("");
  const [clockNow, setClockNow] = useState(Date.now());
  const serverOffsetRef = useRef(0);
  const lastResultRoundRef = useRef(0);
  const victoryPlayedRef = useRef(false);

  useEffect(() => {
    if (kicked) router.push("/?aviso=expulso");
  }, [kicked, router]);

  useEffect(() => {
    if (!room) return;
    if (room.gameId !== "drawguess" || (room.status !== "playing" && room.status !== "finished")) {
      router.push(room.roomMode === "duo" ? `/sala/${room.code}` : "/duo");
    }
  }, [room, router]);

  useEffect(() => {
    if (!game.state) return;
    serverOffsetRef.current = game.state.serverNow - Date.now();
    setClockNow(Date.now());
  }, [game.state?.serverNow, game.state?.roundDeadlineAt]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const result = game.state?.lastRoundResult;
    if (!result || result.round === lastResultRoundRef.current) return;
    lastResultRoundRef.current = result.round;
    playSoundEffect(result.reason === "correct" ? "crosswordCorrect" : "memoryWrong");
    setGuess("");
    game.emitTyping("");
  }, [game.emitTyping, game.state?.lastRoundResult]);

  useEffect(() => {
    if (!game.state?.winnerId) {
      victoryPlayedRef.current = false;
      return;
    }
    if (!victoryPlayedRef.current && game.state.winnerId === selfId) {
      victoryPlayedRef.current = true;
      playSoundEffect("victory");
    }
  }, [game.state?.winnerId, selfId]);

  const players = useMemo(
    () => room?.players.filter((player) => game.state?.expectedPlayers.includes(player.id)) ?? [],
    [room?.players, game.state?.expectedPlayers]
  );
  const playerName = (id: string | null) => players.find((player) => player.id === id)?.name ?? "Jogador";

  if (kicked) return null;
  if (notFound) return <main className="grid min-h-screen place-items-center p-5 text-center"><div><p className="text-ink-soft">Essa sala não existe mais.</p><Button onClick={() => router.push("/duo")}>Voltar</Button></div></main>;
  if (!room || !game.state || room.gameId !== "drawguess") return <LoadingScreen label="Preparando as tintas..." />;

  const state = game.state;
  const isDrawer = selfId === state.drawerId;
  const isGuesser = selfId === state.guesserId;
  const isHost = room.roomKind === "persistent-duo" || Boolean(selfId && room.hostId === selfId);
  const effectiveNow = state.pausedAt ?? clockNow + serverOffsetRef.current;
  const remainingMs = state.phase === "playing" ? Math.max(0, state.roundDeadlineAt - effectiveNow) : state.lastRoundResult?.remainingMs ?? 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const disconnectedPlayer = players.find((player) => !player.connected) ?? null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = guess.trim();
    if (!value || !isGuesser || state.phase !== "playing" || state.pausedAt !== null) return;
    game.submitGuess(value);
    setGuess("");
    game.emitTyping("");
  };

  const goToConfig = () => {
    if (!isHost) return;
    backToConfig();
    router.push(`/sala/${room.code}`);
  };
  const goToGames = () => {
    if (!isHost) return;
    backToGameSelect();
    router.push(`/sala/${room.code}`);
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <button type="button" onClick={goToConfig} disabled={!isHost} aria-label="Voltar para configuração" className={styles.iconButton}><ArrowLeft size={17} /></button>
        <div className={styles.roundPill}>Rodada <strong>{state.currentRound}</strong>/{state.totalRounds}{state.tiebreakPairs > 0 ? " · desempate" : ""}</div>
        <div className={`${styles.timer} ${remainingSeconds <= 10 ? styles.timerDanger : ""}`}><Clock3 size={15} /><strong>{remainingSeconds}s</strong></div>
      </header>

      <section className={styles.scoreboard} aria-label="Placar">
        {players.map((player) => {
          const drawing = player.id === state.drawerId;
          return (
            <div key={player.id} className={`${styles.playerCard} ${drawing ? styles.playerDrawing : ""}`}>
              <AccountAvatar name={player.name} photo={player.accountId ? photos[player.accountId] : undefined} accountId={player.accountId} fallbackColor={player.color} size={34} />
              <div className={styles.playerInfo}><strong>{player.id === selfId ? "Você" : player.name}</strong><span>{drawing ? "desenhando" : "adivinhando"}</span></div>
              <b>{state.scores[player.id] ?? 0}</b>
            </div>
          );
        })}
      </section>

      <section className={styles.wordBar}>
        <span>{isDrawer ? <Pencil size={14} /> : <Sparkles size={14} />}</span>
        <p>{isDrawer ? "Desenhe:" : "A palavra é:"} <strong>{state.word ?? state.maskedWord}</strong></p>
        <small>{isDrawer ? `${playerName(state.guesserId)} tenta adivinhar` : `${playerName(state.drawerId)} está desenhando`}</small>
      </section>

      <section className={styles.playArea}>
        <DrawGuessCanvas
          actions={state.canvasActions}
          revision={state.canvasRevision}
          preview={game.preview}
          canDraw={isDrawer && state.phase === "playing" && state.pausedAt === null}
          canUndo={state.canUndo}
          canRedo={state.canRedo}
          onPreview={game.sendPreview}
          onAction={game.sendCanvasAction}
          onHistory={game.changeHistory}
        />

        <div className={styles.chatPanel}>
          <div className={styles.attempts} aria-live="polite">
            {state.attempts.length === 0 ? <span className={styles.emptyAttempts}>As tentativas aparecem aqui.</span> : state.attempts.slice(-3).map((attempt) => (
              <span key={attempt.id} className={attempt.correct ? styles.correctAttempt : ""}><b>{playerName(attempt.playerId)}:</b> {attempt.text}</span>
            ))}
          </div>
          {isGuesser ? (
            <form onSubmit={submit} className={styles.guessForm}>
              <input
                value={guess}
                onChange={(event) => { setGuess(event.target.value); game.emitTyping(event.target.value); }}
                disabled={state.phase !== "playing" || state.pausedAt !== null}
                maxLength={80}
                autoComplete="off"
                enterKeyHint="send"
                placeholder="Digite seu palpite..."
                aria-label="Seu palpite"
              />
              <button type="submit" disabled={!guess.trim() || state.phase !== "playing"}><Send size={16} /><span>Enviar</span></button>
            </form>
          ) : (
            <div className={styles.typingMirror}>{game.typingText ? <><b>{playerName(state.guesserId)} está digitando:</b> {game.typingText}</> : <span>Esperando o palpite de {playerName(state.guesserId)}...</span>}</div>
          )}
        </div>
      </section>

      {game.error ? <p className={styles.error} role="alert">{game.error}</p> : null}

      <AnimatePresence>
        {state.phase === "roundResult" && state.lastRoundResult ? <RoundResult state={state} playerName={playerName} /> : null}
        {state.phase === "finished" ? <FinalResult state={state} players={players} selfId={selfId} isHost={isHost} onAgain={game.newGame} onConfig={goToConfig} onGames={goToGames} /> : null}
        {state.pausedAt !== null && state.phase !== "finished" ? (
          <motion.div className={styles.pauseOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={styles.pauseCard}><span>⏸️</span><strong>Partida pausada</strong><p>Aguardando {disconnectedPlayer?.name ?? "seu par"} voltar. O relógio também parou.</p></div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function RoundResult({ state, playerName }: { state: NonNullable<ReturnType<typeof useDrawGuessGame>["state"]>; playerName: (id: string | null) => string }) {
  const result = state.lastRoundResult!;
  return (
    <motion.div className={styles.roundOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className={styles.roundCard} initial={{ scale: 0.9, y: 14 }} animate={{ scale: 1, y: 0 }}>
        <span className={styles.resultEmoji}>{result.reason === "correct" ? "🎉" : "⏰"}</span>
        <strong>{result.reason === "correct" ? `${playerName(result.guesserId)} acertou!` : "Tempo acabou"}</strong>
        <p>A palavra era <b>{result.word}</b></p>
        <div><span>+{result.guesserPoints} adivinhador</span><span>+{result.drawerPoints} desenhista</span></div>
        <small>Próxima rodada em instantes...</small>
      </motion.div>
    </motion.div>
  );
}

function FinalResult({ state, players, selfId, isHost, onAgain, onConfig, onGames }: {
  state: NonNullable<ReturnType<typeof useDrawGuessGame>["state"]>;
  players: { id: string; name: string }[];
  selfId: string | null;
  isHost: boolean;
  onAgain: () => void;
  onConfig: () => void;
  onGames: () => void;
}) {
  const winner = players.find((player) => player.id === state.winnerId);
  return (
    <motion.div className={styles.finalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {state.winnerId === selfId ? <Confetti /> : null}
      <motion.div className={styles.finalCard} initial={{ scale: 0.92, y: 18 }} animate={{ scale: 1, y: 0 }}>
        <Crown size={30} />
        <small>Fim da partida</small>
        <h1>{winner ? `${winner.id === selfId ? "Você" : winner.name} venceu!` : "Empate!"}</h1>
        <div className={styles.finalScores}>
          {players.map((player) => {
            const stats = state.playerStats[player.id];
            return <div key={player.id}><strong>{player.id === selfId ? "Você" : player.name}</strong><b>{state.scores[player.id] ?? 0} pts</b><span>{stats?.correctGuesses ?? 0} acertos</span><span>Média {formatDrawGuessTime(averageDrawGuessTime(stats))}</span><span>Melhor {formatDrawGuessTime(stats?.bestGuessTimeMs)}</span></div>;
          })}
        </div>
        {state.tiebreakPairs > 0 ? <p className={styles.tiebreakNote}>🔥 A partida precisou de {state.tiebreakPairs * 2} rodada(s) extra(s).</p> : null}
        <div className={styles.finalActions}>
          <Button onClick={onAgain} disabled={!isHost}>Jogar novamente</Button>
          {isHost ? <><button type="button" onClick={onConfig}>Trocar rodadas</button><button type="button" onClick={onGames}>Voltar aos jogos</button></> : <p>Aguardando o anfitrião.</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}
