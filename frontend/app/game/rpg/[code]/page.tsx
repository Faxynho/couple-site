"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Swords } from "lucide-react";
import { useRoomSession } from "@/hooks/useRoomSession";
import { useRPGGame } from "@/hooks/useRPGGame";
import RPGClassIntro from "@/components/rpg/RPGClassIntro";
import RPGCombatantPanel from "@/components/rpg/RPGCombatantPanel";
import RPGHand from "@/components/rpg/RPGHand";
import RPGCard from "@/components/rpg/RPGCard";
import RPGResultModal from "@/components/rpg/RPGResultModal";
import RPGTutorialModal from "@/components/rpg/RPGTutorialModal";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { RPGCard as RPGCardData, RPGCombatant, RPG_MODES, RPGRoundEvent } from "@/lib/rpgTypes";
import PlayerChip from "@/components/PlayerChip";
import { playSoundEffect } from "@/lib/sound";

function getChosenCardForCombatant(
  combatant?: RPGCombatant
): RPGCardData | null {
  if (!combatant?.chosenCardId) return null;

  return (
    combatant.hand.find(
      (item) => item.instanceId === combatant.chosenCardId
    ) ?? null
  );
}

const RPG_REVEAL_ANIMATION_VERSION = "dom-clone-v3";

export default function RPGGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();

  const { room, selfId, notFound, kicked, backToConfig, backToGameSelect, kickPlayer } = useRoomSession(code);
  const { state, selectCard, rerollHand, newGame } = useRPGGame(code);

  const [showResultModal, setShowResultModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const previousResolutionRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state || !selfId || (state.phase !== "resolved" && state.phase !== "finished")) return;
    const resolutionKey = state.resolvedAt ?? state.finishedAt;
    if (resolutionKey === null || resolutionKey === undefined || previousResolutionRef.current === resolutionKey) return;
    previousResolutionRef.current = resolutionKey;

    playSoundEffect("rpgResolve");
    const ownEvents = state.lastRoundEvents.filter((event) => event.targetId === selfId);
    if (ownEvents.some((event) => event.type === "evade")) playSoundEffect("rpgEvade");
    if (ownEvents.some((event) => event.type === "heal")) playSoundEffect("rpgHeal");
    if (ownEvents.some((event) => event.type === "attack" || event.type === "statusTick")) playSoundEffect("rpgDamage");
  }, [selfId, state?.phase, state?.resolvedAt, state?.finishedAt, state?.lastRoundEvents]);

  useEffect(() => {
    if (state?.phase !== "finished") {
      // O estado da batalha é sincronizado pelo servidor. Quando qualquer
      // jogador clica em "Jogar novamente", os dois recebem a nova fase.
      // Portanto o modal também precisa fechar nos dois clientes.
      setShowResultModal(false);
      return;
    }

    const timer = window.setTimeout(() => {
      if (selfId && state.winnerTeam !== "draw" && state.winnerTeam === state.combatants[selfId]?.team) playSoundEffect("victory");
      setShowResultModal(true);
    }, 1600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state?.phase, state?.finishedAt]);

  const namesById = useMemo(() => {
    const map: Record<string, string> = { BOT: "BOT" };
    for (const p of room?.players ?? []) map[p.id] = p.name;
    return map;
  }, [room?.players]);

  const colorsById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of room?.players ?? []) map[p.id] = p.color;
    return map;
  }, [room?.players]);

  const playersById = useMemo(
    () => Object.fromEntries((room?.players ?? []).map((player) => [player.id, player])),
    [room?.players]
  );

  useEffect(() => {
    if (!room) return;
    if (room.gameId !== "rpg" || (room.status !== "playing" && room.status !== "finished")) {
      if (room.roomMode === "duo") {
        router.push(`/sala/${room.code}`);
      } else {
        router.push("/solo");
      }
    }
  }, [room, router]);

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <Logo size={44} />
        <p className="text-ink-soft">Não encontramos essa batalha. A sala pode ter expirado ou o link está incorreto.</p>
        <Button onClick={() => router.push("/")}>Voltar para o início</Button>
      </main>
    );
  }

  if (kicked) return null;

  // Se o host trocar de jogo (ou voltar pra escolha de jogo) enquanto o
  // convidado ainda está nesta tela, o socket vai começar a mandar
  // `game:state` de outro jogo (formato diferente) pra cá — sem essa trava,
  // ler `state.combatants[selfId]` explode com o formato errado. Por isso
  // essas contas (que dependem de `state`) só são feitas DEPOIS desta guarda.
  if (!room || !state || room.gameId !== "rpg") {
    return <LoadingScreen label="Preparando a arena..." />;
  }

  const selfCombatant = selfId ? state.combatants[selfId] : undefined;

  const selfTeam = selfCombatant?.team ?? "a";
  const allyIds = selfTeam === "a" ? state.teamA : state.teamB;
  const enemyIds = selfTeam === "a" ? state.teamB : state.teamA;

  const revealEntries = [
    ...(selfId && selfCombatant
      ? [{
          id: selfId,
          ownerLabel: "VOCÊ",
          card: getChosenCardForCombatant(selfCombatant),
        }]
      : []),
    ...(enemyIds[0]
      ? [{
          id: enemyIds[0],
          ownerLabel: "OPONENTE",
          card: getChosenCardForCombatant(state.combatants[enemyIds[0]]),
        }]
      : []),
  ].filter(
    (
      item
    ): item is {
      id: string;
      ownerLabel: string;
      card: RPGCardData;
    } => Boolean(item.card)
  );

  const revealVisible = Boolean(
    revealEntries.length > 0 &&
    (state.phase === "resolved" || state.phase === "finished")
  );

  const eventsFor = (id: string): RPGRoundEvent[] => {
    if (state.phase !== "resolved" && state.phase !== "finished") {
      return [];
    }

    return state.lastRoundEvents.filter(
      (e) => (e.targetId ?? e.actorId) === id
    );
  };

  const gameInstanceKey = `${state.startedAt}-${state.finishedAt ?? "active"}`;

  const eventsKey = state.round * 1000 + (state.resolvedAt ? 1 : 0);

  const introCombatants = state.order.map((id) => ({
    id,
    classId: state.combatants[id].classId,
    label: namesById[id] ?? "Jogador",
    isSelf: id === selfId,
  }));

  const isChoosingPhase = state.phase === "choosing";
  const handDisabled =
    !selfCombatant?.alive ||
    selfCombatant?.skippingThisRound ||
    !isChoosingPhase;
  const alreadyChosen = Boolean(selfCombatant?.chosenCardId);

  const isHost = Boolean(selfId && room.hostId === selfId);
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

  return (
    <main className="relative flex min-h-screen flex-col items-center gap-4 bg-cozy-gradient px-4 py-6 sm:py-8">
      {state.phase === "intro" && <RPGClassIntro combatants={introCombatants} />}

      <div className="glass-panel flex w-full max-w-[min(94vw,560px)] flex-col gap-2 rounded-xl3 p-3.5">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToConfig}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface/60 hover:text-ink"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="font-display text-sm font-semibold text-ink">
            Rodada {Math.min(state.round, state.maxRounds)}/{state.maxRounds}
          </span>
          <span className="text-xs text-ink-soft">
            {RPG_MODES[state.mode].emoji} {RPG_MODES[state.mode].label}
          </span>
        </div>
        {room.roomMode === "duo" && (
          <div className="flex items-center justify-center gap-2">
            {room.players.map((p) => (
              <PlayerChip key={p.id} player={p} isHost={isHost} selfId={selfId} onKick={kickPlayer} />
            ))}
          </div>
        )}
      </div>

      <section className="relative isolate w-full max-w-[min(94vw,560px)] overflow-visible px-2 py-3 sm:px-4 sm:py-4">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl border border-indigo-200/45 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.50),transparent_55%),linear-gradient(135deg,rgba(44,61,125,0.20),rgba(35,28,70,0.08)_45%,rgba(96,48,91,0.16))] shadow-[0_16px_38px_rgba(44,35,85,0.18)] dark:border-indigo-300/20">
            <div className="absolute -left-16 top-4 h-44 w-44 rounded-full bg-sky-400/25 blur-3xl" />
            <div className="absolute -right-16 top-5 h-44 w-44 rounded-full bg-rose-400/25 blur-3xl" />
            <div className="absolute inset-x-[18%] bottom-0 h-20 rounded-[100%] bg-indigo-950/15 blur-2xl" />
            <div className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="absolute inset-x-7 top-2 h-px bg-gradient-to-r from-transparent via-white/75 to-transparent" />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] items-center gap-1 sm:grid-cols-[minmax(0,1fr)_46px_minmax(0,1fr)] sm:gap-2">
            <div className="flex min-w-0 flex-col items-center gap-2">{state.teamA.map((id) => <RPGCombatantPanel key={`${id}-${gameInstanceKey}`} combatant={state.combatants[id]} name={state.combatants[id].displayName ?? namesById[id] ?? "Jogador"} player={playersById[id]} color={colorsById[id]} appearance={state.characterAppearances?.[id] ?? null} facing="right" events={eventsFor(id)} eventsKey={eventsKey} currentRound={state.round} showChosenBadge={isChoosingPhase && id !== selfId && state.combatants[id].hasChosen} />)}</div>
            <div className="justify-self-center rounded-full border border-white/60 bg-surface/55 p-1.5 text-indigo-700 shadow-[0_0_20px_rgba(129,140,248,0.38)] backdrop-blur-sm dark:border-indigo-200/30 dark:text-indigo-200"><Swords aria-hidden="true" size={22} strokeWidth={1.8} /></div>
            <div className="flex min-w-0 flex-col items-center gap-2">{state.teamB.map((id) => <RPGCombatantPanel key={`${id}-${gameInstanceKey}`} combatant={state.combatants[id]} name={state.combatants[id].displayName ?? namesById[id] ?? "Jogador"} player={playersById[id]} color={colorsById[id]} appearance={state.characterAppearances?.[id] ?? null} facing="left" events={eventsFor(id)} eventsKey={eventsKey} currentRound={state.round} showChosenBadge={isChoosingPhase && id !== selfId && state.combatants[id].hasChosen} />)}</div>
          </div>
      </section>

      <AnimatePresence mode="wait">
        {revealVisible && (
          <motion.section
            key={`revealed-cards-${state.round}-${state.resolvedAt ?? state.finishedAt ?? "active"}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex w-full max-w-[min(94vw,560px)] flex-col items-center gap-2"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-soft/75">
              Cartas escolhidas
            </div>

            <div className="grid w-full grid-cols-2 gap-4">
              {revealEntries.map(({ id, ownerLabel, card }, index) => (
                <div
                  key={`${state.round}-${id}-${card.instanceId}`}
                  className="flex min-h-[255px] flex-col items-center justify-start gap-1.5"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.72, rotate: index === 0 ? -3 : 3 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                    transition={{
                      duration: 0.34,
                      delay: index * 0.05,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ink">
                      {ownerLabel}
                    </div>

                    <motion.div
                      initial={{ scale: 0.78 }}
                      animate={{ scale: 1 }}
                      transition={{
                        duration: 0.28,
                        delay: index * 0.05 + 0.03,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="w-[174px] sm:w-[190px]"
                    >
                      <RPGCard card={card} delay={0} disabled />
                    </motion.div>
                  </motion.div>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {isChoosingPhase && selfCombatant?.alive && selfCombatant.skippingThisRound && (
        <p className="text-center text-sm font-medium text-ink-soft">Você está atordoado e perdeu esta rodada!</p>
      )}

      {isChoosingPhase && selfCombatant?.alive && !selfCombatant.skippingThisRound && (
        <RPGHand
          hand={selfCombatant.hand}
          chosenInstanceId={selfCombatant.chosenCardId}
          disabled={handDisabled}
          dealKey={state.round}
          onSelect={(instanceId) => { playSoundEffect("rpgSelect"); selectCard(instanceId); }}
          rerollCharges={selfCombatant.rerollCharges}
          onReroll={() => rerollHand()}
        />
      )}

      {isChoosingPhase && (
        <motion.button
          type="button"
          onClick={() => setShowTutorial(true)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="
            flex items-center gap-2 rounded-full
            border border-surface/80 bg-surface/60 px-4 py-2
            text-xs font-bold text-ink-soft shadow-sm
            backdrop-blur-sm transition hover:bg-surface/85 hover:text-ink
          "
        >
          <span className="text-base">❔</span>
          Como jogar
        </motion.button>
      )}

      {isChoosingPhase && alreadyChosen && (
        <p className="text-center text-xs text-ink-soft">Carta escolhida — aguardando os outros combatentes...</p>
      )}

      <RPGTutorialModal
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      <RPGResultModal
        open={showResultModal}
        onClose={() => setShowResultModal(false)}
        onReopen={() => setShowResultModal(true)}
        onPlayAgain={() => {
          setShowResultModal(false);
          newGame();
        }}
        onBackToGames={handleBackToGameSelect}
        state={state}
        namesById={namesById}
        selfId={selfId}
      />
    </main>
  );
}
