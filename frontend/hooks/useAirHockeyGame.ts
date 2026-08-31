"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AirHockeyState } from "@/lib/airHockeyTypes";
import { getPlayerId } from "@/lib/playerId";
import { getSocket } from "@/lib/socket";
import { AirHockeyGame } from "../../backend/src/games/airhockey/AirHockeyGame";

type PendingInput = { x: number; y: number; sequence: number };
type PredictedImpact = { serial: number; startedAt: number };

const MAX_CLIENT_FRAME_MS = 33;
const CLIENT_SIMULATION_STEP_MS = 1000 / 60;

function cloneState(state: AirHockeyState) {
  return structuredClone(state) as AirHockeyState;
}

function puckDetails(state: AirHockeyState | null) {
  if (!state) return null;
  const { x, y, vx, vy } = state.puck;
  return { x, y, vx, vy };
}

function puckError(from: AirHockeyState | null, to: AirHockeyState) {
  if (!from) return null;
  return {
    positionError: Math.hypot(from.puck.x - to.puck.x, from.puck.y - to.puck.y),
    velocityError: Math.hypot(from.puck.vx - to.puck.vx, from.puck.vy - to.puck.vy),
  };
}

function logDebug(enabled: boolean, event: string, details: Record<string, unknown>) {
  if (enabled) console.info(`[Air Hockey debug] ${event}`, details);
}

/**
 * Avança exclusivamente a cópia privada do cliente. O relógio usado é o
 * lastTickAt do próprio estado, portanto um relógio local adiantado/atrasado
 * não altera o tamanho dos passos nem a física que a engine executa.
 */
function advancePrediction(engine: AirHockeyGame, state: AirHockeyState, elapsedMs: number) {
  let next = state;
  let remaining = Math.max(0, elapsedMs);
  while (remaining > 0.001 && next.phase !== "finished") {
    const step = Math.min(CLIENT_SIMULATION_STEP_MS, remaining);
    const lastTickAt = next.lastTickAt ?? Date.now();
    next = engine.applyAction(next as never, { type: "tick", now: lastTickAt + step }, "system") as AirHockeyState;
    remaining -= step;
  }
  return next;
}

export function useAirHockeyGame(roomCode: string) {
  const stateRef = useRef<AirHockeyState | null>(null);
  const [meta, setMeta] = useState<AirHockeyState | null>(null);
  const engineRef = useRef(new AirHockeyGame());
  const soloFinished = useRef(false);
  const lastDuoTick = useRef(0);
  const authoritativeRef = useRef<AirHockeyState | null>(null);
  const predictedLocalRef = useRef<AirHockeyState | null>(null);
  const predictedPuckRef = useRef<AirHockeyState["puck"] | null>(null);
  const pendingInputs = useRef<PendingInput[]>([]);
  const nextInputSequence = useRef(0);
  const predictedLocalImpact = useRef<PredictedImpact | null>(null);
  const serverClockOffsetMs = useRef<number | null>(null);
  const bestClockRttMs = useRef(Number.POSITIVE_INFINITY);
  const debugEnabled = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    lastDuoTick.current = 0;
    pendingInputs.current = [];
    nextInputSequence.current = 0;
    predictedLocalImpact.current = null;
    serverClockOffsetMs.current = null;
    bestClockRttMs.current = Number.POSITIVE_INFINITY;
    debugEnabled.current = new URLSearchParams(window.location.search).get("airHockeyDebug") === "1";
    let previous = performance.now();

    const updateMeta = (next: AirHockeyState) => {
      setMeta((previous) => {
        if (
          previous &&
          previous.phase === next.phase &&
          previous.goalSerial === next.goalSerial &&
          previous.scores[next.playerIds[0]] === next.scores[next.playerIds[0]] &&
          previous.scores[next.playerIds[1]] === next.scores[next.playerIds[1]]
        ) return previous;
        return next;
      });
    };

    const accept = (next: AirHockeyState | null) => {
      if (!next) {
        stateRef.current = null;
        return;
      }

      if (next.mode === "duel") {
        const receivedAt = Date.now();
        const snapshotTick = next.lastTickAt ?? 0;
        // A ordem de entrega não é garantida após reconexão; um snapshot que
        // não avançou o tick não pode desfazer previsão já confirmada.
        if (snapshotTick <= lastDuoTick.current) return;
        lastDuoTick.current = snapshotTick;
        authoritativeRef.current = next;

        const selfId = getPlayerId();
        const confirmed = next.lastProcessedInputSequence?.[selfId] ?? 0;
        pendingInputs.current = pendingInputs.current.filter((input) => input.sequence > confirmed);
        nextInputSequence.current = Math.max(nextInputSequence.current, confirmed);
        const previousPrediction = predictedLocalRef.current ?? stateRef.current;
        const offset = serverClockOffsetMs.current;
        // `lastTickAt` e `receivedAt + offset` estão ambos no relógio do
        // servidor. Sem uma amostra de relógio, não há base comparável para
        // avançar o snapshot e a previsão começa exatamente nele.
        const snapshotAgeMs = offset === null || snapshotTick === 0
          ? 0
          : Math.max(0, receivedAt + offset - snapshotTick);
        logDebug(debugEnabled.current, "SNAPSHOT", {
          serverTick: snapshotTick,
          receivedAt,
          snapshotAgeMs,
          lastProcessedInputSequence: next.lastProcessedInputSequence,
          authoritativePuck: puckDetails(next),
          predictedPuck: puckDetails(previousPrediction),
        });

        const pendingImpact = predictedLocalImpact.current;
        const confirmsPredictedImpact = !pendingImpact || next.impactSerial >= pendingImpact.serial;
        if (confirmsPredictedImpact) predictedLocalImpact.current = null;

        // Enquanto a colisão local ainda não chegou do servidor, o snapshot
        // atualiza metadados/raquete remota, mas não pode apagar o puck que já
        // reagiu no cliente. Isso é separado dos inputs apenas "ackados".
        if (!confirmsPredictedImpact && predictedLocalRef.current && next.phase === "playing") {
          const preserved = cloneState(predictedLocalRef.current);
          const remoteId = next.playerIds[0] === selfId ? next.playerIds[1] : next.playerIds[0];
          preserved.paddles[remoteId] = cloneState(next).paddles[remoteId];
          preserved.lastProcessedInputSequence = next.lastProcessedInputSequence;
          authoritativeRef.current = next;
          predictedLocalRef.current = preserved;
          predictedPuckRef.current = { ...preserved.puck };
          stateRef.current = preserved;
          logDebug(debugEnabled.current, "RECONCILIATION", {
            ...puckError(previousPrediction, next),
            snapshotAgeMs,
            resimulatedMs: 0,
            pendingInputs: pendingInputs.current.map((input) => input.sequence),
            reason: "pending-local-impact-preserved",
          });
          updateMeta(next);
          return;
        }

        // Reconciliação: servidor primeiro; depois apenas intenções ainda não
        // processadas. Nenhum impulso é copiado do cliente para o servidor.
        let predicted = cloneState(next);
        for (const input of pendingInputs.current) {
          predicted = engineRef.current.applyAction(predicted as never, { type: "move", ...input }, selfId) as AirHockeyState;
        }
        predicted = advancePrediction(engineRef.current, predicted, snapshotAgeMs);
        predictedLocalRef.current = predicted;
        predictedPuckRef.current = { ...predicted.puck };
        stateRef.current = predicted;
        // A previsão acima já alcançou o presente estimado. O próximo RAF só
        // pode integrar o tempo transcorrido depois desta reconciliação.
        previous = performance.now();
        logDebug(debugEnabled.current, "RECONCILIATION", {
          ...puckError(previousPrediction, next),
          postReconcileError: puckError(predicted, next),
          snapshotAgeMs,
          resimulatedMs: snapshotAgeMs,
          pendingInputs: pendingInputs.current.map((input) => input.sequence),
          reason: offset === null ? "snapshot-rebase-without-clock-sample" : "snapshot-rebase-to-estimated-present",
        });
        updateMeta(next);
        return;
      }

      if (stateRef.current?.mode === "solo" && next.startedAt === stateRef.current.startedAt) return;
      soloFinished.current = false;
      stateRef.current = next;
      updateMeta(next);
    };

    const syncClock = () => {
      const sentAt = Date.now();
      socket.emit("airhockey:clock", (response: { serverNow?: number }) => {
        const receivedAt = Date.now();
        if (!Number.isFinite(response?.serverNow)) return;
        const rttMs = receivedAt - sentAt;
        if (rttMs <= bestClockRttMs.current) {
          bestClockRttMs.current = rttMs;
          serverClockOffsetMs.current = (response.serverNow as number) - (sentAt + receivedAt) / 2;
          logDebug(debugEnabled.current, "CLOCK", {
            rttMs,
            serverNow: response.serverNow,
            offsetMs: serverClockOffsetMs.current,
          });
        }
      });
    };
    const sync = () => {
      syncClock();
      socket.emit("room:sync", { code: roomCode, playerId: getPlayerId() }, (response: { ok: boolean; gameState?: AirHockeyState }) => {
      if (response.ok && response.gameState) accept(response.gameState);
      });
    };
    sync();
    const clockInterval = window.setInterval(syncClock, 2000);

    let frame = 0;
    const localTick = (time: number) => {
      const state = stateRef.current;
      const frameMs = Math.min(Math.max(0, time - previous), MAX_CLIENT_FRAME_MS);
      previous = time;

      if (state?.mode === "solo" && state.phase !== "finished") {
        stateRef.current = engineRef.current.applyAction(state as never, { type: "tick", now: Date.now() }, "system") as AirHockeyState;
        const current = stateRef.current;
        updateMeta(current);
        if (current.phase === "finished" && !soloFinished.current) {
          soloFinished.current = true;
          getSocket().emit("airhockey:soloComplete", { score: current.scores[current.playerIds[0]], conceded: current.scores[current.playerIds[1]] });
        }
      } else if (state?.mode === "duel" && state.phase !== "finished") {
        // O estado renderizado é esta previsão, não o último pacote recebido.
        const predicted = advancePrediction(engineRef.current, state, frameMs);
        const selfId = getPlayerId();
        const beforeContact = (state as AirHockeyState & { paddleContact?: Record<string, boolean> }).paddleContact?.[selfId];
        const afterContact = (predicted as AirHockeyState & { paddleContact?: Record<string, boolean> }).paddleContact?.[selfId];
        if (!beforeContact && afterContact && predicted.impactKind === "paddle" && predicted.impactSerial > state.impactSerial) {
          predictedLocalImpact.current = { serial: predicted.impactSerial, startedAt: performance.now() };
          logDebug(debugEnabled.current, "LOCAL IMPACT", {
            tick: predicted.lastTickAt,
            puckBefore: puckDetails(state),
            puckAfter: puckDetails(predicted),
            impactSerial: predicted.impactSerial,
          });
        }
        predictedLocalRef.current = predicted;
        predictedPuckRef.current = { ...predicted.puck };
        stateRef.current = predicted;
      }

      frame = requestAnimationFrame(localTick);
    };
    frame = requestAnimationFrame(localTick);

    socket.on("game:state", accept);
    socket.on("connect", sync);
    return () => {
      clearInterval(clockInterval);
      cancelAnimationFrame(frame);
      socket.off("game:state", accept);
      socket.off("connect", sync);
    };
  }, [roomCode]);

  const move = useCallback((x: number, y: number) => {
    const state = stateRef.current;
    if (!state) return;

    if (state.mode === "solo") {
      stateRef.current = engineRef.current.applyAction(state as never, { type: "move", x, y }, getPlayerId()) as AirHockeyState;
      return;
    }

    // A previsão local recebe a mesma intenção que o servidor: somente o
    // alvo muda aqui. A posição, velocidade e colisões avançam no tick comum.
    const sequence = ++nextInputSequence.current;
    const input = { x, y, sequence };
    pendingInputs.current.push(input);
    logDebug(debugEnabled.current, "INPUT", {
      sequence,
      timestamp: Date.now(),
      predictedTick: state.lastTickAt,
      target: { x, y },
    });
    const base = predictedLocalRef.current ?? authoritativeRef.current ?? state;
    const predicted = engineRef.current.applyAction(cloneState(base) as never, { type: "move", ...input }, getPlayerId()) as AirHockeyState;
    predictedLocalRef.current = predicted;
    predictedPuckRef.current = { ...predicted.puck };
    stateRef.current = predicted;
    getSocket().emit("airhockey:move", input);
  }, []);

  const newGame = useCallback(() => getSocket().emit("airhockey:newGame"), []);
  return { stateRef, authoritativeRef, predictedLocalRef, predictedPuckRef, meta, move, newGame };
}
