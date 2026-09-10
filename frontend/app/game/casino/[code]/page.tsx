"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bomb,
  Check,
  Coins,
  Crown,
  Dices,
  Flag,
  LockKeyhole,
  RotateCw,
  Sparkles,
  Trophy,
} from "lucide-react";
import Button from "@/components/Button";
import Confetti from "@/components/Confetti";
import LoadingScreen from "@/components/LoadingScreen";
import Logo from "@/components/Logo";
import AccountAvatar from "@/components/account/AccountAvatar";
import { useAccountPhotos } from "@/hooks/useAccountPhotos";
import { useCasinoGame } from "@/hooks/useCasinoGame";
import { useRoomSession } from "@/hooks/useRoomSession";
import {
  CASINO_GAMES,
  CASINO_LENGTHS,
  CASINO_RACERS,
  FORTUNE_SEGMENTS,
  SLOT_WIN_LINES,
  cardLabel,
  cardSuitSymbol,
  casinoMinimumBet,
  formatCasinoChips,
  hiLoChoiceMultiplier,
  racerAsset,
  slotAsset,
  type CasinoMiniGame,
  type CasinoRacerId,
  type CasinoState,
  type LastChanceCoinSide,
  type RouletteBet,
  type SlotSymbolId,
} from "@/lib/casinoTypes";
import { isPersistentDuoRoomCode } from "@/lib/persistentDuo";
import { playCasinoSound } from "@/lib/casinoSound";
import styles from "./CasinoGame.module.css";

const ROULETTE_RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const ROULETTE_WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26] as const;
const SLOT_PAYLINE_PATHS = ["M7 16.7 L93 16.7", "M7 50 L93 50", "M7 83.3 L93 83.3", "M16.7 7 L16.7 93", "M50 7 L50 93", "M83.3 7 L83.3 93", "M8 8 L92 92", "M92 8 L8 92"] as const;

export default function CasinoGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();
  const { room, selfId, notFound, kicked, backToConfig, backToGameSelect } = useRoomSession(code);
  const game = useCasinoGame(code);
  const state = game.state;
  const [betAmount, setBetAmount] = useState(100);
  const [moneyToast, setMoneyToast] = useState<{ id: number; delta: number } | null>(null);
  const photos = useAccountPhotos();
  const previousSoundState = useRef<CasinoState | null>(null);
  const moneyToastTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (moneyToastTimer.current != null) window.clearTimeout(moneyToastTimer.current);
  }, []);

  useEffect(() => {
    if (kicked) router.push("/?aviso=expulso");
  }, [kicked, router]);

  useEffect(() => {
    if (!room) return;
    if (room.gameId !== "casino" || (room.status !== "playing" && room.status !== "finished")) {
      router.push(room.roomMode === "duo" ? `/sala/${room.code}` : "/solo");
    }
  }, [room, router]);

  const players = useMemo(() => {
    const roomPlayers = room?.players.filter((player) => state?.expectedPlayers.includes(player.id)) ?? [];
    if (state?.mode !== "soloBot" || !state.expectedPlayers.includes("BOT") || roomPlayers.some((player) => player.id === "BOT")) {
      return roomPlayers;
    }
    return [...roomPlayers, { id: "BOT", name: "BOT", color: "#d5a93f", connected: true, accountId: undefined }];
  }, [room?.players, state?.expectedPlayers, state?.mode]);
  const opponent = players.find((player) => player.id !== selfId) ?? null;
  const selfState = selfId && state ? state.players[selfId] : null;

  useEffect(() => {
    if (!state || state.phase !== "betting" || !selfState || selfState.betLocked) return;
    const min = casinoMinimumBet(selfState.balance);
    setBetAmount((current) => Math.max(min, Math.min(selfState.balance, current || min)));
  }, [state?.phase, state?.round, selfState?.balance, selfState?.betLocked]);

  useEffect(() => {
    if (!state || !selfId) return;
    const prev = previousSoundState.current;
    const mini = state.miniState;
    const prevMini = prev?.miniState;
    const showMoneyToast = (delta: number) => {
      const rounded = Math.round(delta);
      if (rounded === 0) return;
      if (moneyToastTimer.current != null) window.clearTimeout(moneyToastTimer.current);
      setMoneyToast({ id: Date.now() + state.revision, delta: rounded });
      playCasinoSound(rounded > 0 ? "moneyGain" : "moneyLoss");
      moneyToastTimer.current = window.setTimeout(() => setMoneyToast(null), 2_250);
    };

    if (prev && prev.phase !== state.phase && state.phase === "betting") playCasinoSound("select");
    if (prev && prev.players[selfId]?.betLocked !== state.players[selfId]?.betLocked && state.players[selfId]?.betLocked) playCasinoSound("chip");

    if (mini?.kind === "mines") {
      const nowP = mini.players[selfId];
      const oldP = prevMini?.kind === "mines" ? prevMini.players[selfId] : null;
      if (oldP && nowP.openedIndexes.length > oldP.openedIndexes.length) playCasinoSound("mineSafe");
      if (oldP && !oldP.exploded && nowP.exploded) playCasinoSound("mineBoom");
    }
    if (mini?.kind === "slots") {
      const nowP = mini.players[selfId];
      const oldP = prevMini?.kind === "slots" ? prevMini.players[selfId] : null;
      if (nowP.spinning && !oldP?.spinning) playCasinoSound("slotSpin");
      if (oldP?.spinning && !nowP.spinning) playCasinoSound(nowP.lastSpinWon ? "slotWin" : "slotLose");
    }
    if (mini?.kind === "roulette") {
      const old = prevMini?.kind === "roulette" ? prevMini : null;
      if (mini.spinning && !old?.spinning) playCasinoSound("rouletteSpin");
      if (old?.spinning && !mini.spinning && mini.resultNumber != null) playCasinoSound("rouletteLand");
    }
    if (mini?.kind === "fortune") {
      const old = prevMini?.kind === "fortune" ? prevMini : null;
      if (!old && mini.revealedIndex == null) playCasinoSound("fortuneSpin");
      if (old?.revealedIndex == null && mini.revealedIndex != null) playCasinoSound("fortuneLand");
    }
    if (mini?.kind === "race") {
      const old = prevMini?.kind === "race" ? prevMini : null;
      if (mini.startedAt && !old?.startedAt) playCasinoSound("raceStart");
      const finishedNow = Object.values(mini.progress).some((value) => value >= 100);
      const finishedBefore = old ? Object.values(old.progress).some((value) => value >= 100) : false;
      if (finishedNow && !finishedBefore) playCasinoSound("raceFinish");
    }
    if (mini?.kind === "dice") {
      const nowP = mini.players[selfId];
      const oldP = prevMini?.kind === "dice" ? prevMini.players[selfId] : null;
      if (nowP.rollingDie != null && oldP?.rollingDie == null) playCasinoSound("diceRoll");
      if (oldP?.rollingDie != null && nowP.rollingDie == null) playCasinoSound("diceLand");
    }
    if (mini?.kind === "hilo") {
      const nowP = mini.players[selfId];
      const oldP = prevMini?.kind === "hilo" ? prevMini.players[selfId] : null;
      if (nowP.flipping && !oldP?.flipping) playCasinoSound("hiloFlip");
      if (oldP?.lastCorrect !== nowP.lastCorrect && nowP.lastCorrect != null) playCasinoSound(nowP.lastCorrect ? "hiloWin" : "hiloLose");
    }
    if (mini?.kind === "plinko") {
      const nowP = mini.players[selfId];
      const oldP = prevMini?.kind === "plinko" ? prevMini.players[selfId] : null;
      if (nowP.dropping && !oldP?.dropping) playCasinoSound("plinkoDrop");
      if (oldP?.dropping && !nowP.dropping && nowP.bucketIndex != null) playCasinoSound("plinkoLand");
    }
    if (mini?.kind === "briefcase") {
      const old = prevMini?.kind === "briefcase" ? prevMini : null;
      if (mini.lastOpenedIndex != null && old?.lastOpenedIndex !== mini.lastOpenedIndex) {
        playCasinoSound(mini.lastValue === "lose" ? "briefcaseLose" : "briefcaseOpen");
      }
    }
    if (mini?.kind === "crash" && prevMini?.kind === "crash" && !prevMini.crashed && mini.crashed) playCasinoSound("crash");
    if (mini?.kind === "lastChance") {
      const old = prevMini?.kind === "lastChance" ? prevMini : null;
      if (mini.spinning[selfId] && !old?.spinning[selfId]) playCasinoSound("coinFlip");
      if (old?.spinning[selfId] && !mini.spinning[selfId] && mini.coinResults[selfId]) playCasinoSound("coinLand");
      if (old?.results[selfId] !== mini.results[selfId] && mini.results[selfId]) playCasinoSound(mini.results[selfId] === "revived" ? "revive" : "bankrupt");
      if (old?.results[selfId] !== "revived" && mini.results[selfId] === "revived") showMoneyToast(500);
    }

    const previousStatus = prev?.players[selfId]?.roundStatus;
    const currentStatus = state.players[selfId]?.roundStatus;
    if (prev && previousStatus !== currentStatus) {
      if (currentStatus === "won" || currentStatus === "lost" || currentStatus === "cashed") {
        const delta = state.players[selfId]?.roundDelta ?? 0;
        if (delta !== 0) showMoneyToast(delta);
        else if (currentStatus === "cashed") playCasinoSound("cash");
      }
    }
    if (prev && prev.phase !== "finished" && state.phase === "finished" && state.winnerId === selfId) playCasinoSound("victory");

    previousSoundState.current = state;
  }, [state, selfId]);

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
  if (!room || !state || !selfId || room.gameId !== "casino" || !selfState) {
    return <LoadingScreen label="Abrindo as mesas do cassino..." />;
  }

  const isHost = room.roomKind === "persistent-duo" || room.hostId === selfId;
  const isSoloBot = state.mode === "soloBot";
  const lengthInfo = CASINO_LENGTHS[state.length];
  const goToConfig = () => {
    if (!isHost) return;
    if (room.roomMode === "solo") {
      router.push("/solo/casino");
      return;
    }
    backToConfig();
    router.push(`/sala/${room.code}`);
  };
  const goToGames = () => {
    if (!isHost) return;
    if (room.roomMode === "solo") {
      router.push("/solo");
      return;
    }
    backToGameSelect();
    router.push(`/sala/${room.code}`);
  };

  return (
    <main className={`${styles.shell} app-shell`}>
      <div className={styles.ambientA} />
      <div className={styles.ambientB} />
      <MoneyDeltaPopup toast={moneyToast} />

      <header className={styles.topbar}>
        <button type="button" className={styles.backButton} onClick={goToConfig} disabled={!isHost} aria-label="Voltar para a configuração">
          <ArrowLeft size={18} />
        </button>
        <Logo size={38} />
        <div className={styles.roomPill}>{isSoloBot ? "Solo · BOT" : isPersistentDuoRoomCode(room.code) ? "Nosso lobby" : `Sala ${room.code}`}</div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroDecorLeft} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/casino/chip_blue.png" alt="" />
        </div>
        <div className={styles.heroText}>
          <div className={styles.eyebrow}><Sparkles size={15} /> {isSoloBot ? "Cassino Royale · Solo vs BOT" : "Cassino Royale · Duelo"}</div>
          <h1>Cassino</h1>
          <p>{isSoloBot ? "Arrisque, saque na hora certa e supere o BOT até a meta de fichas." : "Arrisque, saque na hora certa e seja o primeiro a alcançar a meta de fichas."}</p>
          <div className={styles.metaRow}>
            <span>{lengthInfo.emoji} {lengthInfo.label}</span>
            <span><Coins size={14} /> Meta {formatCasinoChips(state.targetBalance)}</span>
            <span>Rodada {state.round}</span>
          </div>
        </div>
        <div className={styles.heroDecorRight} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/casino/coin.png" alt="" />
        </div>
      </section>

      <PlayerBankrolls state={state} players={players} selfId={selfId} photos={photos} />

      <AnimatePresence mode="wait">
        <motion.section
          key={`${state.phase}-${state.round}-${state.chosenGame ?? "none"}`}
          initial={{ opacity: 0, y: 10, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className={styles.floor}
        >
          {state.phase === "selecting" && (
            <GameSelection
              state={state}
              selfId={selfId}
              opponentName={opponent?.name ?? "Seu par"}
              onVote={game.vote}
            />
          )}

          {state.phase === "betting" && state.chosenGame && (
            <BettingPanel
              state={state}
              selfId={selfId}
              opponentName={opponent?.name ?? "Seu par"}
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              onLock={game.lockBet}
            />
          )}

          {state.phase === "playing" && state.chosenGame && (
            <PlayingPanel
              state={state}
              selfId={selfId}
              opponentName={opponent?.name ?? "Seu par"}
              actions={game}
            />
          )}

          {state.phase === "roundResult" && (
            <RoundResult
              state={state}
              selfId={selfId}
              players={players}
              onNext={game.nextRound}
            />
          )}

          {state.phase === "lastChance" && (
            <LastChance state={state} selfId={selfId} opponentName={opponent?.name ?? "Seu par"} onChoose={game.lastChanceChoose} onSpin={game.lastChanceSpin} />
          )}

          {state.phase === "finished" && (
            <FinishedPanel
              state={state}
              selfId={selfId}
              players={players}
              isHost={isHost}
              onAgain={game.newGame}
              onGames={goToGames}
            />
          )}
        </motion.section>
      </AnimatePresence>

      {state.history.length > 0 && state.phase !== "finished" ? <HistoryStrip state={state} /> : null}
    </main>
  );
}

function MoneyDeltaPopup({ toast }: { toast: { id: number; delta: number } | null }) {
  const positive = (toast?.delta ?? 0) > 0;
  const magnitude = Math.abs(toast?.delta ?? 0);
  const intensity = positive
    ? magnitude >= 1_500 ? 3 : magnitude >= 700 ? 2 : magnitude >= 250 ? 1 : 0
    : 0;
  const particleCount = [24, 32, 42, 54][intensity];
  const burstRadius = [92, 128, 168, 218][intensity];
  const duration = [1.65, 1.78, 1.95, 2.12][intensity];
  const powerClass = [styles.moneyToastPower0, styles.moneyToastPower1, styles.moneyToastPower2, styles.moneyToastPower3][intensity];
  const peakScale = [1.08, 1.15, 1.24, 1.36][intensity];
  const lift = [28, 34, 42, 52][intensity];

  return (
    <div className={styles.moneyToastLayer} aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.id}
            className={`${styles.moneyToast} ${positive ? styles.moneyToastGain : styles.moneyToastLoss} ${positive ? powerClass : ""}`}
            initial={{ opacity: 0, y: 20, scale: 0.68, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [20, -5 - intensity * 2, -12 - intensity * 3, -lift],
              scale: [0.68, peakScale, 1 + intensity * 0.018, 0.94],
              rotate: intensity >= 2 ? [0, -2.2 - intensity * 0.4, 2.1 + intensity * 0.35, 0] : 0,
            }}
            exit={{ opacity: 0, y: -lift - 8, scale: 0.9 }}
            transition={{ duration, times: [0, 0.17, 0.68, 1], ease: [0.16, 1, 0.3, 1] }}
          >
            {positive ? (
              <div className={styles.moneyBurst} aria-hidden="true">
                {Array.from({ length: particleCount }).map((_, index) => {
                  const angle = (index / particleCount) * Math.PI * 2 + (index % 2) * 0.055;
                  const ring = 0.72 + (index % 6) * 0.065;
                  const distance = burstRadius * ring;
                  const fontSize = 16 + intensity * 2 + (index % 4) * 1.4;
                  return (
                    <motion.span
                      key={index}
                      initial={{ x: 0, y: 0, opacity: 0, scale: 0.28, rotate: 0 }}
                      animate={{
                        x: Math.cos(angle) * distance,
                        y: Math.sin(angle) * distance - 12 - intensity * 5,
                        opacity: [0, 1, 0.95, 0],
                        scale: [0.28, 1.05 + intensity * 0.08, 0.92, 0.5],
                        rotate: (index % 2 === 0 ? 1 : -1) * (32 + intensity * 18 + (index % 5) * 8),
                      }}
                      transition={{ duration: 1.05 + intensity * 0.16, delay: (index % 10) * 0.014, ease: "easeOut" }}
                      style={{ fontSize }}
                    >$</motion.span>
                  );
                })}
              </div>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/casino/money-bag.png" alt="" />
            <strong>{positive ? "+" : ""}{formatSignedChips(toast.delta)}</strong>
            <span>fichas</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function PlayerBankrolls({ state, players, selfId, photos }: { state: CasinoState; players: { id: string; name: string; color: string; accountId?: "andre" | "flavia" }[]; selfId: string; photos: Partial<Record<"andre" | "flavia", string | null>> }) {
  return (
    <section className={styles.bankrollGrid}>
      {players.map((player) => {
        const p = state.players[player.id];
        const progress = Math.min(100, (p.balance / state.targetBalance) * 100);
        return (
          <div key={player.id} className={`${styles.bankrollCard} ${player.id === selfId ? styles.bankrollSelf : ""}`}>
            <div className={styles.bankrollTop}>
              <div className={styles.playerNameLine}>
                <AccountAvatar
                  name={player.name}
                  photo={player.accountId ? photos[player.accountId] ?? undefined : undefined}
                  accountId={player.accountId}
                  fallbackColor={player.color}
                  size={30}
                />
                <span>{player.id === selfId ? "Você" : player.name}</span>
              </div>
              <span className={styles.balance}><Coins size={16} /> {formatCasinoChips(p.balance)}</span>
            </div>
            <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>
            <div className={styles.bankrollBottom}>
              <span>{Math.round(progress)}% da meta</span>
              {p.lastChanceUsed ? <span>☠️ última chance usada</span> : <span>👑 alvo {formatCasinoChips(state.targetBalance)}</span>}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function GameSelection({ state, selfId, opponentName, onVote }: { state: CasinoState; selfId: string; opponentName: string; onVote: (game: CasinoMiniGame) => void }) {
  const ownVote = state.players[selfId]?.vote;
  const opponentId = state.expectedPlayers.find((id) => id !== selfId);
  const opponentVoted = Boolean(opponentId && state.players[opponentId]?.vote);
  return (
    <div className={styles.selectionPanel}>
      <div className={styles.sectionHeading}>
        <span className={styles.stepBadge}>01</span>
        <div><small>Próxima mesa</small><h2>Escolha seu jogo em segredo</h2></div>
      </div>
      <p className={styles.lead}>Se vocês escolherem diferente, o cassino sorteia 50/50 entre as duas escolhas.</p>

      <div className={styles.gameChoiceGrid}>
        {state.offeredGames.map((id, index) => {
          const info = CASINO_GAMES[id];
          const selected = ownVote === id;
          return (
            <button
              key={id}
              type="button"
              className={`${styles.gameChoice} ${selected ? styles.gameChoiceSelected : ""}`}
              onClick={() => onVote(id)}
              disabled={Boolean(ownVote)}
            >
              <span className={styles.choiceIndex}>0{index + 1}</span>
              <span className={styles.choiceEmoji}>{info.emoji}</span>
              <strong>{info.label}</strong>
              <span>{info.short}</span>
              <em>{selected ? "Escolhido ✓" : "Selecionar"}</em>
            </button>
          );
        })}
      </div>

      <div className={styles.secretStatus}>
        <div className={ownVote ? styles.statusReady : ""}><LockKeyhole size={15} /> Você: {ownVote ? "voto confirmado" : "escolhendo..."}</div>
        <div className={opponentVoted ? styles.statusReady : ""}><LockKeyhole size={15} /> {opponentName}: {opponentVoted ? "voto confirmado" : "escolhendo..."}</div>
      </div>
    </div>
  );
}

function BettingPanel({ state, selfId, opponentName, betAmount, setBetAmount, onLock }: {
  state: CasinoState;
  selfId: string;
  opponentName: string;
  betAmount: number;
  setBetAmount: (value: number) => void;
  onLock: (amount: number) => void;
}) {
  const player = state.players[selfId];
  const opponentId = state.expectedPlayers.find((id) => id !== selfId);
  const opponent = opponentId ? state.players[opponentId] : null;
  const game = CASINO_GAMES[state.chosenGame!];
  const min = casinoMinimumBet(player.balance);
  const clamp = (value: number) => Math.max(min, Math.min(player.balance, Math.round(value / 10) * 10));
  const presets = [0.25, 0.5, 1] as const;

  return (
    <div className={styles.betPanel}>
      <div className={styles.chosenGameBanner}>
        <div className={styles.chosenIcon}>{game.emoji}</div>
        <div><small>Jogo sorteado</small><h2>{game.label}</h2><p>{game.short}</p></div>
      </div>

      <div className={styles.betBox}>
        <span className={styles.smallCaps}>Sua aposta</span>
        <div className={styles.betValue}><Coins size={25} /> {formatCasinoChips(player.betLocked ? player.roundBet ?? betAmount : betAmount)}</div>
        <input
          type="range"
          min={min}
          max={player.balance}
          step={10}
          value={clamp(betAmount)}
          onChange={(event) => setBetAmount(clamp(Number(event.target.value)))}
          disabled={player.betLocked}
          className={styles.betSlider}
        />
        <div className={styles.betScale}><span>Mín. {formatCasinoChips(min)}</span><span>Saldo {formatCasinoChips(player.balance)}</span></div>
        <div className={styles.betPresets}>
          {presets.map((ratio) => (
            <button key={ratio} type="button" onClick={() => setBetAmount(clamp(player.balance * ratio))} disabled={player.betLocked}>
              {ratio === 1 ? "ALL-IN" : `${ratio * 100}%`}
            </button>
          ))}
        </div>
        <button type="button" className={styles.primaryCasinoButton} onClick={() => onLock(clamp(betAmount))} disabled={player.betLocked}>
          {player.betLocked ? <><Check size={18} /> Aposta confirmada</> : <><LockKeyhole size={18} /> Confirmar aposta</>}
        </button>
      </div>

      <div className={styles.secretStatus}>
        <div className={player.betLocked ? styles.statusReady : ""}><LockKeyhole size={15} /> Você: {player.betLocked ? "pronto" : "definindo aposta"}</div>
        <div className={opponent?.betLocked ? styles.statusReady : ""}><LockKeyhole size={15} /> {opponentName}: {opponent?.betLocked ? "pronto" : "definindo aposta"}</div>
      </div>
      <p className={styles.finePrint}>Aposta mínima: 10% do saldo atual. Os valores ficam escondidos até os dois confirmarem.</p>
    </div>
  );
}

type CasinoActions = ReturnType<typeof useCasinoGame>;

function PlayingPanel({ state, selfId, opponentName, actions }: { state: CasinoState; selfId: string; opponentName: string; actions: CasinoActions }) {
  const mini = state.miniState;
  if (!mini) return null;
  return (
    <div className={styles.playingPanel}>
      <div className={styles.playingHeader}>
        <div><small>Rodada {state.round}</small><h2>{CASINO_GAMES[state.chosenGame!].emoji} {CASINO_GAMES[state.chosenGame!].label}</h2></div>
        <div className={styles.currentBet}><span>Aposta</span><strong><Coins size={15} /> {formatCasinoChips(state.players[selfId].roundBet ?? 0)}</strong></div>
      </div>

      {mini.kind === "mines" && <MinesBoard state={state} selfId={selfId} opponentName={opponentName} onOpen={actions.minesOpen} onCashOut={actions.cashOut} />}
      {mini.kind === "crash" && <CrashBoard state={state} selfId={selfId} opponentName={opponentName} onCashOut={actions.crashCashOut} />}
      {mini.kind === "roulette" && <RouletteBoard state={state} selfId={selfId} opponentName={opponentName} onPick={actions.roulettePick} />}
      {mini.kind === "slots" && <SlotsBoard state={state} selfId={selfId} opponentName={opponentName} onSpin={actions.slotsSpin} onCashOut={actions.cashOut} />}
      {mini.kind === "race" && <RaceBoard state={state} selfId={selfId} opponentName={opponentName} onPick={actions.racePick} />}
      {mini.kind === "dice" && <DiceBoard state={state} selfId={selfId} opponentName={opponentName} onRoll={actions.diceRoll} onContinue={actions.diceContinue} onCashOut={actions.cashOut} />}
      {mini.kind === "hilo" && <HiLoBoard state={state} selfId={selfId} opponentName={opponentName} onGuess={actions.hiloGuess} onContinue={actions.hiloContinue} onCashOut={actions.cashOut} />}
      {mini.kind === "fortune" && <FortuneBoard state={state} opponentName={opponentName} />}
      {mini.kind === "plinko" && <PlinkoBoard state={state} selfId={selfId} opponentName={opponentName} onDrop={actions.plinkoDrop} />}
      {mini.kind === "briefcase" && <BriefcaseBoard state={state} selfId={selfId} opponentName={opponentName} onOpen={actions.briefcaseOpen} onContinue={actions.briefcaseContinue} onCashOut={actions.cashOut} />}
    </div>
  );
}

function OpponentMiniStatus({ state, selfId, opponentName }: { state: CasinoState; selfId: string; opponentName: string }) {
  const opponentId = state.expectedPlayers.find((id) => id !== selfId);
  const p = opponentId ? state.players[opponentId] : null;
  const labels: Record<string, string> = {
    playing: "jogando",
    waiting: "esperando",
    won: "ganhou",
    lost: "perdeu",
    cashed: "sacou",
    idle: "preparando",
  };
  return <div className={styles.opponentStatus}><span className={styles.liveDot} /> {opponentName}: <strong>{p ? labels[p.roundStatus] ?? p.roundStatus : "—"}</strong></div>;
}

function MinesBoard({ state, selfId, opponentName, onOpen, onCashOut }: { state: CasinoState; selfId: string; opponentName: string; onOpen: (index: number) => void; onCashOut: () => void }) {
  const mini = state.miniState;
  if (!mini || mini.kind !== "mines") return null;
  const p = mini.players[selfId];
  const potential = Math.round((state.players[selfId].roundBet ?? 0) * p.multiplier);
  return (
    <div className={styles.minesLayout}>
      <div className={styles.riskRail}>
        <Bomb size={20} />
        <span>5 bombas</span>
        <strong>{p.multiplier.toFixed(2)}×</strong>
        <small>{p.openedIndexes.length}/20 seguras</small>
      </div>
      <div className={styles.minesGrid}>
        {Array.from({ length: 25 }).map((_, index) => {
          const opened = p.openedIndexes.includes(index);
          const explodedHere = p.explodedIndex === index;
          return (
            <button key={index} type="button" disabled={opened || p.done} onClick={() => onOpen(index)} className={`${styles.mineCell} ${opened ? styles.mineSafe : ""} ${explodedHere ? styles.mineBomb : ""} ${p.exploded && !opened && !explodedHere ? styles.mineAfterExplosion : ""}`}>
              {explodedHere ? <span>💣</span> : opened ? <span>💎</span> : <span className={styles.mineBack}>♠</span>}
            </button>
          );
        })}
      </div>
      <div className={styles.gameActions}>
        <div className={styles.potential}><span>Saque atual</span><strong>{formatCasinoChips(potential)} fichas</strong></div>
        <button type="button" className={styles.cashButton} disabled={p.done || p.openedIndexes.length === 0} onClick={onCashOut}>💰 Sacar {p.multiplier.toFixed(2)}×</button>
      </div>
      {p.exploded ? <div className={styles.lossBanner}>💥 Bomba! Sua tentativa acabou.</div> : null}
      {p.done ? <OpponentMiniStatus state={state} selfId={selfId} opponentName={opponentName} /> : null}
    </div>
  );
}

function CrashBoard({ state, selfId, opponentName, onCashOut }: { state: CasinoState; selfId: string; opponentName: string; onCashOut: () => void }) {
  const mini = state.miniState;
  if (!mini || mini.kind !== "crash") return null;
  const selfCash = mini.cashouts[selfId];
  const waitingStart = Date.now() < mini.startedAt;
  const normalized = Math.min(1, Math.max(0, (mini.multiplier - 1) / 8));
  const points = Array.from({ length: 14 }, (_, i) => {
    const x = (i / 13) * 100;
    const y = 88 - Math.pow(i / 13, 1.65) * (20 + normalized * 55);
    return `${x},${y}`;
  }).join(" ");
  return (
    <div className={styles.crashWrap}>
      <div className={`${styles.crashGraph} ${mini.crashed ? styles.crashGraphDead : ""}`}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="casinoCrashFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".28"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
          <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
          <polygon points={`0,100 ${points} 100,100`} fill="url(#casinoCrashFill)" />
        </svg>
        <div className={styles.crashCenter}>
          <small>{waitingStart ? "PREPARANDO" : mini.crashed ? "CRASH" : "MULTIPLICADOR"}</small>
          <strong>{mini.multiplier.toFixed(2)}×</strong>
          {mini.crashed ? <span>💥 QUEBROU</span> : <span>📈 subindo...</span>}
        </div>
      </div>
      <div className={styles.crashPlayers}>
        {state.expectedPlayers.map((id) => {
          const cash = mini.cashouts[id];
          return <div key={id} className={cash ? styles.crashCashed : ""}><span>{id === selfId ? "Você" : opponentName}</span><strong>{cash ? `Sacou ${cash.toFixed(2)}×` : mini.crashed ? "Perdeu" : "No jogo"}</strong></div>;
        })}
      </div>
      <button type="button" className={styles.cashButtonBig} disabled={Boolean(selfCash) || mini.crashed || waitingStart} onClick={onCashOut}>
        {selfCash ? `✓ Sacado em ${selfCash.toFixed(2)}×` : `SACAR · ${mini.multiplier.toFixed(2)}×`}
      </button>
    </div>
  );
}

function RouletteBoard({ state, selfId, opponentName, onPick }: { state: CasinoState; selfId: string; opponentName: string; onPick: (bet: RouletteBet) => void }) {
  const mini = state.miniState;
  if (!mini || mini.kind !== "roulette") return null;
  const ownPick = mini.selections[selfId];
  const opponentId = state.expectedPlayers.find((id) => id !== selfId);
  const opponentPick = opponentId ? mini.selections[opponentId] : null;
  if (!mini.spinning && !mini.settling && mini.resultColor == null) {
    return (
      <div className={styles.rouletteBetting}>
        <p className={styles.centerHint}>{ownPick ? "Sua aposta está travada. Aguardando o outro jogador..." : "Escolha onde sua aposta vai ficar nesta rodada."}</p>
        <div className={styles.rouletteSimpleBets}>
          <button disabled={Boolean(ownPick)} onClick={() => onPick({ kind: "red" })} className={styles.redBet}>🔴 Vermelho <b>2×</b></button>
          <button disabled={Boolean(ownPick)} onClick={() => onPick({ kind: "black" })} className={styles.blackBet}>⚫ Preto <b>2×</b></button>
          <button disabled={Boolean(ownPick)} onClick={() => onPick({ kind: "odd" })}>Ímpar <b>2×</b></button>
          <button disabled={Boolean(ownPick)} onClick={() => onPick({ kind: "even" })}>Par <b>2×</b></button>
          <button disabled={Boolean(ownPick)} onClick={() => onPick({ kind: "low" })}>1–18 <b>2×</b></button>
          <button disabled={Boolean(ownPick)} onClick={() => onPick({ kind: "high" })}>19–36 <b>2×</b></button>
          <button disabled={Boolean(ownPick)} onClick={() => onPick({ kind: "dozen", value: 1 })}>1ª dúzia <b>3×</b></button>
          <button disabled={Boolean(ownPick)} onClick={() => onPick({ kind: "dozen", value: 2 })}>2ª dúzia <b>3×</b></button>
          <button disabled={Boolean(ownPick)} onClick={() => onPick({ kind: "dozen", value: 3 })}>3ª dúzia <b>3×</b></button>
        </div>
        <div className={styles.numberLabel}>Número exato · 36×</div>
        <div className={styles.rouletteNumbers}>
          {Array.from({ length: 37 }).map((_, number) => (
            <button
              key={number}
              type="button"
              disabled={Boolean(ownPick)}
              onClick={() => onPick({ kind: "number", value: number })}
              className={number === 0 ? styles.numberGreen : ROULETTE_RED.has(number) ? styles.numberRed : styles.numberBlack}
            >{number}</button>
          ))}
        </div>
        <div className={styles.secretStatus}>
          <div className={ownPick ? styles.statusReady : ""}><LockKeyhole size={14}/> Você: {ownPick ? formatRouletteBet(ownPick) : "escolhendo"}</div>
          <div className={opponentPick ? styles.statusReady : ""}><LockKeyhole size={14}/> {opponentName}: {opponentPick ? formatRouletteBet(opponentPick) : "escolhendo"}</div>
        </div>
      </div>
    );
  }

  const resultOrderIndex = mini.resultNumber == null ? 0 : Math.max(0, ROULETTE_WHEEL_ORDER.indexOf(mini.resultNumber as (typeof ROULETTE_WHEEL_ORDER)[number]));
  const resultAngle = resultOrderIndex * (360 / ROULETTE_WHEEL_ORDER.length);
  // O servidor já sorteou o número depois que as duas apostas foram travadas.
  // A roda nasce com esse alvo e faz UM giro só: 6 voltas + o deslocamento
  // necessário para colocar exatamente a casa sorteada sob o ponteiro.
  const finalWheelRotation = 2160 + ((360 - resultAngle) % 360);

  return (
    <div className={styles.rouletteSpinArea}>
      <div className={styles.rouletteTable}>
        <div className={styles.roulettePointer}>▼</div>
        <motion.div
          key={`roulette-wheel-${mini.spinStartedAt}-${mini.resultNumber}`}
          className={styles.rouletteWheel}
          initial={{ rotate: 0 }}
          animate={{ rotate: finalWheelRotation }}
          transition={{ duration: 4.35, ease: [0.08, 0.72, 0.12, 1] }}
        >
          {ROULETTE_WHEEL_ORDER.map((number, index) => {
            const angle = index * (360 / ROULETTE_WHEEL_ORDER.length);
            return <span key={number} className={styles.rouletteNumberMark} style={{ "--roulette-angle": `${angle}deg` } as React.CSSProperties}>{number}</span>;
          })}
          <div className={styles.rouletteInner}><span></span><small>ROYALE</small></div>
        </motion.div>
        <motion.div
          key={`roulette-ball-${mini.spinStartedAt}-${mini.resultNumber}`}
          className={styles.rouletteBallOrbit}
          initial={{ rotate: 0 }}
          animate={{ rotate: -2160 }}
          transition={{ duration: 4.35, ease: [0.06, 0.7, 0.1, 1] }}
        >
          <span className={styles.rouletteBall} />
        </motion.div>
      </div>
      <div className={styles.spinStatus}>A bolinha está girando e desacelerando até a casa sorteada...</div>
      <div className={styles.sharedBets}>
        <span>Você · {ownPick ? formatRouletteBet(ownPick) : "—"}</span>
        <span>{opponentName} · {opponentPick ? formatRouletteBet(opponentPick) : "—"}</span>
      </div>
      <p className={styles.centerHint}>A mesma bolinha vale para os dois jogadores.</p>
    </div>
  );
}

function formatRouletteBet(bet: RouletteBet): string {
  if (bet.kind === "number") return `número ${bet.value}`;
  if (bet.kind === "dozen") return `${bet.value}ª dúzia`;
  const labels: Record<string, string> = { red: "vermelho", black: "preto", odd: "ímpar", even: "par", low: "1–18", high: "19–36" };
  return labels[bet.kind] ?? bet.kind;
}

function SlotsBoard({ state, selfId, opponentName, onSpin, onCashOut }: { state: CasinoState; selfId: string; opponentName: string; onSpin: () => void; onCashOut: () => void }) {
  const mini = state.miniState;
  if (!mini || mini.kind !== "slots") return null;
  const p = mini.players[selfId];
  const fallbackSymbols: SlotSymbolId[] = ["cherry", "star", "diamond", "clover", "thunder", "plum", "heart-card", "club-card", "strawberry"];
  const symbols = p.lastSymbols.length === 9 ? p.lastSymbols : fallbackSymbols;
  const spinSymbols: readonly SlotSymbolId[] = ["cherry", "clover", "plum", "star", "heart-card", "club-card", "thunder", "diamond", "strawberry"];
  const winningCells = new Set(p.lastWinningLines.flatMap((lineIndex) => SLOT_WIN_LINES[lineIndex] ?? []));
  const baseSpinsLeft = Math.max(0, 3 - p.spinsUsed);
  const bonusActive = p.spinsUsed >= 3 && p.lastSpinWon === true && !p.done;
  const nextSpinLabel = p.spinsUsed < 3 ? `Giro ${p.spinsUsed + 1}/3` : `Giro bônus ${Math.max(1, p.spinsUsed - 2)}`;

  return (
    <div className={styles.slotsWrap}>
      <div className={`${styles.slotMachine} ${p.spinning ? styles.slotMachineActive : ""} ${p.jackpotHit ? styles.slotMachineJackpot : ""}`}>
        <div className={styles.jackpotMarquee} aria-label="Jáckpot">
          <div className={styles.marqueeBulbs} aria-hidden="true">{Array.from({ length: 18 }).map((_, index) => <i key={index} />)}</div>
          <Crown size={23} />
          <strong>JÁCKPOT</strong>
          <Crown size={23} />
          <small>{p.spinsUsed < 3 ? `${p.spinsUsed}/3 giros usados` : bonusActive ? "BÔNUS ATIVO · VENÇA PARA CONTINUAR" : "3 GIROS CONSUMIDOS"}</small>
        </div>

        {p.spinning ? (
          <div className={styles.jackpotColumnReels} aria-label="Três colunas do jackpot girando">
            {[0, 1, 2].map((column) => {
              const targets: SlotSymbolId[] = [
                p.pendingSymbols?.[column] ?? symbols[column],
                p.pendingSymbols?.[column + 3] ?? symbols[column + 3],
                p.pendingSymbols?.[column + 6] ?? symbols[column + 6],
              ];
              return (
                <AnimatedSlotColumn
                  key={`${p.spinStartedAt}-${column}`}
                  column={column}
                  symbols={spinSymbols}
                  targetSymbols={targets}
                />
              );
            })}
          </div>
        ) : (
          <div className={`${styles.reels} ${styles.jackpotGrid}`}>
            {Array.from({ length: 9 }).map((_, index) => {
              const isWinningCell = winningCells.has(index);
              return (
                <div key={index} className={`${styles.reel} ${isWinningCell ? styles.jackpotCellWin : ""} ${p.jackpotHit ? styles.jackpotCellGrand : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slotAsset(symbols[index])} alt={symbols[index]} />
                </div>
              );
            })}
            {p.lastWinningLines.length > 0 ? (
              <svg className={styles.jackpotPaylines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {p.lastWinningLines.map((lineIndex) => <path key={lineIndex} d={SLOT_PAYLINE_PATHS[lineIndex] ?? ""} />)}
              </svg>
            ) : null}
          </div>
        )}

        <div className={styles.jackpotInfoBar}>
          <div><span>{p.spinning ? "GIRO EM ANDAMENTO" : "ACUMULADO"}</span><strong>{p.multiplier.toFixed(2)}×</strong></div>
          <div><span>GIROS</span><strong>{p.spinsUsed < 3 ? `${p.spinsUsed}/3` : bonusActive ? "BÔNUS" : `${p.spinsUsed}`}</strong></div>
          <div><span>LINHAS</span><strong>{p.spinning ? "—" : `${p.lastWinningLines.length}/8`}</strong></div>
          <div><span>PRÊMIO MÁX.</span><strong>50×</strong></div>
        </div>
      </div>

      {p.spinning ? <div className={styles.spinStatus}>🎰 As três colunas estão girando como rolos inteiros e vão parar uma após a outra.</div> : null}
      {!p.spinning && p.jackpotHit ? <div className={`${styles.winBanner} ${styles.jackpotWinBanner}`}>👑 JACKPOT! Combinação máxima · multiplicador de 50×!</div> : null}
      {!p.spinning && p.lastSpinWon === true && !p.jackpotHit ? (
        <div className={styles.winBanner}>✨ {p.lastWinningLines.length} {p.lastWinningLines.length === 1 ? "linha" : "linhas"}! Giro valeu {p.lastWinFactor?.toFixed(2)}× · acumulado {p.multiplier.toFixed(2)}×.</div>
      ) : null}
      {!p.spinning && p.lastSpinWon === false && !p.done ? (
        <div className={styles.slotMissBanner}>Sem combinação. Sua aposta continua viva — {baseSpinsLeft} {baseSpinsLeft === 1 ? "chance restante" : "chances restantes"}.</div>
      ) : null}
      {!p.spinning && p.lastSpinWon === false && p.done ? <div className={styles.lossBanner}>Sem combinação no giro decisivo. Agora a aposta foi perdida.</div> : null}
      {bonusActive ? <div className={styles.bonusSpinBanner}>🔥 Você venceu depois do 3º giro: ganhou mais uma chance. Se vencer de novo, ganha outra; se errar, encerra.</div> : null}

      {!p.done && !p.awaitingDecision && !p.spinning ? (
        <button type="button" className={styles.primaryCasinoButton} onClick={onSpin}><RotateCw size={18}/> {nextSpinLabel}</button>
      ) : null}
      {!p.done && p.awaitingDecision && !p.spinning ? (
        <div className={styles.dualActions}>
          <button type="button" className={styles.cashButton} onClick={onCashOut}>💰 Sacar {p.multiplier.toFixed(2)}×</button>
          <button type="button" className={styles.riskButton} onClick={onSpin}>🎰 {nextSpinLabel}</button>
        </div>
      ) : null}
      {p.done && p.revealEndsAt == null ? <OpponentMiniStatus state={state} selfId={selfId} opponentName={opponentName} /> : null}
    </div>
  );
}

function AnimatedSlotColumn({ column, symbols, targetSymbols }: { column: number; symbols: readonly SlotSymbolId[]; targetSymbols: readonly SlotSymbolId[] }) {
  const fillerCount = 21 + column * 3;
  const filler = Array.from({ length: fillerCount }, (_, index) => symbols[(index * 2 + column * 3 + (index % 4)) % symbols.length]);
  const reelItems = [...filler, ...targetSymbols];
  const stopPercent = ((reelItems.length - 3) / reelItems.length) * 100;
  const duration = 1.82 + column * 0.28;

  return (
    <div className={styles.slotColumnViewport}>
      <motion.div
        className={styles.slotColumnStrip}
        style={{ "--slot-items": reelItems.length } as React.CSSProperties}
        initial={{ y: "0%" }}
        animate={{ y: `-${stopPercent}%` }}
        transition={{ duration, ease: [0.08, 0.72, 0.12, 1] }}
      >
        {reelItems.map((symbol, index) => (
          <div key={`${column}-${index}-${symbol}`} className={styles.slotColumnSymbol}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slotAsset(symbol)} alt="" />
          </div>
        ))}
      </motion.div>
      <span className={styles.slotColumnDividerA} aria-hidden="true" />
      <span className={styles.slotColumnDividerB} aria-hidden="true" />
    </div>
  );
}

function RaceBoard({ state, selfId, opponentName, onPick }: { state: CasinoState; selfId: string; opponentName: string; onPick: (racer: CasinoRacerId) => void }) {
  const mini = state.miniState;
  if (!mini || mini.kind !== "race") return null;
  const ownPick = mini.picks[selfId];
  const opponentId = state.expectedPlayers.find((id) => id !== selfId);
  const opponentPick = opponentId ? mini.picks[opponentId] : null;

  if (!mini.startedAt) {
    return (
      <div>
        <p className={styles.centerHint}>Escolha seu corredor. Odds maiores pagam mais, mas aparecem menos como favoritos.</p>
        <div className={styles.racerCards}>
          {CASINO_RACERS.map((racer) => (
            <button key={racer.id} type="button" disabled={Boolean(ownPick)} onClick={() => onPick(racer.id)} className={ownPick === racer.id ? styles.racerSelected : ""}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={racerAsset(racer.id)} alt="" />
              <span>{racer.label}</span>
              <strong>{racer.odds.toFixed(1)}×</strong>
            </button>
          ))}
        </div>
        <div className={styles.secretStatus}>
          <div className={ownPick ? styles.statusReady : ""}><LockKeyhole size={14}/> Você: {ownPick ? "corredor escolhido" : "escolhendo"}</div>
          <div className={opponentPick ? styles.statusReady : ""}><LockKeyhole size={14}/> {opponentName}: {opponentPick ? "corredor escolhido" : "escolhendo"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.raceTrackWrap}>
      <div className={styles.raceHeaderLine}><Flag size={18}/> CORRIDA AO VIVO <span>mesmo resultado para os dois</span></div>
      <div className={styles.raceLanes}>
        {CASINO_RACERS.map((racer) => (
          <div key={racer.id} className={styles.raceLane}>
            <div className={styles.raceLaneMeta}><span>{racer.label}</span><b>{racer.odds.toFixed(1)}×</b></div>
            <div className={styles.trackLine}>
              <span className={styles.finishFlag}>🏁</span>
              <div className={styles.racerToken} style={{ left: `calc(${Math.min(96, mini.progress[racer.id] * 0.96)}% - 18px)` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={racerAsset(racer.id)} alt="" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.sharedBets}>
        <span>Você · {ownPick ? CASINO_RACERS.find((r) => r.id === ownPick)?.label : "—"}</span>
        <span>{opponentName} · {opponentPick ? CASINO_RACERS.find((r) => r.id === opponentPick)?.label : "—"}</span>
      </div>
    </div>
  );
}

function PlinkoBoard({ state, selfId, opponentName, onDrop }: { state: CasinoState; selfId: string; opponentName: string; onDrop: () => void }) {
  const mini = state.miniState;
  if (!mini || mini.kind !== "plinko") return null;
  const p = mini.players[selfId];
  const bet = state.players[selfId].roundBet ?? 0;
  const landed = p.done && p.bucketIndex != null;
  const landedMultiplier = p.multiplier ?? 0;

  return (
    <div className={styles.plinkoWrap}>
      <div className={styles.plinkoHeader}>
        <div><small>12 FILEIRAS · FÍSICA ANIMADA</small><strong>Solte a ficha e torça pelos cantos</strong></div>
        <span>até <b>12×</b></span>
      </div>
      <div className={styles.plinkoBoard}>
        <div className={styles.plinkoGlow} aria-hidden="true" />
        {Array.from({ length: mini.rows }).map((_, row) => {
          const count = row + 1;
          return Array.from({ length: count }).map((__, column) => {
            const spacing = 7;
            const left = 50 + (column - (count - 1) / 2) * spacing;
            const top = 9 + row * 6.1;
            return <i key={`${row}-${column}`} className={styles.plinkoPeg} style={{ left: `${left}%`, top: `${top}%` }} />;
          });
        })}
        {p.dropping && p.path ? <PlinkoBall key={p.dropStartedAt ?? state.round} path={p.path} bucket={p.pendingBucket ?? 6} rows={mini.rows} /> : null}
        {landed ? (
          <motion.div className={styles.plinkoLandedBall} initial={{ scale: 0.4, y: -20 }} animate={{ scale: [0.4, 1.25, 1], y: 0 }} style={{ left: `${4.6 + (p.bucketIndex ?? 6) * (90.8 / 12)}%` }} />
        ) : null}
        <div className={styles.plinkoBuckets}>
          {mini.multipliers.map((multiplier, index) => (
            <div key={`${multiplier}-${index}`} className={`${styles.plinkoBucket} ${multiplier >= 5 ? styles.plinkoBucketHot : multiplier < 1 ? styles.plinkoBucketCold : ""} ${p.bucketIndex === index ? styles.plinkoBucketHit : ""}`}>
              {multiplier}×
            </div>
          ))}
        </div>
      </div>

      {!p.done && !p.dropping ? <button type="button" className={styles.primaryCasinoButton} onClick={onDrop}>🔻 Soltar ficha</button> : null}
      {p.dropping ? <div className={styles.spinStatus}>🪙 A ficha está quicando entre os pinos...</div> : null}
      {landed ? (
        <div className={landedMultiplier > 1 ? styles.winBanner : landedMultiplier < 1 ? styles.lossBanner : styles.neutralBanner}>
          Caiu em <b>{landedMultiplier.toFixed(2)}×</b> · retorno {formatCasinoChips(Math.round(bet * landedMultiplier))} fichas.
        </div>
      ) : null}
      {p.done && p.revealEndsAt == null ? <OpponentMiniStatus state={state} selfId={selfId} opponentName={opponentName} /> : null}
    </div>
  );
}

function PlinkoBall({ path, bucket, rows }: { path: number[]; bucket: number; rows: number }) {
  const horizontalStep = 3.5;
  let x = 50;
  const left: string[] = ["50%"];
  const top: string[] = ["2.5%"];
  const rotate: number[] = [0];
  path.slice(0, rows).forEach((direction, row) => {
    const pegTop = 9 + row * 6.1;
    left.push(`${x}%`);
    top.push(`${pegTop - 1.3}%`);
    rotate.push((row + 1) * 80 * direction);
    x += direction * horizontalStep;
    left.push(`${x}%`);
    top.push(`${pegTop + 2.5}%`);
    rotate.push((row + 1) * 115 * direction);
  });
  left.push(`${4.6 + bucket * (90.8 / 12)}%`);
  top.push("88%");
  rotate.push(900);
  return (
    <motion.div
      className={styles.plinkoBall}
      initial={{ left: "50%", top: "2.5%", scale: 0.8 }}
      animate={{ left, top, rotate, scale: [0.8, ...Array(Math.max(0, left.length - 2)).fill(1), 0.92] }}
      transition={{ duration: 2.9, ease: "easeIn", times: left.map((_, index) => index / (left.length - 1)) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/casino/dollar.png" alt="Ficha do Plinko" />
    </motion.div>
  );
}

function BriefcaseBoard({ state, selfId, opponentName, onOpen, onContinue, onCashOut }: {
  state: CasinoState;
  selfId: string;
  opponentName: string;
  onOpen: (index: number) => void;
  onContinue: () => void;
  onCashOut: () => void;
}) {
  const mini = state.miniState;
  if (!mini || mini.kind !== "briefcase") return null;
  const self = mini.players[selfId];
  const opponentId = state.expectedPlayers.find((id) => id !== selfId) ?? "";
  const opponent = mini.players[opponentId];
  const revealing = mini.revealEndsAt != null;
  const isSelfTurn = mini.turnPlayerId === selfId && !self.done;
  const starterName = mini.startPlayerId === selfId ? "Você" : opponentName;
  const canOpen = isSelfTurn && !revealing && !self.awaitingDecision;
  const lastWasLoss = mini.lastValue === "lose";

  return (
    <div className={styles.briefcaseWrap}>
      <div className={styles.briefcaseIntro}>
        <div><small>JOGO COMPARTILHADO</small><strong>💼 Maletas do Ganancioso</strong><p>Uma maleta aberta some para os dois. Quem começou foi sorteado: <b>{starterName}</b>.</p></div>
        <div className={`${styles.turnBadge} ${isSelfTurn ? styles.turnBadgeSelf : ""}`}><span className={styles.liveDot}/>{revealing ? "Revelando..." : isSelfTurn ? "Sua vez" : `${opponentName} joga`}</div>
      </div>

      <div className={styles.briefcaseScores}>
        <div className={styles.briefcaseScoreSelf}><span>Você</span><strong>{self.accumulatedMultiplier.toFixed(2)}×</strong><small>{self.done ? self.cashed ? "sacou" : "eliminado" : self.awaitingDecision ? "decidindo" : isSelfTurn ? "escolhendo" : "aguardando"}</small></div>
        <div><span>{opponentName}</span><strong>{(opponent?.accumulatedMultiplier ?? 0).toFixed(2)}×</strong><small>{opponent?.done ? opponent.cashed ? "sacou" : "eliminado" : mini.turnPlayerId === opponentId ? "escolhendo" : "aguardando"}</small></div>
      </div>

      <div className={styles.briefcaseGrid}>
        {Array.from({ length: 10 }).map((_, index) => {
          const openedBy = mini.openedBy[index];
          const value = mini.contents[index];
          const opened = Boolean(openedBy);
          const openedBySelf = openedBy === selfId;
          const isLast = mini.lastOpenedIndex === index;
          return (
            <motion.button
              key={index}
              type="button"
              disabled={!canOpen || opened}
              onClick={() => onOpen(index)}
              whileHover={canOpen && !opened ? { y: -4, scale: 1.03 } : undefined}
              whileTap={canOpen && !opened ? { scale: 0.96 } : undefined}
              className={`${styles.briefcase} ${opened ? styles.briefcaseOpened : ""} ${openedBySelf ? styles.briefcaseSelf : opened ? styles.briefcaseOther : ""} ${isLast ? styles.briefcaseLast : ""} ${value === "lose" ? styles.briefcaseLose : ""}`}
            >
              {opened ? (
                <>
                  <span className={styles.briefcaseValue}>{value === "lose" ? "PERDEU" : `${Number(value).toFixed(value === 1 || value === 2 || value === 3 || value === 5 ? 0 : 2)}×`}</span>
                  <small>{openedBySelf ? "você abriu" : `${opponentName} abriu`}</small>
                </>
              ) : (
                <><span className={styles.briefcaseHandle}/><b>{String(index + 1).padStart(2, "0")}</b><small>FECHADA</small></>
              )}
            </motion.button>
          );
        })}
      </div>

      {revealing && mini.lastOpenedIndex != null ? (
        <motion.div className={lastWasLoss ? styles.lossBanner : styles.winBanner} initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: [0.88, 1.04, 1], opacity: 1 }}>
          {lastWasLoss ? "💀 PERDEU! A tentativa desse jogador terminou." : `✨ Maleta ${mini.lastOpenedIndex + 1}: +${Number(mini.lastValue).toFixed(2)}× no acumulado.`}
        </motion.div>
      ) : null}

      {!revealing && !self.done && self.awaitingDecision && isSelfTurn ? (
        <div className={styles.briefcaseDecision}>
          <div><span>Seu acumulado</span><strong>{self.accumulatedMultiplier.toFixed(2)}×</strong><small>Você garante agora ou remove outra opção do tabuleiro?</small></div>
          <div className={styles.dualActions}>
            <button type="button" className={styles.cashButton} onClick={onCashOut}>💰 Sacar {self.accumulatedMultiplier.toFixed(2)}×</button>
            <button type="button" className={styles.riskButton} onClick={onContinue}>💼 Continuar jogando</button>
          </div>
        </div>
      ) : null}
      {!revealing && canOpen ? <div className={styles.centerHint}>Escolha uma das maletas que ainda não foi retirada do jogo.</div> : null}
      {self.done ? <OpponentMiniStatus state={state} selfId={selfId} opponentName={opponentName} /> : null}
    </div>
  );
}

function DiceBoard({ state, selfId, opponentName, onRoll, onContinue, onCashOut }: { state: CasinoState; selfId: string; opponentName: string; onRoll: () => void; onContinue: () => void; onCashOut: () => void }) {
  const mini = state.miniState;
  if (!mini || mini.kind !== "dice") return null;
  const p = mini.players[selfId];
  const die1 = p.dice[0];
  const die2 = p.dice[1];
  const rollingFirst = p.rollingDie === 1;
  const rollingSecond = p.rollingDie === 2;
  const canRollFirst = !p.done && !p.awaitingDecision && p.revealedDiceCount === 0 && p.rollingDie == null;
  const canRollSecond = !p.done && !p.awaitingDecision && p.revealedDiceCount === 1 && p.rollingDie == null;
  return (
    <div className={styles.diceWrap}>
      <div className={styles.numberTriples}>
        <div className={styles.greenTriple}><small>GANHA</small><div>{p.green.map((n) => <span key={n}>{n}</span>)}</div></div>
        <div className={styles.redTriple}><small>PERDE</small><div>{p.red.map((n) => <span key={n}>{n}</span>)}</div></div>
      </div>
      <div className={styles.diceStage3d}>
        <DieCube
          value={die1}
          rolling={rollingFirst}
          landingValue={rollingFirst ? p.pendingDie : die1}
          rollStartedAt={rollingFirst ? p.rollStartedAt : null}
          waiting={p.revealedDiceCount === 0 && !rollingFirst}
          label="Primeiro dado"
        />
        <span className={styles.dicePlus}>+</span>
        <DieCube
          value={die2}
          rolling={rollingSecond}
          landingValue={rollingSecond ? p.pendingDie : die2}
          rollStartedAt={rollingSecond ? p.rollStartedAt : null}
          waiting={p.revealedDiceCount < 2 && !rollingSecond}
          label="Segundo dado"
        />
        <div className={styles.diceSum}>{p.sum ?? (p.rollingDie != null ? "…" : "—")}</div>
      </div>
      {rollingFirst ? <div className={styles.spinStatus}>🎲 Primeiro dado rolando...</div> : null}
      {p.revealedDiceCount === 1 && !rollingSecond ? <div className={styles.spinStatus}>Primeiro dado: <b>{die1}</b>. Agora jogue o segundo.</div> : null}
      {rollingSecond ? <div className={styles.spinStatus}>🎲 Segundo dado rolando...</div> : null}
      {p.rollingDie == null && p.outcome === "neutral" ? <div className={styles.neutralBanner}>⚪ Neutro! Você pode tentar novamente ou parar e recuperar seu acumulado.</div> : null}
      {p.rollingDie == null && p.outcome === "win" ? <div className={styles.winBanner}>🟢 Acertou! Sequência em {p.multiplier.toFixed(1)}×.</div> : null}
      {p.rollingDie == null && p.outcome === "loss" ? <div className={styles.lossBanner}>🔴 Caiu em um número perdedor. Fim da tentativa.</div> : null}

      {canRollFirst ? <button type="button" className={styles.primaryCasinoButton} onClick={onRoll}><Dices size={19}/> Jogar primeiro dado</button> : null}
      {canRollSecond ? <button type="button" className={styles.primaryCasinoButton} onClick={onRoll}><Dices size={19}/> Jogar segundo dado</button> : null}
      {!p.done && p.awaitingDecision && p.rollingDie == null ? (
        <div className={styles.dualActions}>
          <button type="button" className={styles.cashButton} onClick={onCashOut}>{p.outcome === "neutral" && p.wins === 0 ? "✋ Parar · recuperar aposta" : `💰 Sacar ${p.multiplier.toFixed(1)}×`}</button>
          <button type="button" className={styles.riskButton} onClick={onContinue}>🎲 Jogar de novo</button>
        </div>
      ) : null}
      {p.done && p.revealEndsAt == null ? <OpponentMiniStatus state={state} selfId={selfId} opponentName={opponentName} /> : null}
      <div className={styles.streakDots}>{[1.5,2.2,3.2,5,8].map((x, i) => <span key={x} className={p.wins > i ? styles.streakActive : ""}>{x}×</span>)}</div>
    </div>
  );
}

const DIE_ORIENTATION: Record<number, { x: number; y: number; z: number }> = {
  1: { x: 0, y: 0, z: 0 },
  2: { x: -90, y: 0, z: 0 },
  3: { x: 0, y: -90, z: 0 },
  4: { x: 0, y: 90, z: 0 },
  5: { x: 90, y: 0, z: 0 },
  6: { x: 0, y: 180, z: 0 },
};

function DieCube({
  value,
  rolling,
  landingValue,
  rollStartedAt,
  waiting,
  label,
}: {
  value: number | null;
  rolling: boolean;
  landingValue: number | null;
  rollStartedAt: number | null;
  waiting: boolean;
  label: string;
}) {
  const finalValue = landingValue ?? value ?? 1;
  const orientation = DIE_ORIENTATION[finalValue] ?? DIE_ORIENTATION[1];

  return (
    <div className={styles.dieScene} aria-label={value ? `${label}: ${value}` : label}>
      {rolling ? (
        <motion.div
          key={`rolling-${rollStartedAt}-${finalValue}`}
          className={`${styles.diceCube} ${styles.diceCubeMotion}`}
          initial={{ rotateX: 0, rotateY: 0, rotateZ: 0, y: 0, scale: 1 }}
          animate={{
            rotateX: [0, 165, 405, 690, 720 + orientation.x],
            rotateY: [0, 235, 525, 805, 720 + orientation.y],
            rotateZ: [0, 105, 285, 555, 720 + orientation.z],
            y: [0, -17, 5, -10, 0],
            scale: [1, 0.93, 1.05, 0.97, 1],
          }}
          transition={{ duration: 0.9, times: [0, 0.23, 0.5, 0.76, 1], ease: [0.18, 0.72, 0.16, 1] }}
        >
          {[1, 2, 3, 4, 5, 6].map((face) => <DieFace key={face} face={face} />)}
        </motion.div>
      ) : (
        <div className={`${styles.diceCube} ${styles[`dieValue${value ?? 1}`]} ${waiting ? styles.diceCubeWaiting : ""}`}>
          {[1, 2, 3, 4, 5, 6].map((face) => <DieFace key={face} face={face} />)}
        </div>
      )}
    </div>
  );
}

function DieFace({ face }: { face: number }) {
  const positions: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <div className={`${styles.dieFace} ${styles[`dieFace${face}`]}`}>
      {Array.from({ length: 9 }).map((_, index) => <i key={index} className={positions[face].includes(index) ? styles.pipOn : ""} />)}
    </div>
  );
}

function HiLoBoard({ state, selfId, opponentName, onGuess, onContinue, onCashOut }: { state: CasinoState; selfId: string; opponentName: string; onGuess: (direction: "higher" | "lower") => void; onContinue: () => void; onCashOut: () => void }) {
  const mini = state.miniState;
  if (!mini || mini.kind !== "hilo") return null;
  const p = mini.players[selfId];
  const higher = hiLoChoiceMultiplier(p.currentCard.rank, "higher");
  const lower = hiLoChoiceMultiplier(p.currentCard.rank, "lower");
  return (
    <div className={styles.hiloWrap}>
      <div className={styles.cardsStage}>
        {p.flipping ? <PlayingCard card={p.currentCard} faded /> : p.previousCard ? <PlayingCard card={p.previousCard} faded /> : <div className={styles.cardBack}>♠</div>}
        <div className={styles.cardArrow}>{p.lastDirection === "higher" ? "↑" : p.lastDirection === "lower" ? "↓" : "→"}</div>
        {p.flipping && p.pendingCard ? (
          <motion.div
            key={`hilo-flip-${p.flipStartedAt}-${p.pendingCard.rank}-${p.pendingCard.suit}`}
            className={styles.hiloFlipCard}
            initial={{ rotateY: 0, y: 0 }}
            animate={{ rotateY: 180, y: [0, -5, 0] }}
            transition={{ duration: 0.92, ease: [0.2, 0.72, 0.18, 1] }}
          >
            <div className={`${styles.hiloFlipFace} ${styles.hiloFlipBackFace}`}>
              <div className={styles.cardBack}>♠</div>
            </div>
            <div className={`${styles.hiloFlipFace} ${styles.hiloFlipRevealFace}`}>
              <PlayingCard card={p.pendingCard} />
            </div>
          </motion.div>
        ) : p.flipping ? (
          <div className={styles.cardBack}>♠</div>
        ) : (
          <PlayingCard card={p.currentCard} />
        )}
      </div>
      <div className={styles.hiloStats}>
        <span>Sequência <b>{p.streak}/7</b></span>
        <span>Acumulado <b>{p.multiplier.toFixed(2)}×</b></span>
        <span>Empate <b>perde</b></span>
      </div>
      {p.flipping ? <div className={styles.spinStatus}>🃏 Virando a carta...</div> : null}
      {!p.flipping && p.lastCorrect === true ? <div className={styles.winBanner}>✨ Acertou! Sacar ou arriscar mais uma carta?</div> : null}
      {!p.flipping && p.lastCorrect === false ? <div className={styles.lossBanner}>❌ Errou ou empatou. A carta fica visível antes da próxima rodada.</div> : null}

      {!p.done && !p.awaitingDecision && !p.flipping ? (
        <div className={styles.hiloButtons}>
          <button type="button" disabled={higher == null} onClick={() => onGuess("higher")}><ArrowUp size={22}/><span>MAIOR</span><small>{higher ? `${higher.toFixed(2)}× nesta etapa` : "impossível"}</small></button>
          <button type="button" disabled={lower == null} onClick={() => onGuess("lower")}><ArrowDown size={22}/><span>MENOR</span><small>{lower ? `${lower.toFixed(2)}× nesta etapa` : "impossível"}</small></button>
        </div>
      ) : null}
      {!p.done && p.awaitingDecision && !p.flipping ? (
        <div className={styles.dualActions}>
          <button type="button" className={styles.cashButton} onClick={onCashOut}>💰 Sacar {p.multiplier.toFixed(2)}×</button>
          <button type="button" className={styles.riskButton} onClick={onContinue}>🃏 Continuar</button>
        </div>
      ) : null}
      {p.done && p.revealEndsAt == null ? <OpponentMiniStatus state={state} selfId={selfId} opponentName={opponentName} /> : null}
    </div>
  );
}

function PlayingCard({ card, faded = false }: { card: { rank: number; suit: "hearts" | "diamonds" | "clubs" | "spades" }; faded?: boolean }) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  return (
    <div className={`${styles.playingCard} ${red ? styles.cardRed : ""} ${faded ? styles.cardFaded : ""}`}>
      <span className={styles.cardCorner}>{cardLabel(card.rank)}<small>{cardSuitSymbol(card.suit)}</small></span>
      <strong>{cardSuitSymbol(card.suit)}</strong>
      <span className={`${styles.cardCorner} ${styles.cardCornerBottom}`}>{cardLabel(card.rank)}<small>{cardSuitSymbol(card.suit)}</small></span>
    </div>
  );
}

function FortuneBoard({ state, opponentName }: { state: CasinoState; opponentName: string }) {
  const mini = state.miniState;
  if (!mini || mini.kind !== "fortune") return null;
  const step = 360 / FORTUNE_SEGMENTS.length;
  const targetIndex = mini.resultIndex ?? mini.revealedIndex ?? 0;
  const centerAngle = targetIndex * step + step / 2;
  // O alvo já existe antes do primeiro frame do giro. Assim não há mais o
  // antigo giro até 10× seguido de uma segunda animação corretiva.
  const targetRotation = 2160 + ((360 - centerAngle) % 360);
  return (
    <div className={styles.fortuneWrap}>
      <div className={styles.fortunePointer}>▼</div>
      <motion.div
        key={`fortune-${mini.spinStartedAt}-${targetIndex}`}
        className={styles.fortuneWheel}
        initial={{ rotate: 0 }}
        animate={{ rotate: targetRotation }}
        transition={{ duration: 4.35, ease: [0.08, 0.72, 0.12, 1] }}
      >
        {FORTUNE_SEGMENTS.map((segment, index) => {
          const angle = step * index + step / 2;
          return <span key={`${segment.label}-${index}`} className={styles.fortuneValue} style={{ "--fortune-angle": `${angle}deg` } as React.CSSProperties}>{segment.label}</span>;
        })}
        <div className={styles.fortuneHub}><Sparkles size={26}/><small>FORTUNA</small></div>
      </motion.div>
      <div className={styles.spinStatus}>✨ A roda está girando e desacelerando até a casa sorteada...</div>
      <div className={styles.fortuneLegend}>
        <span>💀 0×</span><span>✨ 0,5× até 5×</span><span>👑 Jackpot 10×</span>
      </div>
      <p className={styles.centerHint}>Um único giro compartilhado vale para você e {opponentName}.</p>
    </div>
  );
}

function RoundResult({ state, selfId, players, onNext }: { state: CasinoState; selfId: string; players: { id: string; name: string; color: string }[]; onNext: () => void }) {
  const selfReady = state.roundReady[selfId];
  return (
    <div className={styles.resultPanel}>
      <div className={styles.resultIcon}><Sparkles size={28}/></div>
      <small className={styles.smallCaps}>Resultado da rodada {state.round}</small>
      <h2>{state.chosenGame ? CASINO_GAMES[state.chosenGame].label : "Rodada encerrada"}</h2>
      <p>{state.message}</p>
      <RoundOutcomeVisual state={state} />

      <div className={styles.resultPlayers}>
        {players.map((player) => {
          const p = state.players[player.id];
          const positive = p.roundDelta > 0;
          return (
            <div key={player.id} className={player.id === selfId ? styles.resultSelf : ""}>
              <div className={styles.playerNameLine}><span className={styles.playerDot} style={{ background: player.color }}/><strong>{player.id === selfId ? "Você" : player.name}</strong></div>
              <span>Aposta {formatCasinoChips(p.roundBet ?? 0)}</span>
              <b className={positive ? styles.positive : p.roundDelta < 0 ? styles.negative : ""}>{p.roundDelta >= 0 ? "+" : ""}{formatSignedChips(p.roundDelta)}</b>
              <em>Saldo {formatCasinoChips(p.balance)}</em>
            </div>
          );
        })}
      </div>

      <button type="button" className={styles.primaryCasinoButton} onClick={onNext} disabled={selfReady}>
        {selfReady ? <><Check size={18}/> Pronto · aguardando seu par</> : <>Próxima rodada <ArrowUp size={18}/></>}
      </button>
      <div className={styles.readyLine}>
        {players.map((p) => <span key={p.id} className={state.roundReady[p.id] ? styles.readyOn : ""}>{state.roundReady[p.id] ? "●" : "○"} {p.id === selfId ? "Você" : p.name}</span>)}
      </div>
    </div>
  );
}

function RoundOutcomeVisual({ state }: { state: CasinoState }) {
  const mini = state.miniState;
  if (!mini) return null;
  if (mini.kind === "roulette" && mini.resultNumber != null) {
    return <div className={`${styles.outcomeOrb} ${mini.resultColor === "red" ? styles.outcomeRed : mini.resultColor === "black" ? styles.outcomeBlack : styles.outcomeGreen}`}><strong>{mini.resultNumber}</strong><span>{mini.resultColor}</span></div>;
  }
  if (mini.kind === "crash") return <div className={styles.bigOutcome}>💥 <strong>{mini.multiplier.toFixed(2)}×</strong></div>;
  if (mini.kind === "race" && mini.winner) {
    const racer = CASINO_RACERS.find((r) => r.id === mini.winner);
    return <div className={styles.bigOutcome}>🏁 <strong>{racer?.label}</strong></div>;
  }
  if (mini.kind === "fortune" && mini.revealedIndex != null) {
    return <div className={styles.bigOutcome}>✨ <strong>{FORTUNE_SEGMENTS[mini.revealedIndex]?.label}</strong></div>;
  }
  return null;
}

function LastChance({ state, selfId, opponentName, onChoose, onSpin }: { state: CasinoState; selfId: string; opponentName: string; onChoose: (side: LastChanceCoinSide) => void; onSpin: () => void }) {
  const mini = state.miniState;
  if (!mini || mini.kind !== "lastChance") return null;
  const eligible = mini.eligibleIds.includes(selfId);
  const ownChoice = mini.choices[selfId];
  const ownCoin = mini.coinResults[selfId];
  const ownResult = mini.results[selfId];
  const spinning = Boolean(mini.spinning[selfId]);
  const coinAsset = ownCoin === "crown" ? "/images/casino/coin.png" : "/images/casino/dollar.png";
  return (
    <div className={`${styles.lastChance} ${spinning ? styles.lastChanceActive : ""}`}>
      <motion.div animate={spinning ? { y: [0, -5, 0], rotate: [0, -4, 4, 0] } : {}} transition={{ repeat: spinning ? Infinity : 0, duration: 0.65 }} className={styles.skull}>☠️</motion.div>
      <small className={styles.smallCaps}>Falência</small>
      <h2>Última Chance</h2>
      <p>Escolha <b>Cara</b> ou <b>Coroa</b> e lance uma única moeda. Se acertar o lado, você volta com <b>500 fichas</b>.</p>

      {eligible && ownResult == null ? (
        <div className={styles.coinChoiceGrid}>
          <button type="button" disabled={spinning} onClick={() => onChoose("dollar")} className={ownChoice === "dollar" ? styles.coinChoiceSelected : ""}>
            {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/images/casino/dollar.png" alt="Cara"/><span>Cara</span><small>Cifrão</small>
          </button>
          <button type="button" disabled={spinning} onClick={() => onChoose("crown")} className={ownChoice === "crown" ? styles.coinChoiceSelected : ""}>
            {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/images/casino/coin.png" alt="Coroa"/><span>Coroa</span><small>Coroa real</small>
          </button>
        </div>
      ) : null}

      <div className={styles.coinStage}>
        {spinning ? (
          <motion.div className={`${styles.coinFlipper} ${styles.coinTwoSided}`} animate={{ rotateY: [0, 180, 360, 540, 720, 900, 1080], y: [0, -24, -6, -30, -4, -18, 0], scale: [1, .92, 1.04, .94, 1.03, .97, 1] }} transition={{ duration: 2, ease: [0.22, 0.7, 0.2, 1] }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}<img className={styles.coinFaceFront} src="/images/casino/dollar.png" alt="Cara"/>
            {/* eslint-disable-next-line @next/next/no-img-element */}<img className={styles.coinFaceBack} src="/images/casino/coin.png" alt="Coroa"/>
          </motion.div>
        ) : ownCoin ? (
          <motion.div key={ownCoin} className={styles.coinFlipper} initial={{ rotateY: 90, scale: .84 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: "spring", stiffness: 180, damping: 15 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}<img src={coinAsset} alt={ownCoin === "crown" ? "Coroa" : "Cara"}/>
          </motion.div>
        ) : (
          <div className={`${styles.coinFlipper} ${styles.coinWaiting}`}><span>?</span></div>
        )}
      </div>

      {spinning ? <div className={styles.lastChanceStatus}>🪙 A moeda está girando...</div> : null}
      {!spinning && ownCoin ? <div className={styles.lastChanceStatus}>Caiu <b>{ownCoin === "crown" ? "COROA" : "CARA"}</b> · você escolheu {ownChoice === "crown" ? "Coroa" : "Cara"}.</div> : null}
      {ownResult === "revived" ? <div className={styles.winBanner}>✨ Acertou! Você voltou ao jogo com 500 fichas.</div> : null}
      {ownResult === "failed" ? <div className={styles.lossBanner}>☠️ Lado errado. Falência definitiva.</div> : null}
      {eligible ? (
        <button type="button" className={styles.dangerButton} onClick={onSpin} disabled={!ownChoice || ownResult != null || spinning}>{spinning ? "Moeda no ar..." : ownChoice ? "🪙 Lançar moeda" : "Escolha Cara ou Coroa"}</button>
      ) : (
        <div className={styles.opponentStatus}><span className={styles.liveDot}/> Aguardando {opponentName} encarar a última chance...</div>
      )}
    </div>
  );
}

function FinishedPanel({ state, selfId, players, isHost, onAgain, onGames }: { state: CasinoState; selfId: string; players: { id: string; name: string }[]; isHost: boolean; onAgain: () => void; onGames: () => void }) {
  const winner = state.winnerId ? players.find((p) => p.id === state.winnerId) : null;
  const selfWon = state.winnerId === selfId;
  return (
    <div className={styles.finishedPanel}>
      {selfWon ? <Confetti /> : null}
      <motion.div initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 13 }} className={styles.trophyCircle}>
        {winner ? <Trophy size={42}/> : <span>🤝</span>}
      </motion.div>
      <small className={styles.smallCaps}>Cassino encerrado</small>
      <h2>{winner ? (selfWon ? "Você dominou o cassino! 👑" : `${winner.name} venceu!`) : "Empate no cassino!"}</h2>
      <p>{state.message}</p>

      <div className={styles.finalBalances}>
        {players.map((player) => (
          <div key={player.id} className={state.winnerId === player.id ? styles.finalWinner : ""}>
            <span>{player.id === selfId ? "Você" : player.name}</span>
            <strong><Coins size={18}/> {formatCasinoChips(state.players[player.id]?.balance ?? 0)}</strong>
            <small>Melhor saque {state.players[player.id]?.bestMultiplier.toFixed(2) ?? "0.00"}×</small>
          </div>
        ))}
      </div>
      <div className={styles.finalStats}><span>{state.round} rodada(s)</span><span>Meta {formatCasinoChips(state.targetBalance)}</span><span>{state.length === "quick" ? "Partida rápida" : state.length === "long" ? "Partida longa" : "Partida normal"}</span></div>

      {isHost ? (
        <div className={styles.dualActions}>
          <button type="button" className={styles.primaryCasinoButton} onClick={onAgain}><RotateCw size={18}/> Jogar novamente</button>
          <button type="button" className={styles.secondaryButton} onClick={onGames}>Escolher outro jogo</button>
        </div>
      ) : <p className={styles.centerHint}>Aguardando o anfitrião escolher o próximo passo.</p>}
    </div>
  );
}

function HistoryStrip({ state }: { state: CasinoState }) {
  return (
    <section className={styles.historyStrip}>
      <div className={styles.historyTitle}><span>Últimas rodadas</span><small>histórico da sessão</small></div>
      <div className={styles.historyScroller}>
        {[...state.history].reverse().slice(0, 5).map((round) => (
          <div key={`${round.round}-${round.game}`} className={styles.historyCard}>
            <span>{CASINO_GAMES[round.game].emoji}</span>
            <div><strong>R{round.round} · {CASINO_GAMES[round.game].label}</strong><small>{round.summary}</small></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatSignedChips(value: number): string {
  const abs = Math.abs(Math.round(value)).toLocaleString("pt-BR");
  return value < 0 ? `-${abs}` : abs;
}
