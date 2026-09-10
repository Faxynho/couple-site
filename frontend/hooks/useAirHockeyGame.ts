"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AirHockeyState } from "@/lib/airHockeyTypes";
import { getRoomPlayerId } from "@/lib/playerId";
import { getSocket } from "@/lib/socket";
import { updateActiveSoloState } from "@/lib/soloMatch";
import { AirHockeyGame } from "../../backend/src/games/airhockey/AirHockeyGame";

type PendingInput = { x: number; y: number; sequence: number; simulationTick: number };
type ReplaySegment = { advanceMs: number; appliedSequence?: number; timing?: "at-or-before-snapshot" | "future-applied-at-present" };

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

function replayPendingInputs(
  engine: AirHockeyGame,
  snapshot: AirHockeyState,
  pendingInputs: PendingInput[],
  playerId: string,
  snapshotAgeMs: number,
) {
  let predicted = cloneState(snapshot);
  const snapshotTick = snapshot.lastTickAt ?? 0;
  const presentTick = snapshotTick + snapshotAgeMs;
  let currentTick = snapshotTick;
  const segments: ReplaySegment[] = [];
  const futureInputs: PendingInput[] = [];

  for (const input of pendingInputs) {
    if (input.simulationTick <= currentTick) {
      // Ainda pendente porque o snapshot foi emitido antes de o servidor
      // processar a intenção. Ela passa a valer no início do rebase; nunca
      // retrocedemos a engine para tentar alcançar o timestamp original.
      predicted = engine.applyAction(predicted as never, { type: "move", x: input.x, y: input.y, sequence: input.sequence }, playerId) as AirHockeyState;
      segments.push({ advanceMs: 0, appliedSequence: input.sequence, timing: "at-or-before-snapshot" });
      continue;
    }

    if (input.simulationTick > presentTick) {
      futureInputs.push(input);
      continue;
    }

    const advanceMs = input.simulationTick - currentTick;
    predicted = advancePrediction(engine, predicted, advanceMs);
    currentTick = input.simulationTick;
    predicted = engine.applyAction(predicted as never, { type: "move", x: input.x, y: input.y, sequence: input.sequence }, playerId) as AirHockeyState;
    segments.push({ advanceMs, appliedSequence: input.sequence });
  }

  const finalAdvanceMs = Math.max(0, presentTick - currentTick);
  predicted = advancePrediction(engine, predicted, finalAdvanceMs);
  segments.push({ advanceMs: finalAdvanceMs });

  // Um timestamp futuro não pode fazer a simulação avançar além do presente.
  // A intenção continua pendente, mas é aplicada como alvo no presente para
  // que o próximo RAF a mova fisicamente sem retroceder nem pular no tempo.
  for (const input of futureInputs) {
    predicted = engine.applyAction(predicted as never, { type: "move", x: input.x, y: input.y, sequence: input.sequence }, playerId) as AirHockeyState;
    segments.push({ advanceMs: 0, appliedSequence: input.sequence, timing: "future-applied-at-present" });
  }

  return {
    predicted,
    snapshotTick,
    presentTick,
    segments,
    futureInputs,
    totalAdvancedMs: segments.reduce((total, segment) => total + segment.advanceMs, 0),
  };
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
  const serverClockOffsetMs = useRef<number | null>(null);
  const bestClockRttMs = useRef(Number.POSITIVE_INFINITY);
  const debugEnabled = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    lastDuoTick.current = 0;
    pendingInputs.current = [];
    nextInputSequence.current = 0;
    serverClockOffsetMs.current = null;
    bestClockRttMs.current = Number.POSITIVE_INFINITY;
    debugEnabled.current = new URLSearchParams(window.location.search).get("airHockeyDebug") === "1";
    let previous = performance.now();
    let lastSoloAutosaveAt = 0;

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

        const selfId = getRoomPlayerId(roomCode);
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

        // Todo snapshot válido passa pelo mesmo rebase: os alvos pendentes
        // entram na própria linha do tempo da previsão, não todos no começo.
        const temporalReplay = replayPendingInputs(engineRef.current, next, pendingInputs.current, selfId, snapshotAgeMs);
        const predicted = temporalReplay.predicted;
        const resimulatedMs = temporalReplay.totalAdvancedMs;
        predictedLocalRef.current = predicted;
        predictedPuckRef.current = { ...predicted.puck };
        stateRef.current = predicted;
        // A previsão acima já alcançou o presente estimado. O próximo RAF só
        // pode integrar o tempo transcorrido depois desta reconciliação.
        previous = performance.now();
        if (debugEnabled.current) {
          console.assert(snapshotAgeMs <= 0 || resimulatedMs > 0, "Snapshot com idade positiva não pode pular a ressimulação.");
          if (pendingInputs.current.length > 1 || temporalReplay.futureInputs.length > 0) {
            logDebug(true, "TEMPORAL REPLAY", {
              snapshotTick: temporalReplay.snapshotTick,
              presentTick: temporalReplay.presentTick,
              snapshotAgeMs,
              inputs: pendingInputs.current.map((input) => ({
                sequence: input.sequence,
                tick: input.simulationTick,
                offsetFromSnapshot: input.simulationTick - temporalReplay.snapshotTick,
              })),
              segments: temporalReplay.segments,
              totalAdvancedMs: temporalReplay.totalAdvancedMs,
              futureInputs: temporalReplay.futureInputs.map((input) => input.sequence),
            });
          }
        }
        logDebug(debugEnabled.current, "RECONCILIATION", {
          ...puckError(previousPrediction, next),
          postReconcileError: puckError(predicted, next),
          snapshotAgeMs,
          resimulatedMs,
          pendingInputs: pendingInputs.current.map((input) => input.sequence),
          reconciliationMode: "normal-replay",
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
      socket.emit("room:sync", { code: roomCode, playerId: getRoomPlayerId(roomCode) }, (response: { ok: boolean; gameState?: AirHockeyState }) => {
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
        const now = Date.now();
        if (now - lastSoloAutosaveAt >= 1_000) {
          lastSoloAutosaveAt = now;
          updateActiveSoloState("airhockey", current);
        }
        if (current.phase === "finished" && !soloFinished.current) {
          soloFinished.current = true;
          getSocket().emit("airhockey:soloComplete", { score: current.scores[current.playerIds[0]], conceded: current.scores[current.playerIds[1]] });
        }
      } else if (state?.mode === "duel" && state.phase !== "finished") {
        // O estado renderizado é esta previsão, não o último pacote recebido.
        const predicted = advancePrediction(engineRef.current, state, frameMs);
        const selfId = getRoomPlayerId(roomCode);
        const beforeContact = (state as AirHockeyState & { paddleContact?: Record<string, boolean> }).paddleContact?.[selfId];
        const afterContact = (predicted as AirHockeyState & { paddleContact?: Record<string, boolean> }).paddleContact?.[selfId];
        if (!beforeContact && afterContact && predicted.impactKind === "paddle" && predicted.impactSerial > state.impactSerial) {
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
      stateRef.current = engineRef.current.applyAction(state as never, { type: "move", x, y }, getRoomPlayerId(roomCode)) as AirHockeyState;
      return;
    }

    // A previsão local recebe a mesma intenção que o servidor: somente o
    // alvo muda aqui. A posição, velocidade e colisões avançam no tick comum.
    const sequence = ++nextInputSequence.current;
    const base = predictedLocalRef.current ?? authoritativeRef.current ?? state;
    const simulationTick = base.lastTickAt ?? state.lastTickAt ?? Date.now();
    const input = { x, y, sequence, simulationTick };
    pendingInputs.current.push(input);
    logDebug(debugEnabled.current, "INPUT", {
      sequence,
      timestamp: Date.now(),
      predictedTick: simulationTick,
      target: { x, y },
    });
    const predicted = engineRef.current.applyAction(cloneState(base) as never, { type: "move", x, y, sequence }, getRoomPlayerId(roomCode)) as AirHockeyState;
    predictedLocalRef.current = predicted;
    predictedPuckRef.current = { ...predicted.puck };
    stateRef.current = predicted;
    getSocket().emit("airhockey:move", { x, y, sequence, simulationTick });
  }, []);

  const newGame = useCallback(() => getSocket().emit("airhockey:newGame"), []);
  return { stateRef, authoritativeRef, predictedLocalRef, predictedPuckRef, meta, move, newGame };
}
