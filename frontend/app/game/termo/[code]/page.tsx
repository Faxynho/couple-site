"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Clock3, HelpCircle } from "lucide-react";
import { useRoomSession } from "@/hooks/useRoomSession";
import { useTermoGame } from "@/hooks/useTermoGame";
import TermoBoard from "@/components/termo/TermoBoard";
import TermoKeyboard from "@/components/termo/TermoKeyboard";
import TermoResultModal from "@/components/termo/TermoResultModal";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { playSoundEffect } from "@/lib/sound";
import { isTermoOwnProgress, TermoLetterState, TermoOwnProgress } from "@/lib/termoTypes";
import { useDuelFirstFinishCelebration } from "@/hooks/useDuelFirstFinishCelebration";

const KEY_PRIORITY: Record<TermoLetterState, number> = { absent: 1, present: 2, correct: 3 };

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1_000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function keyboardStates(progress: TermoOwnProgress, boardCount: number) {
  const output: Record<string, (TermoLetterState | null)[]> = {};
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") output[letter] = Array.from({ length: boardCount }, () => null);
  progress.boards.forEach((board, boardIndex) => {
    board.forEach((guess) => guess.letters.forEach((state, index) => {
      const key = guess.word[index]?.toUpperCase();
      if (!key || !(key in output)) return;
      const current = output[key][boardIndex];
      if (!current || KEY_PRIORITY[state] > KEY_PRIORITY[current]) output[key][boardIndex] = state;
    }));
  });
  return output;
}

export default function TermoGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();
  const { room, selfId, notFound, kicked, backToConfig, backToGameSelect, kickPlayer } = useRoomSession(code);
  const { state, submitGuess, newGame } = useTermoGame(code);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [now, setNow] = useState(Date.now());
  const lastProgress = useRef<{ attempts: number; solved: number; invalidAt: number | null } | null>(null);
  const wasFinished = useRef(false);

  useEffect(() => {
    if (!room) return;
    if (room.gameId !== "termo" || (room.status !== "playing" && room.status !== "finished")) router.push(room.roomMode === "duo" ? `/sala/${room.code}` : "/solo");
  }, [room, router]);

  useEffect(() => {
    if (!state || state.finished) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [state?.startedAt, state?.finished]);

  const ownProgress = selfId && state && isTermoOwnProgress(state.progress[selfId]) ? state.progress[selfId] : null;
  const opponentId = selfId && state ? state.expectedPlayers?.find((playerId) => playerId !== selfId) : undefined;
  const firstFinishCelebration = useDuelFirstFinishCelebration({
    enabled: room?.roomMode === "duo" && state?.mode === "duel",
    matchKey: state?.startedAt,
    ownFinished: Boolean(ownProgress?.finished),
    opponentFinished: opponentId ? Boolean(state?.progress?.[opponentId]?.finished) : false,
    matchFinished: Boolean(state?.finished),
  });

  useEffect(() => {
    if (!state || !ownProgress) return;
    const previous = lastProgress.current;
    if (previous) {
      if (ownProgress.attemptsUsed > previous.attempts) {
        setDraft("");
        setSubmitting(false);
        setInvalidMessage(false);
        playSoundEffect("termoReveal");
        if (ownProgress.solvedIndices.length > previous.solved) playSoundEffect("termoWord");
      }
      if (ownProgress.invalidAttemptAt && ownProgress.invalidAttemptAt !== previous.invalidAt) {
        setSubmitting(false);
        setInvalidMessage(true);
        playSoundEffect("termoInvalid");
      }
    }
    lastProgress.current = { attempts: ownProgress.attemptsUsed, solved: ownProgress.solvedIndices.length, invalidAt: ownProgress.invalidAttemptAt };
  }, [ownProgress, state]);

  useEffect(() => {
    if (!state?.finished || wasFinished.current) {
      if (!state?.finished) {
        wasFinished.current = false;
        setShowResult(false);
      }
      return;
    }
    wasFinished.current = true;
    setSubmitting(false);
    const own = state.results.find((result) => result.playerId === selfId);
    if (state.mode === "duel") playSoundEffect(own?.outcome === "win" ? "victory" : own?.outcome === "draw" ? "termoDraw" : "termoDefeat");
    else playSoundEffect(own?.completed ? "victory" : "termoDefeat");
    const timer = window.setTimeout(() => setShowResult(true), 450);
    return () => window.clearTimeout(timer);
  }, [selfId, state?.finished, state?.finishedAt]);

  const insert = useCallback((letter: string) => {
    if (!submitting && !ownProgress?.finished) setDraft((current) => current.length < 5 ? `${current}${letter.toUpperCase()}` : current);
  }, [ownProgress?.finished, submitting]);
  const erase = useCallback(() => {
    if (!submitting && !ownProgress?.finished) setDraft((current) => current.slice(0, -1));
  }, [ownProgress?.finished, submitting]);
  const submit = useCallback(() => {
    if (!ownProgress || ownProgress.finished || submitting || draft.length !== 5) return;
    setSubmitting(true);
    setInvalidMessage(false);
    playSoundEffect("termoSubmit");
    submitGuess(draft);
  }, [draft, ownProgress, submitGuess, submitting]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || state?.finished || ownProgress?.finished) return;
      if (event.key === "Enter") { event.preventDefault(); submit(); return; }
      if (event.key === "Backspace") { event.preventDefault(); erase(); return; }
      if (/^[a-zA-ZÀ-ÿ]$/u.test(event.key)) { event.preventDefault(); insert(event.key.normalize("NFD").replace(/\p{M}/gu, "").replace(/ç/gi, "c")); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [erase, insert, ownProgress?.finished, state?.finished, submit]);

  const keyStates = useMemo(
    () => keyboardStates(ownProgress ?? { boards: [], attemptsUsed: 0, solvedIndices: [], finished: false, completed: false, finishedAt: null, timeUsedMs: null, invalidAttemptAt: null }, state?.variant === "quarteto" ? 4 : state?.variant === "dueto" ? 2 : 1),
    [ownProgress, state?.variant]
  );

  if (kicked) return null;
  if (notFound) return <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center"><Logo size={44} /><p className="text-ink-soft">Não encontramos essa sala. Ela pode ter expirado ou o link está incorreto.</p><Button onClick={() => router.push("/")}>Voltar para o início</Button></main>;
  if (!room || !state || room.gameId !== "termo" || !selfId || !ownProgress) return <LoadingScreen label="Preparando o Termo..." />;

  const boardCount = state.variant === "one" ? 1 : state.variant === "dueto" ? 2 : 4;
  const elapsedMs = state.finished ? (ownProgress.timeUsedMs ?? 0) : now - state.startedAt;
  const active = !state.finished && !ownProgress.finished;
  const opponent = state.mode === "duel" ? room.players.find((player) => player.id !== selfId) : null;
  const opponentProgress = opponent ? state.progress[opponent.id] : null;
  const isHost = room.roomKind === "persistent-duo" || room.hostId === selfId;
  const handleBack = () => {
    if (room.roomMode === "duo") { backToConfig(); router.push(`/sala/${room.code}`); }
    else router.push("/solo");
  };
  const handleBackToGames = () => {
    if (room.roomMode === "duo") { backToGameSelect(); router.push(`/sala/${room.code}`); }
    else router.push("/solo");
  };
  return (
    <main className="flex min-h-screen flex-col items-center gap-2 bg-cozy-gradient px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
      {firstFinishCelebration}
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel flex w-full max-w-[min(96vw,780px)] flex-col gap-2 rounded-xl3 p-3">
        <div className="flex items-center justify-between gap-2"><button onClick={handleBack} aria-label="Voltar" className="rounded-full p-2 text-ink-soft hover:bg-surface/60"><ArrowLeft size={18} /></button><div className="text-center"><h1 className="font-display text-xl font-semibold text-ink">🔤 Termo</h1><p className="text-[11px] uppercase tracking-[.15em] text-ink-soft">{state.variant === "one" ? "1 palavra" : state.variant === "dueto" ? "Dueto · 2 palavras" : "Quarteto · 4 palavras"}</p></div><span className="flex min-w-11 items-center justify-end gap-1 text-sm font-semibold tabular-nums text-ink"><Clock3 size={15} className="text-ink-soft" />{formatTime(elapsedMs)}</span></div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft"><span>{ownProgress.solvedIndices.length}/{boardCount} palavras · {ownProgress.attemptsUsed}/{state.maxAttempts} tentativas</span><details className="relative"><summary className="flex cursor-pointer list-none items-center gap-1 rounded-full bg-surface/60 px-2.5 py-1 hover:bg-surface"><HelpCircle size={13} /> Como jogar</summary><div className="glass-panel absolute right-0 top-8 z-30 w-64 rounded-xl2 p-3 text-left leading-relaxed shadow-soft"><p><b className="text-sage">Verde</b>: letra e posição corretas. <b className="text-amber-500">Amarelo</b>: letra presente em outra posição. Cinza: letra ausente.</p><p className="mt-1">Cada tentativa tem 5 letras. No Dueto e Quarteto, a mesma palavra vale para todos os tabuleiros ativos.</p>{state.mode === "duel" && <p className="mt-1">No Duelo, ambos enfrentam as mesmas soluções com progresso privado.</p>}</div></details></div>
      </motion.header>

      {opponent && opponentProgress && !isTermoOwnProgress(opponentProgress) && <div className="glass-panel flex w-full max-w-[min(96vw,640px)] items-center justify-between rounded-xl2 px-3 py-1.5 text-xs"><div><p className="font-medium text-ink">{opponent.name}</p><p className="text-[11px] text-ink-soft">{opponentProgress.solvedCount}/{boardCount} palavras · {opponentProgress.attemptsUsed} tentativas</p></div><span className={`text-[11px] font-medium ${opponentProgress.finished ? "text-sage" : "text-ink-soft"}`}>{opponentProgress.finished ? "Finalizado" : "Jogando..."}</span></div>}

      {ownProgress.finished && !state.finished && <div className="glass-panel w-full max-w-md rounded-xl2 px-4 py-3 text-center text-sm text-ink-soft">Seu resultado foi guardado. Seu adversário continua jogando.</div>}

      <motion.div key={ownProgress.invalidAttemptAt ?? "ready"} animate={invalidMessage ? { x: [0, -6, 6, -4, 0] } : undefined} className={`grid w-full gap-2 ${boardCount === 1 ? "grid-cols-1 max-w-[min(96vw,380px)]" : boardCount === 2 ? "grid-cols-2 max-w-[min(96vw,700px)]" : "grid-cols-2 max-w-[min(96vw,640px)]"}`}>
        {Array.from({ length: boardCount }, (_, index) => <TermoBoard key={index} index={index} boardCount={boardCount} guesses={ownProgress.boards[index] ?? []} maxAttempts={state.maxAttempts} currentWord={draft} active={active && !ownProgress.solvedIndices.includes(index)} solved={ownProgress.solvedIndices.includes(index)} />)}
      </motion.div>

      <p className={`h-4 text-center text-xs ${invalidMessage ? "text-rose-deep" : "text-transparent"}`}>Essa palavra não está na lista.</p>
      <TermoKeyboard states={keyStates} boardCount={boardCount} disabled={!active || submitting} onKey={insert} onEnter={submit} onBackspace={erase} />
      <TermoResultModal open={showResult} mode={state.mode} variant={state.variant} results={state.results} solutions={state.revealedSolutions ?? []} players={room.players} selfId={selfId} onClose={() => setShowResult(false)} onNewGame={() => { setShowResult(false); newGame(); }} onBack={handleBackToGames} />
    </main>
  );
}
