"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Swords } from "lucide-react";
import MemoryBoard from "@/components/memory/MemoryBoard";
import TermoBoard from "@/components/termo/TermoBoard";
import TermoKeyboard from "@/components/termo/TermoKeyboard";
import CrosswordGrid from "@/components/crossword/CrosswordGrid";
import CluesList from "@/components/crossword/CluesList";
import WordSearchGrid from "@/components/wordsearch/WordSearchGrid";
import WordSearchWordList from "@/components/wordsearch/WordSearchWordList";
import RPGCombatantPanel from "@/components/rpg/RPGCombatantPanel";
import RPGHand from "@/components/rpg/RPGHand";
import { BoardRacePendingQuiz, BoardRaceState } from "@/lib/boardRaceTypes";
import { CrosswordDirection, CrosswordState, CrosswordWordDef, isFullProgress } from "@/lib/crosswordTypes";
import { MemoryState } from "@/lib/memoryTypes";
import { RPGState, RPGRoundEvent } from "@/lib/rpgTypes";
import { isTermoOwnProgress, TermoLetterState, TermoOwnProgress, TermoState } from "@/lib/termoTypes";
import { Player } from "@/lib/types";
import { isFullWordSearchProgress, WordSearchState } from "@/lib/wordsearchTypes";
import styles from "./BoardRaceVisual.module.css";

const KEY_PRIORITY: Record<TermoLetterState, number> = { absent: 1, present: 2, correct: 3 };

function termoKeyboardStates(progress: TermoOwnProgress) {
  const output: Record<string, (TermoLetterState | null)[]> = {};
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") output[letter] = [null];
  progress.boards[0]?.forEach((guess) => guess.letters.forEach((letterState, index) => {
    const key = guess.word[index]?.toUpperCase();
    if (!key || !(key in output)) return;
    const current = output[key][0];
    if (!current || KEY_PRIORITY[letterState] > KEY_PRIORITY[current]) output[key][0] = letterState;
  }));
  return output;
}

export function BoardRaceQuizPanel({ quiz, onAnswer }: { quiz: BoardRacePendingQuiz; onAnswer: (index: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <section className={styles.challengePanel}>
      <p className={styles.panelEyebrow}>❓ Quiz · dificuldade Média</p>
      <h2 className={styles.challengeTitle}>{quiz.question}</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {quiz.options.map((option, index) => (
          <button key={option} type="button" disabled={selected !== null} onClick={() => { setSelected(index); onAnswer(index); }} className={`${styles.answerButton} ${selected === index ? styles.answerSelected : ""}`}>
            <span className="mr-2 font-semibold text-rose">{String.fromCharCode(65 + index)}</span>{option}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-soft">Acerte para liberar o dado. Se errar, a vez passa.</p>
    </section>
  );
}

export function BoardRaceWordPanel({ challenge, onAnswer, onGiveUp }: {
  challenge: NonNullable<BoardRaceState["players"][string]["pendingWordChallenge"]>;
  onAnswer: (answer: string) => void;
  onGiveUp: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [sent, setSent] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const isAnagram = challenge.kind === "anagram";
  useEffect(() => {
    setAnswer("");
    setSent(false);
    setFeedback(isAnagram && challenge.attempts > 0 ? "Ainda não foi dessa vez. Tente outra combinação." : null);
  }, [challenge.attempts, challenge.id, isAnagram]);

  useEffect(() => {
    if (!sent) return;
    // Caso uma transmissão seja perdida, a interface nunca fica bloqueada.
    const timeout = window.setTimeout(() => setSent(false), 1_250);
    return () => window.clearTimeout(timeout);
  }, [sent]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!answer.trim() || sent) return;
    setSent(true);
    setFeedback(null);
    onAnswer(answer);
  };
  return (
    <section className={`${styles.challengePanel} ${styles.wordChallengePanel}`}>
      <p className={styles.panelEyebrow}>{isAnagram ? "🔤 Anagrama" : "💡 Enigma"} · antes do dado</p>
      <h2 className={styles.challengeTitle}>{isAnagram ? "Desembaralhe a palavra" : "Resolva o enigma"}</h2>
      <p className={styles.wordPrompt}>{isAnagram ? challenge.prompt.split("").join(" · ") : challenge.prompt}</p>
      <form className={styles.wordForm} onSubmit={submit}>
        <label className="sr-only" htmlFor={`word-answer-${challenge.id}`}>Sua resposta</label>
        <input id={`word-answer-${challenge.id}`} autoFocus value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={sent} placeholder="Digite sua resposta" className={styles.wordInput} />
        <button type="submit" disabled={!answer.trim() || sent} className="app-button app-button-primary rounded-full px-4 py-2 text-sm font-semibold text-white">Responder</button>
      </form>
      {feedback && <p className={styles.wordFeedback} role="status">{feedback}</p>}
      <div className={styles.wordFooter}>
        <p className={styles.wordHint}>{isAnagram ? "Você pode tentar quantas vezes quiser." : "Acerte para liberar o dado. Se errar, a vez passa."}</p>
        {isAnagram && <button type="button" disabled={sent} onClick={() => { setSent(true); onGiveUp(); }} className={styles.wordGiveUp}>Desistir</button>}
      </div>
    </section>
  );
}

const SAFE_OPTION_LABELS = ["Abra esta gaveta", "Escolha este compartimento", "Tente esta chave", "Revele esta caixa"];

export function BoardRaceSafePanel({ safe, onChoose }: {
  safe: NonNullable<BoardRaceState["players"][string]["pendingSafe"]>;
  onChoose: (index: number) => void;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  return (
    <section className={`${styles.challengePanel} ${styles.safeChallengePanel}`}>
      <p className={styles.panelEyebrow}>🧰 Cofre da trilha</p>
      <h2 className={styles.challengeTitle}>Escolha um compartimento</h2>
      <p className={styles.wordHint}>Há uma recompensa na maioria deles. Escolha com carinho.</p>
      <div className={styles.safeChoices}>
        {safe.options.map((_option, index) => (
          <button key={index} type="button" disabled={choice !== null} onClick={() => { setChoice(index); onChoose(index); }} className={styles.safeChoice}>
            <span aria-hidden="true">🔐</span><strong>{SAFE_OPTION_LABELS[index]}</strong><small>Toque para abrir</small>
          </button>
        ))}
      </div>
    </section>
  );
}

interface MinigameProps {
  challenge: NonNullable<BoardRaceState["pendingMinigame"]>;
  selfId: string;
  players: Player[];
  onAction: (action: unknown) => void;
}

export default function BoardRaceChallengePanel({ challenge, selfId, players, onAction }: MinigameProps) {
  const [now, setNow] = useState(Date.now());
  const readyAt = challenge.readyAt ?? challenge.startedAt;
  const countdown = Math.max(0, Math.ceil((readyAt - now) / 1000));

  useEffect(() => {
    if (readyAt <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [readyAt]);

  if (countdown > 0) {
    return (
      <section className={`${styles.challengePanel} ${styles.countdownPanel}`} data-testid="minigame-countdown">
        <p className={styles.panelEyebrow}>🎮 {challenge.title}</p>
        <div className={styles.countdownOrb} key={countdown}>{countdown}</div>
        <h2 className={styles.challengeTitle}>Prepare-se!</h2>
        <p>O desafio começa ao mesmo tempo para os dois jogadores.</p>
      </section>
    );
  }

  return (
    <section className={`${styles.challengePanel} ${styles.realGamePanel}`}>
      <div className={styles.challengeHeader}>
        <div><p className={styles.panelEyebrow}>🎮 Jogo oficial do site</p><h2 className={styles.challengeTitle}>{challenge.title}</h2></div>
        <span className={styles.challengeBadge}>Vencedor ganha turno extra</span>
      </div>
      <div className={styles.embeddedGameSurface}>
        {challenge.kind === "memory" && <MemoryChallenge state={challenge.state as MemoryState} selfId={selfId} onAction={onAction} />}
        {challenge.kind === "termo" && <TermoChallenge state={challenge.state as TermoState} selfId={selfId} onAction={onAction} />}
        {challenge.kind === "crossword" && <CrosswordChallenge state={challenge.state as CrosswordState} selfId={selfId} players={players} onAction={onAction} />}
        {challenge.kind === "wordsearch" && <WordSearchChallenge state={challenge.state as WordSearchState} selfId={selfId} players={players} onAction={onAction} />}
        {challenge.kind === "rpg" && <RPGChallenge state={challenge.state as RPGState} selfId={selfId} players={players} onAction={onAction} />}
      </div>
    </section>
  );
}

function MemoryChallenge({ state, selfId, onAction }: { state: MemoryState; selfId: string; onAction: (action: unknown) => void }) {
  const progress = state.progress[selfId];
  if (!progress) return <p className="text-sm text-ink-soft">Aguardando o desafio...</p>;
  const previewing = state.playStartedAt === null;
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex w-full max-w-[620px] justify-between text-xs font-medium text-ink-soft"><span>{previewing ? "Memorize as cartas!" : "Encontre os pares"}</span><span>{progress.pairsFound}/{state.pairCount} pares · {progress.score} pts</span></div>
      <MemoryBoard slots={state.slots} rows={state.rows} cols={state.cols} progress={progress} previewing={previewing} locked={progress.finished || Boolean(progress.mismatchUntil)} onFlip={(slotId) => onAction({ type: "flipCard", slotId })} celebrating={false} />
    </div>
  );
}

function TermoChallenge({ state, selfId, onAction }: { state: TermoState; selfId: string; onAction: (action: unknown) => void }) {
  const [word, setWord] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const previous = useRef<{ attempts: number; invalidAt: number | null } | null>(null);
  const progress = state.progress[selfId];
  const ownProgress = isTermoOwnProgress(progress) ? progress : null;

  useEffect(() => {
    if (!ownProgress) return;
    const last = previous.current;
    if (last && (ownProgress.attemptsUsed !== last.attempts || ownProgress.invalidAttemptAt !== last.invalidAt)) { setWord(""); setSubmitting(false); }
    previous.current = { attempts: ownProgress.attemptsUsed, invalidAt: ownProgress.invalidAttemptAt };
  }, [ownProgress]);

  const insert = useCallback((letter: string) => { if (!submitting && !ownProgress?.finished) setWord((current) => current.length < 5 ? `${current}${letter.toUpperCase()}` : current); }, [ownProgress?.finished, submitting]);
  const erase = useCallback(() => { if (!submitting && !ownProgress?.finished) setWord((current) => current.slice(0, -1)); }, [ownProgress?.finished, submitting]);
  const submit = useCallback(() => { if (word.length !== 5 || ownProgress?.finished || submitting) return; setSubmitting(true); onAction({ type: "submitGuess", word }); }, [onAction, ownProgress?.finished, submitting, word]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || ownProgress?.finished) return;
      if (event.key === "Enter") { event.preventDefault(); submit(); }
      else if (event.key === "Backspace") { event.preventDefault(); erase(); }
      else if (/^[a-zA-ZÀ-ÿ]$/u.test(event.key)) { event.preventDefault(); insert(event.key.normalize("NFD").replace(/\p{M}/gu, "").replace(/ç/gi, "c")); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [erase, insert, ownProgress?.finished, submit]);

  const keyStates = useMemo(() => ownProgress ? termoKeyboardStates(ownProgress) : {}, [ownProgress]);
  if (!ownProgress) return <p className="text-sm text-ink-soft">Aguardando o Termo...</p>;
  return (
    <div className="flex flex-col items-center gap-2">
      <TermoBoard guesses={ownProgress.boards[0] ?? []} maxAttempts={state.maxAttempts} currentWord={word} active={!ownProgress.finished} solved={ownProgress.solvedIndices.includes(0)} index={0} boardCount={1} />
      <p className={`h-4 text-xs ${ownProgress.invalidAttemptAt ? "text-rose-deep" : "text-transparent"}`}>Palavra não reconhecida.</p>
      <TermoKeyboard states={keyStates} boardCount={1} disabled={ownProgress.finished || submitting} onKey={insert} onEnter={submit} onBackspace={erase} />
    </div>
  );
}

function CrosswordChallenge({ state, selfId, players, onAction }: { state: CrosswordState; selfId: string; players: Player[]; onAction: (action: unknown) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [direction, setDirection] = useState<CrosswordDirection>("across");
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const progress = state.progress[selfId];
  if (!progress || !isFullProgress(progress)) return <p className="text-sm text-ink-soft">Aguardando as palavras cruzadas...</p>;
  const selectWord = (word: CrosswordWordDef) => { setDirection(word.direction); setSelected(word.row * state.cols + word.col); setActiveWordId(word.id); };
  return (
    <div className={styles.crosswordSurface}>
      <CrosswordGrid rows={state.rows} cols={state.cols} cells={state.cells} words={state.words} values={progress.values} completedWordIds={progress.completedWordIds} onSetValue={(row, col, letter) => onAction({ type: "setCell", row, col, letter })} locked={progress.finished} selected={selected} direction={direction} onSelectedChange={setSelected} onDirectionChange={setDirection} onActiveWordChange={setActiveWordId} />
      <CluesList words={state.words} completedWordIds={progress.completedWordIds} completedWordBy={state.completedWordBy} activeWordId={activeWordId} players={players} selfId={selfId} onSelectWord={selectWord} />
    </div>
  );
}

function WordSearchChallenge({ state, selfId, players, onAction }: { state: WordSearchState; selfId: string; players: Player[]; onAction: (action: unknown) => void }) {
  const progress = state.progress[selfId];
  if (!progress || !isFullWordSearchProgress(progress)) return <p className="text-sm text-ink-soft">Aguardando o caça-palavras...</p>;
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <WordSearchGrid size={state.size} letters={state.letters} words={state.words} players={players} selfId={selfId} onSubmitSelection={(startRow, startCol, endRow, endCol) => onAction({ type: "submitSelection", startRow, startCol, endRow, endCol })} locked={progress.finished} />
      <WordSearchWordList words={state.words} players={players} selfId={selfId} />
    </div>
  );
}

function RPGChallenge({ state, selfId, players, onAction }: { state: RPGState; selfId: string; players: Player[]; onAction: (action: unknown) => void }) {
  const self = state.combatants[selfId];
  if (!self) return <p className="text-sm text-ink-soft">Preparando a arena...</p>;
  const playerById = Object.fromEntries(players.map((player) => [player.id, player]));
  const eventsFor = (id: string): RPGRoundEvent[] => state.phase === "resolved" || state.phase === "finished" ? state.lastRoundEvents.filter((event) => (event.targetId ?? event.actorId) === id) : [];
  const nameOf = (id: string) => id === "BOT" ? "BOT" : playerById[id]?.name ?? state.combatants[id]?.displayName ?? "Oponente";
  const eventsKey = state.round * 1000 + (state.resolvedAt ? 1 : 0);
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className={styles.rpgArena}>
        <div className="flex min-w-0 flex-col items-center">{state.teamA.map((id) => <RPGCombatantPanel key={id} combatant={state.combatants[id]} name={nameOf(id)} player={playerById[id]} color={playerById[id]?.color} appearance={state.characterAppearances?.[id]} facing="right" events={eventsFor(id)} eventsKey={eventsKey} currentRound={state.round} showChosenBadge={state.phase === "choosing" && id !== selfId && state.combatants[id].hasChosen} />)}</div>
        <span className={styles.rpgVersus}><Swords size={22} /></span>
        <div className="flex min-w-0 flex-col items-center">{state.teamB.map((id) => <RPGCombatantPanel key={id} combatant={state.combatants[id]} name={nameOf(id)} player={playerById[id]} color={playerById[id]?.color} appearance={state.characterAppearances?.[id]} facing="left" events={eventsFor(id)} eventsKey={eventsKey} currentRound={state.round} showChosenBadge={state.phase === "choosing" && id !== selfId && state.combatants[id].hasChosen} />)}</div>
      </div>
      {state.phase === "intro" && <p className="text-sm font-medium text-ink-soft">Classes sorteadas — a arena está abrindo...</p>}
      {state.phase === "choosing" && self.alive && !self.skippingThisRound && <RPGHand hand={self.hand} chosenInstanceId={self.chosenCardId} disabled={Boolean(self.chosenCardId)} dealKey={state.round} onSelect={(cardInstanceId) => onAction({ type: "selectCard", cardInstanceId })} rerollCharges={self.rerollCharges} onReroll={() => onAction({ type: "rerollHand" })} />}
      {state.phase === "choosing" && self.skippingThisRound && <p className="text-sm font-medium text-rose-deep">Você está atordoado e perdeu esta rodada.</p>}
    </div>
  );
}
