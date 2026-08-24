"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useGameRoom } from "@/hooks/useGameRoom";
import { useRPGGame } from "@/hooks/useRPGGame";
import RPGClassIntro from "@/components/rpg/RPGClassIntro";
import RPGCombatantPanel from "@/components/rpg/RPGCombatantPanel";
import RPGHand from "@/components/rpg/RPGHand";
import RPGResultModal from "@/components/rpg/RPGResultModal";
import LoadingScreen from "@/components/LoadingScreen";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { RPG_MODES, RPGRoundEvent } from "@/lib/rpgTypes";

export default function RPGGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();

  const { room, selfId, notFound } = useGameRoom(code);
  const { state, selectCard, rerollHand, newGame } = useRPGGame(code);

  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    if (state?.phase !== "finished") {
      // O estado da batalha é sincronizado pelo servidor. Quando qualquer
      // jogador clica em "Jogar novamente", os dois recebem a nova fase.
      // Portanto o modal também precisa fechar nos dois clientes.
      setShowResultModal(false);
      return;
    }

    const timer = window.setTimeout(() => {
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

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <Logo size={44} />
        <p className="text-ink-soft">Não encontramos essa batalha. A sala pode ter expirado ou o link está incorreto.</p>
        <Button onClick={() => router.push("/")}>Voltar para o início</Button>
      </main>
    );
  }

  if (!room || !state) {
    return <LoadingScreen label="Preparando a arena..." />;
  }

  const selfCombatant = selfId ? state.combatants[selfId] : undefined;
  const selfTeam = selfCombatant?.team ?? "a";
  const allyIds = selfTeam === "a" ? state.teamA : state.teamB;
  const enemyIds = selfTeam === "a" ? state.teamB : state.teamA;

  const eventsFor = (id: string): RPGRoundEvent[] => {
    if (state.phase !== "resolved" && state.phase !== "finished") {
      return [];
    }

    return state.lastRoundEvents.filter(
      (e) => (e.targetId ?? e.actorId) === id
    );
  };
  const eventsKey = state.round * 1000 + (state.resolvedAt ? 1 : 0);

  const introCombatants = state.order.map((id) => ({
    id,
    classId: state.combatants[id].classId,
    label: namesById[id] ?? "Jogador",
    isSelf: id === selfId,
  }));

  const isChoosingPhase = state.phase === "choosing";
  const handDisabled = !selfCombatant?.alive || selfCombatant?.skippingThisRound || !isChoosingPhase;
  const alreadyChosen = Boolean(selfCombatant?.chosenCardId);

  return (
    <main className="relative flex min-h-screen flex-col items-center gap-4 bg-cozy-gradient px-4 py-6 sm:py-8">
      {state.phase === "intro" && <RPGClassIntro combatants={introCombatants} />}

      <div className="glass-panel flex w-full max-w-[min(94vw,560px)] items-center justify-between rounded-xl3 p-3.5">
        <button
          onClick={() => router.push("/")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-white/60 hover:text-ink"
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

      <div className="flex w-full max-w-[min(94vw,560px)] flex-col gap-2">
        {enemyIds.map((id) => (
          <RPGCombatantPanel
            key={id}
            combatant={state.combatants[id]}
            name={state.combatants[id].displayName ?? namesById[id] ?? "Jogador"}
            color={colorsById[id]}
            events={eventsFor(id)}
            eventsKey={eventsKey}
            showChosenBadge={isChoosingPhase && state.combatants[id].hasChosen}
          />
        ))}
      </div>

      <span className="text-2xl">⚔️</span>

      <div className="flex w-full max-w-[min(94vw,560px)] flex-col gap-2">
        {allyIds.map((id) => (
          <RPGCombatantPanel
            key={id}
            combatant={state.combatants[id]}
            name={state.combatants[id].displayName ?? namesById[id] ?? "Jogador"}
            color={colorsById[id]}
            isSelf={id === selfId}
            events={eventsFor(id)}
            eventsKey={eventsKey}
            showChosenBadge={isChoosingPhase && id !== selfId && state.combatants[id].hasChosen}
          />
        ))}
      </div>

      {isChoosingPhase && selfCombatant?.alive && selfCombatant.skippingThisRound && (
        <p className="text-center text-sm font-medium text-ink-soft">Você está atordoado e perdeu esta rodada!</p>
      )}

      {isChoosingPhase && selfCombatant?.alive && !selfCombatant.skippingThisRound && (
        <RPGHand
          hand={selfCombatant.hand}
          chosenInstanceId={selfCombatant.chosenCardId}
          disabled={handDisabled}
          dealKey={state.round}
          onSelect={(instanceId) => selectCard(instanceId)}
          rerollCharges={selfCombatant.rerollCharges}
          onReroll={() => rerollHand()}
        />
      )}

      {isChoosingPhase && alreadyChosen && (
        <p className="text-center text-xs text-ink-soft">Carta escolhida — aguardando os outros combatentes...</p>
      )}

      <RPGResultModal
        open={showResultModal}
        onClose={() => setShowResultModal(false)}
        onReopen={() => setShowResultModal(true)}
        onPlayAgain={() => {
          setShowResultModal(false);
          newGame();
        }}
        onBackToGames={() => router.push("/")}
        state={state}
        namesById={namesById}
        selfId={selfId}
      />
    </main>
  );
}
