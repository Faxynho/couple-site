"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, Heart, Lightbulb, LockKeyhole, Sparkles, Users } from "lucide-react";
import Button from "@/components/Button";
import LoadingScreen from "@/components/LoadingScreen";
import Logo from "@/components/Logo";
import { useRoomSession } from "@/hooks/useRoomSession";
import { useWhoAmIGame } from "@/hooks/useWhoAmIGame";
import { playSoundEffect } from "@/lib/sound";
import {
  WHOAMI_CATEGORIES,
  WHOAMI_DIFFICULTIES,
  WHOAMI_MODES,
  formatWhoAmITime,
  type WhoAmIState,
} from "@/lib/whoAmITypes";
import styles from "./WhoAmIGame.module.css";

export default function WhoAmIGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();
  const { room, selfId, notFound, kicked, backToConfig, backToGameSelect } = useRoomSession(code);
  const { state, revealHint, submitGuess, giveUp, newGame } = useWhoAmIGame(code);
  const [guess, setGuess] = useState("");
  const lastFeedbackRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (kicked) router.push("/?aviso=expulso");
  }, [kicked, router]);

  useEffect(() => {
    if (!room) return;
    if (room.gameId !== "whoami" || (room.status !== "playing" && room.status !== "finished")) {
      router.push(room.roomMode === "duo" ? `/sala/${room.code}` : "/solo");
    }
  }, [room, router]);

  const feedbackAt = state?.mode === "togetherHints" ? state?.teamLastGuessAt : state?.ownLastGuessAt;
  const feedbackCorrect =
    state?.mode === "togetherHints" ? state?.teamLastGuessCorrect : state?.ownLastGuessCorrect;

  useEffect(() => {
    if (!feedbackAt || feedbackAt === lastFeedbackRef.current || feedbackCorrect == null) return;
    lastFeedbackRef.current = feedbackAt;
    playSoundEffect(feedbackCorrect ? "crosswordCorrect" : "memoryWrong");
  }, [feedbackAt, feedbackCorrect]);

  useEffect(() => {
    if (!state?.finished) {
      finishedRef.current = false;
      return;
    }
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (state.mode === "togetherHints" || state.winnerId === selfId) playSoundEffect("victory");
  }, [selfId, state?.finished, state?.finishedAt, state?.mode, state?.winnerId]);

  useEffect(() => {
    setGuess("");
  }, [state?.startedAt]);

  const players = useMemo(
    () => room?.players.filter((player) => state?.expectedPlayers.includes(player.id)) ?? [],
    [room?.players, state?.expectedPlayers]
  );
  const self = players.find((player) => player.id === selfId) ?? null;
  const opponent = players.find((player) => player.id !== selfId) ?? null;
  const ownProgress = selfId && state ? state.playerProgress[selfId] : null;
  const opponentProgress = opponent && state ? state.playerProgress[opponent.id] : null;

  if (kicked) return null;

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <Logo size={44} />
        <p className="text-ink-soft">Não encontramos essa sala.</p>
        <Button onClick={() => router.push("/")}>Voltar para o início</Button>
      </main>
    );
  }

  if (!room || !state || room.gameId !== "whoami") {
    return <LoadingScreen label="Escolhendo uma identidade..." />;
  }

  const isHost = Boolean(selfId && room.hostId === selfId);
  const modeInfo = WHOAMI_MODES[state.mode];
  const difficultyInfo = WHOAMI_DIFFICULTIES[state.difficulty];
  const categoryInfo = WHOAMI_CATEGORIES[state.category];
  const isClassic = state.mode === "classicDuel";
  const isTogether = state.mode === "togetherHints";
  const hintCount = isTogether ? state.revealedHintCount : ownProgress?.hintsRevealed ?? 1;
  const canReveal = !isClassic && !state.finished && hintCount < 5 && !ownProgress?.correct;
  const guessDisabled = state.finished || Boolean(ownProgress?.correct) || Boolean(ownProgress?.gaveUp);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = guess.trim();
    if (!value || guessDisabled) return;
    submitGuess(value);
    setGuess("");
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
    <main className={`${styles.shell} app-shell`}>
      <div className={styles.topbar}>
        <button
          type="button"
          onClick={goToConfig}
          disabled={!isHost}
          className={styles.backButton}
          aria-label="Voltar para configuração"
        >
          <ArrowLeft size={18} />
        </button>
        <Logo size={38} />
        <div className={styles.roomPill}>Sala {room.code}</div>
      </div>

      <section className={`${styles.hero} glass-panel`}>
        <div className={styles.eyebrow}>
          <Sparkles size={15} />
          <span>{modeInfo.emoji} {modeInfo.label}</span>
        </div>
        <h1>Quem Sou Eu?</h1>
        <p>
          {isClassic
            ? "Conversem, deem pistas um ao outro e tentem descobrir a própria identidade."
            : isTogether
            ? "Conversem, revelem só o necessário e descubram juntos."
            : "Os dois receberam a mesma resposta. Arrisque cedo: menos pistas vence."}
        </p>
        <div className={styles.metaRow}>
          <span>{difficultyInfo.emoji} {difficultyInfo.label}</span>
          <span>{categoryInfo.emoji} {categoryInfo.label}</span>
        </div>
      </section>

      <section className={styles.playersRow}>
        {players.map((player) => {
          const progress = state.playerProgress[player.id];
          const isMe = player.id === selfId;
          return (
            <div key={player.id} className={`${styles.playerCard} glass-panel ${isMe ? styles.playerSelf : ""}`}>
              <span className={styles.avatarDot} style={{ background: player.color }} />
              <div className={styles.playerText}>
                <strong>{isMe ? "Você" : player.name}</strong>
                <span>
                  {isClassic
                    ? progress?.correct
                      ? "descobriu"
                      : "tentando descobrir"
                    : `${isTogether ? hintCount : progress?.hintsRevealed ?? 1}/5 pistas`}
                </span>
              </div>
              {progress?.correct ? <span className={styles.statusOk}>✓</span> : null}
            </div>
          );
        })}
      </section>

      {isClassic ? (
        <ClassicBoard
          partnerName={opponent?.name ?? "Seu par"}
          partnerIdentity={state.classicPartnerIdentity?.answer ?? "—"}
          category={state.classicPartnerIdentity?.category ? WHOAMI_CATEGORIES[state.classicPartnerIdentity.category].label : "Mistério"}
        />
      ) : (
        <HintsBoard
          hints={state.hints}
          isTogether={isTogether}
          ownHintCount={hintCount}
          opponentName={opponent?.name ?? "Seu par"}
          opponentHintCount={opponentProgress?.hintsRevealed ?? 1}
          canReveal={canReveal}
          onReveal={revealHint}
        />
      )}

      <section className={`${styles.answerPanel} glass-panel`}>
        <div className={styles.answerHeader}>
          <div>
            <span className={styles.smallLabel}>{isTogether ? "Resposta da dupla" : "Seu palpite"}</span>
            <h2>{isClassic ? "Quem você acha que é?" : "Já sabe a resposta?"}</h2>
          </div>
          <span className={styles.attempts}>
            {isTogether ? state.teamAttempts : ownProgress?.attempts ?? 0} tentativa(s)
          </span>
        </div>

        <form onSubmit={onSubmit} className={styles.answerForm}>
          <input
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            maxLength={100}
            disabled={guessDisabled}
            placeholder={ownProgress?.correct ? "Você já acertou!" : "Digite seu palpite..."}
            autoComplete="off"
            aria-label="Seu palpite"
          />
          <button type="submit" disabled={!guess.trim() || guessDisabled}>
            Responder
          </button>
        </form>

        <AnimatePresence mode="wait">
          {feedbackAt && feedbackCorrect != null && !state.finished ? (
            <motion.div
              key={`${feedbackAt}-${feedbackCorrect}`}
              initial={{ opacity: 0, y: 5, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`${styles.feedback} ${feedbackCorrect ? styles.feedbackOk : styles.feedbackWrong}`}
            >
              {feedbackCorrect
                ? state.mode === "duelHints"
                  ? "Acertou! Agora o jogo verifica se a vitória já está garantida. 💗"
                  : "Acertaram! ✨"
                : "Ainda não... tenta mais uma. 👀"}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {state.mode === "duelHints" && ownProgress?.correct && !state.finished ? (
          <div className={styles.waitingNote}>
            <Heart size={16} />
            Você acertou com {ownProgress.hintsRevealed} pista(s). Esperando o resultado do seu par...
          </div>
        ) : null}

        {!state.finished && !ownProgress?.correct ? (
          <button type="button" onClick={giveUp} className={styles.giveUp}>
            Não sei · revelar resposta
          </button>
        ) : null}
      </section>

      <AnimatePresence>
        {state.finished ? (
          <ResultOverlay
            state={state}
            players={players}
            selfId={selfId}
            isHost={isHost}
            onAgain={newGame}
            onConfig={goToConfig}
            onGames={goToGames}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function HintsBoard({
  hints,
  isTogether,
  ownHintCount,
  opponentName,
  opponentHintCount,
  canReveal,
  onReveal,
}: {
  hints: (string | null)[];
  isTogether: boolean;
  ownHintCount: number;
  opponentName: string;
  opponentHintCount: number;
  canReveal: boolean;
  onReveal: () => void;
}) {
  return (
    <section className={`${styles.board} glass-panel`}>
      <div className={styles.boardTop}>
        <div className={styles.clueTitle}>
          <div className={styles.clueIcon}><Lightbulb size={23} /></div>
          <div>
            <span>{isTogether ? "Pistas compartilhadas" : "Suas pistas"}</span>
            <strong>{ownHintCount}/5 reveladas</strong>
          </div>
        </div>
        {!isTogether ? (
          <div className={styles.opponentTracker}>
            <Eye size={15} />
            {opponentName}: {opponentHintCount}/5
          </div>
        ) : (
          <div className={styles.opponentTracker}>
            <Users size={15} />
            qualquer um pode revelar
          </div>
        )}
      </div>

      <div className={styles.hintsList}>
        {Array.from({ length: 5 }).map((_, index) => {
          const hint = hints[index] ?? null;
          return (
            <motion.div
              key={index}
              layout
              initial={hint ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              className={`${styles.hintCard} ${hint ? styles.hintOpen : styles.hintLocked}`}
            >
              <span className={styles.hintNumber}>{index + 1}</span>
              {hint ? (
                <p>{hint}</p>
              ) : (
                <div className={styles.lockedText}>
                  <LockKeyhole size={15} />
                  <span>Pista escondida</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <button type="button" onClick={onReveal} disabled={!canReveal} className={styles.revealButton}>
        <Sparkles size={17} />
        {canReveal ? `Revelar pista ${Math.min(5, ownHintCount + 1)}` : ownHintCount >= 5 ? "Todas as pistas reveladas" : "Palpite enviado"}
      </button>
    </section>
  );
}

function ClassicBoard({
  partnerName,
  partnerIdentity,
  category,
}: {
  partnerName: string;
  partnerIdentity: string;
  category: string;
}) {
  return (
    <section className={`${styles.classicBoard} glass-panel`}>
      <div className={styles.classicIntro}>
        <span className={styles.smallLabel}>Modo clássico</span>
        <h2>Dê pistas com sua própria voz 💬</h2>
        <p>Não fale o nome, parte do nome ou algo que entregue de graça. O site só escolhe as identidades e confere os palpites.</p>
      </div>

      <div className={styles.identityGrid}>
        <div className={`${styles.identityCard} ${styles.identityPartner}`}>
          <span>Ajude {partnerName} a descobrir:</span>
          <strong>{partnerIdentity}</strong>
          <small>{category}</small>
        </div>
        <div className={`${styles.identityCard} ${styles.identityMystery}`}>
          <span>Você é:</span>
          <strong>?????</strong>
          <small>Escute as pistas do seu par</small>
        </div>
      </div>
    </section>
  );
}

function ResultOverlay({
  state,
  players,
  selfId,
  isHost,
  onAgain,
  onConfig,
  onGames,
}: {
  state: WhoAmIState;
  players: { id: string; name: string }[];
  selfId: string | null;
  isHost: boolean;
  onAgain: () => void;
  onConfig: () => void;
  onGames: () => void;
}) {
  const winner = state.winnerId ? players.find((player) => player.id === state.winnerId) : null;
  const selfWon = Boolean(state.winnerId && state.winnerId === selfId);
  const togetherSolved = state.mode === "togetherHints" && state.resultReason === "togetherSolved";

  let title = "Rodada encerrada";
  let subtitle = state.answer ? `A resposta era ${state.answer}.` : "";

  if (togetherSolved) {
    title = "Vocês descobriram! 💞";
    subtitle = `${state.answer} · ${state.revealedHintCount} pista(s)`;
  } else if (state.mode === "togetherHints") {
    title = "Resposta revelada";
    subtitle = state.answer ? `Era ${state.answer}. Na próxima vocês pegam!` : "";
  } else if (winner) {
    title = selfWon ? "Você venceu! ✨" : `${winner.name} venceu!`;
  } else {
    title = "Empate! 🤝";
  }

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`${styles.resultCard} glass-panel`}
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <div className={styles.resultSparkle}>✨</div>
        <span className={styles.smallLabel}>Resultado</span>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}

        {state.mode === "duelHints" ? (
          <div className={styles.resultScores}>
            {players.map((player) => {
              const progress = state.playerProgress[player.id];
              return (
                <div key={player.id}>
                  <strong>{player.id === selfId ? "Você" : player.name}</strong>
                  <span>{progress?.hintsRevealed ?? 0} pista(s)</span>
                  <small>{formatWhoAmITime(progress?.answerTimeMs)}</small>
                </div>
              );
            })}
          </div>
        ) : null}

        {state.mode === "classicDuel" && state.classicRevealedIdentities ? (
          <div className={styles.classicResult}>
            {players.map((player) => (
              <div key={player.id}>
                <span>{player.id === selfId ? "Você era" : `${player.name} era`}</span>
                <strong>{state.classicRevealedIdentities?.[player.id] ?? "—"}</strong>
              </div>
            ))}
          </div>
        ) : null}

        <div className={styles.resultActions}>
          <Button onClick={onAgain}>Jogar novamente</Button>
          {isHost ? (
            <>
              <button type="button" onClick={onConfig} className={styles.secondaryAction}>Trocar modo</button>
              <button type="button" onClick={onGames} className={styles.tertiaryAction}>Voltar aos jogos</button>
            </>
          ) : (
            <p className={styles.hostNote}>O anfitrião pode trocar o modo ou voltar aos jogos.</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
