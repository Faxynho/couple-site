"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Footprints, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";
import Logo from "@/components/Logo";
import BoardRaceBoard from "@/components/boardrace/BoardRaceBoard";
import BoardRaceChallengePanel, { BoardRaceQuizPanel, BoardRaceSafePanel, BoardRaceWordPanel } from "@/components/boardrace/BoardRaceChallengePanel";
import BoardRaceDie from "@/components/boardrace/BoardRaceDie";
import BoardRaceEventPopup from "@/components/boardrace/BoardRaceEventPopup";
import BoardRaceHud from "@/components/boardrace/BoardRaceHud";
import BoardRacePowerBar from "@/components/boardrace/BoardRacePowerBar";
import BoardRaceResultModal from "@/components/boardrace/BoardRaceResultModal";
import BoardRaceTutorial from "@/components/boardrace/BoardRaceTutorial";
import styles from "@/components/boardrace/BoardRaceVisual.module.css";
import { useBoardRaceGame } from "@/hooks/useBoardRaceGame";
import { useRoomSession } from "@/hooks/useRoomSession";
import { formatDuration } from "@/lib/accountFormat";
import type { BoardRaceState } from "@/lib/boardRaceTypes";

type RaceEvent = BoardRaceState["eventLog"][number];
type QueuedPopup = { event: RaceEvent; showAt: number };
const POPUP_DURATION_MS = 2_000;
const SPECIAL_FEEDBACK_MS = 3_200;
const NORMAL_FEEDBACK_MS = 750;

export default function BoardRacePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();
  const { room, selfId, notFound, kicked, backToConfig, backToGameSelect, kickPlayer } = useRoomSession(code);
  const { state, roll, answerQuiz, answerWord, giveUpWord, chooseSafe, usePower, minigameAction, newGame } = useBoardRaceGame(code);
  const [showResult, setShowResult] = useState(false);
  const [popupQueue, setPopupQueue] = useState<QueuedPopup[]>([]);
  const [activePopup, setActivePopup] = useState<RaceEvent | null>(null);
  const [popupLeaving, setPopupLeaving] = useState(false);
  const seenEventId = useRef<number | null>(null);
  const popupGameStartedAt = useRef<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!room) return;
    if (room.gameId !== "boardrace" || (room.status !== "playing" && room.status !== "finished")) {
      router.push(room.roomMode === "duo" ? `/sala/${room.code}` : "/solo");
    }
  }, [room, router]);

  useEffect(() => {
    if (!state || state.phaseReadyAt <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [state?.phaseReadyAt, state?.lastMove?.serial]);

  useEffect(() => {
    if (state?.phase !== "finished") {
      setShowResult(false);
      return;
    }
    const timer = window.setTimeout(() => setShowResult(true), Math.max(0, state.phaseReadyAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [state?.phase, state?.finishedAt, state?.phaseReadyAt]);

  const displayPlayers = useMemo(() => {
    if (!room) return [];
    return state?.playerOrder.includes("BOT")
      ? [...room.players, { id: "BOT", name: "BOT", color: "#8c75d6", connected: true }]
      : room.players;
  }, [room, state?.playerOrder]);

  useEffect(() => {
    if (!state) return;
    if (popupGameStartedAt.current !== state.startedAt) {
      popupGameStartedAt.current = state.startedAt;
      seenEventId.current = state.eventSerial;
      setPopupQueue([]);
      setActivePopup(null);
      setPopupLeaving(false);
      return;
    }
    const previousEventId = seenEventId.current;
    if (previousEventId === null || state.eventSerial <= previousEventId) return;
    const newEvents = state.eventLog.filter((event) => event.id > previousEventId);
    seenEventId.current = state.eventSerial;
    if (newEvents.length === 0) return;
    const feedbackMs = state.lastMove?.feedbackMs ?? (state.lastMove?.effectEventId ? SPECIAL_FEEDBACK_MS : NORMAL_FEEDBACK_MS);
    const movementFeedbackAt = state.phaseReadyAt - feedbackMs;
    setPopupQueue((current) => {
      const visibleIds = new Set([activePopup?.id, ...current.map((item) => item.event.id)]);
      const additions = newEvents
        .filter((event) => !visibleIds.has(event.id))
        .map((event) => ({
          event,
          showAt: event.id === state.lastMove?.effectEventId ? Math.max(Date.now(), movementFeedbackAt) : Date.now(),
        }));
      return additions.length ? [...current, ...additions] : current;
    });
  }, [state?.eventSerial, state?.lastMove?.effectEventId, state?.lastMove?.feedbackMs, state?.phaseReadyAt, activePopup?.id]);

  useEffect(() => {
    const next = popupQueue[0];
    if (activePopup || !next) return;
    const timer = window.setTimeout(() => {
      setActivePopup(next.event);
      setPopupQueue((current) => current[0]?.event.id === next.event.id ? current.slice(1) : current);
    }, Math.max(0, next.showAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [activePopup, popupQueue]);

  useEffect(() => {
    if (!activePopup) return;
    const timer = window.setTimeout(() => {
      setPopupLeaving(true);
      setActivePopup(null);
    }, POPUP_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [activePopup]);

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <Logo size={44} />
        <p className="text-ink-soft">Não encontramos esta corrida.</p>
        <button type="button" onClick={() => router.push("/")} className="app-button app-button-primary rounded-full px-6 py-3 font-display font-semibold text-white">Voltar</button>
      </main>
    );
  }
  if (kicked) return null;
  if (!room || !state || room.gameId !== "boardrace" || !selfId || !state.players[selfId]) {
    return <LoadingScreen label="Montando o tabuleiro..." />;
  }

  const isHost = room.hostId === selfId;
  const isMyTurn = state.currentPlayerId === selfId;
  const self = state.players[selfId];
  const currentName = state.currentPlayerId === "BOT"
    ? "BOT"
    : room.players.find((player) => player.id === state.currentPlayerId)?.name ?? "Jogador";
  const winnerName = state.winnerId === "BOT"
    ? "BOT"
    : room.players.find((player) => player.id === state.winnerId)?.name ?? "Oponente";
  // Date.now evita o estado morto em que o snapshot chega poucos ms antes de
  // phaseReadyAt, mas nenhum novo render atualiza o relógio local.
  const interactionReady = Math.max(now, Date.now()) >= state.phaseReadyAt && !activePopup && !popupLeaving && popupQueue.length === 0;
  const ownQuiz = isMyTurn && state.phase === "awaitingQuiz" && interactionReady ? self.pendingQuiz : null;
  const ownWord = isMyTurn && state.phase === "awaitingWord" && interactionReady ? self.pendingWordChallenge : null;
  const ownSafe = isMyTurn && state.phase === "awaitingSafe" && interactionReady ? self.pendingSafe : null;
  const canRoll = isMyTurn && state.phase === "awaitingRoll" && interactionReady;
  const elapsed = formatDuration(Math.max(0, (state.finishedAt ?? Date.now()) - state.startedAt));
  const latestEffect = state.eventLog.at(-1);
  const feedbackMs = state.lastMove?.feedbackMs ?? (state.lastMove?.effectEventId ? SPECIAL_FEEDBACK_MS : NORMAL_FEEDBACK_MS);
  const moveEndsAt = state.phaseReadyAt - feedbackMs;
  const presentingMove = Boolean(
    state.lastMove
    && state.phaseReadyAt > now
    && (state.phase === "turnStart" || state.phase === "moving" || state.phase === "finished")
  );
  const presentingTransition = Boolean(!state.lastMove && latestEffect && state.phase === "turnStart" && state.phaseReadyAt > now);
  const moveEffect = state.lastMove?.effectEventId
    ? state.eventLog.find((entry) => entry.id === state.lastMove?.effectEventId)
    : null;
  const presentationEvent = presentingMove
    ? moveEffect ?? { id: -(state.lastMove?.serial ?? 1), message: "Casa normal — caminho livre.", tone: "neutral" as const, kind: "landNormal" as const, playerId: state.lastMove?.playerId }
    : latestEffect;
  const presentationStage = !presentingMove
    ? presentingTransition ? "effect" : null
    : now < moveEndsAt - 650
      ? "moving"
      : now < moveEndsAt
        ? "moving"
        : "effect";
  const presentedPlayerId = presentingMove && state.lastMove ? state.lastMove.playerId : state.currentPlayerId;
  const presentedName = presentedPlayerId === "BOT"
    ? "BOT"
    : room.players.find((player) => player.id === presentedPlayerId)?.name ?? "Jogador";
  const turnMessage = presentationStage === "moving"
    ? `${presentedName} está avançando...`
    : presentationStage === "effect"
      ? presentationEvent?.message ?? "Aplicando o efeito da casa..."
      : state.phase === "minigame"
        ? "Desafio em andamento"
        : isMyTurn
          ? state.phase === "turnStart"
            ? "Preparando sua vez..."
            : state.phase === "awaitingQuiz"
              ? "Responda ao Quiz para continuar"
              : state.phase === "awaitingWord"
                ? "Resolva o desafio para continuar"
                : state.phase === "awaitingSafe"
                  ? "Abra o Cofre para continuar"
              : "Sua vez de jogar"
          : `Vez de ${currentName}`;
  const playerName = (playerId?: string) => {
    if (!playerId) return "O jogador";
    if (playerId === selfId) return "Você";
    if (playerId === "BOT") return "O BOT";
    return room.players.find((player) => player.id === playerId)?.name ?? "Seu oponente";
  };

  const handleBack = () => {
    if (room.roomMode === "duo") {
      if (isHost) backToConfig();
      router.push(`/sala/${room.code}`);
    } else router.push("/solo");
  };

  const handleBackToGames = () => {
    if (room.roomMode === "duo") {
      if (isHost) backToGameSelect();
      router.push(`/sala/${room.code}`);
    } else router.push("/solo");
  };

  return (
    <main className={[styles.page, "app-shell mx-auto flex min-h-screen w-full max-w-[1380px] flex-col items-center gap-3 px-3 py-4 sm:px-5 sm:py-6"].join(" ")}>
      <header className={styles.topBar}>
        <button type="button" onClick={handleBack} className={styles.backButton} aria-label="Voltar">
          <ArrowLeft size={19} />
        </button>
        <div className={styles.titleBlock}>
          <h1>Trilha da Sorte</h1>
          <p>Primeiro até a casa {state.lastPosition} vence</p>
        </div>
        <div className={styles.roundBadge}>
          <Footprints size={15} aria-hidden="true" />
          <span>Turno {state.turnNumber}</span>
        </div>
      </header>

      <section className={styles.playerGrid} aria-label="Progresso dos jogadores">
        {state.playerOrder.map((id, index) => (
          <BoardRaceHud
            key={id}
            playerId={id}
            player={displayPlayers.find((entry) => entry.id === id)}
            progress={state.players[id]}
            lastPosition={state.lastPosition}
            active={presentedPlayerId === id && (state.phase !== "finished" || presentingMove)}
            isSelf={id === selfId}
            isHost={isHost}
            onKick={room.roomMode === "duo" ? kickPlayer : undefined}
            visualIndex={index}
          />
        ))}
      </section>

      <section className={styles.playArea} aria-label="Área principal da partida">
        <div className={styles.boardSlot}>
          <BoardRaceBoard state={state} players={displayPlayers} selfId={selfId} />
          <AnimatePresence mode="wait" onExitComplete={() => setPopupLeaving(false)}>
            {activePopup && <BoardRaceEventPopup key={activePopup.id} event={activePopup} selfId={selfId} playerName={playerName} />}
          </AnimatePresence>
          {state.phase === "finished" && !showResult && (
            <div className={styles.finalBoardActions} role="navigation" aria-label="Opções após a partida">
              <button type="button" onClick={() => setShowResult(true)}>Ver resultado</button>
              {isHost && <button type="button" onClick={() => newGame()}>Jogar de novo</button>}
              <button type="button" onClick={handleBackToGames}>Voltar aos jogos</button>
            </div>
          )}
        </div>

        <aside className={styles.hudRail} aria-label="Controles da partida">
          <div className={styles.turnDock}>
            <BoardRaceDie value={state.dice.value} total={state.dice.total} serial={state.dice.serial} canRoll={canRoll} onRoll={roll} />
            <div className={styles.turnCopy}>
              <small>{canRoll ? "Toque no dado" : "Estado da rodada"}</small>
              <strong>{turnMessage}</strong>
              <span>{state.dice.value !== null ? "Resultado visível até a próxima jogada." : "Dado tradicional de 1 a 6."}</span>
            </div>
          </div>
          <BoardRacePowerBar player={self} enabled={canRoll} onUse={usePower} />
        </aside>

        <AnimatePresence>
          {(ownQuiz || ownWord || ownSafe || (state.phase === "minigame" && state.pendingMinigame && interactionReady)) && (
            <motion.div
              className={styles.stageOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-label={ownQuiz ? "Quiz da trilha" : ownWord ? `${ownWord.kind === "anagram" ? "Anagrama" : "Enigma"} da trilha` : ownSafe ? "Cofre da trilha" : "Minijogo da trilha"}
            >
              <motion.div className={styles.stageOverlayCard} initial={{ y: 18, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 12, scale: 0.98 }}>
                {ownQuiz ? (
                  <BoardRaceQuizPanel key={ownQuiz.id} quiz={ownQuiz} onAnswer={answerQuiz} />
                ) : ownWord ? (
                  <BoardRaceWordPanel key={ownWord.id} challenge={ownWord} onAnswer={answerWord} onGiveUp={giveUpWord} />
                ) : ownSafe ? (
                  <BoardRaceSafePanel key={ownSafe.id} safe={ownSafe} onChoose={chooseSafe} />
                ) : state.pendingMinigame ? (
                  <BoardRaceChallengePanel challenge={state.pendingMinigame} selfId={selfId} players={displayPlayers} onAction={minigameAction} />
                ) : null}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className={styles.eventPanel}>
        <p className={styles.panelEyebrow}><Sparkles size={13} /> Momentos da trilha</p>
        <div className={styles.eventList}>
          {state.eventLog.length === 0 ? (
            <p className={styles.eventItem}><span className={styles.eventDot} />A corrida está começando...</p>
          ) : state.eventLog.slice(-4).reverse().map((entry) => (
            <p key={entry.id} className={[styles.eventItem, entry.tone === "positive" ? styles.eventPositive : entry.tone === "negative" ? styles.eventNegative : ""].join(" ")}>
              <span className={styles.eventDot} />{entry.message}
            </p>
          ))}
        </div>
      </section>

      <BoardRaceTutorial />

      <BoardRaceResultModal
        visible={showResult}
        won={state.winnerId === selfId}
        winnerName={winnerName}
        durationLabel={elapsed}
        canRestart={isHost}
        onRestart={() => { setShowResult(false); newGame(); }}
        onBack={handleBackToGames}
        onClose={() => setShowResult(false)}
      />
    </main>
  );
}
