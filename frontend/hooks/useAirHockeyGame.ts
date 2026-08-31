"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AirHockeyState } from "@/lib/airHockeyTypes";
import { getPlayerId } from "@/lib/playerId";
import { getSocket } from "@/lib/socket";
import { AirHockeyGame } from "../../backend/src/games/airhockey/AirHockeyGame";

type PendingInput = { x: number; y: number; sequence: number };
type PaddleIntent = { x: number; y: number };

// O servidor publica o estado a cada ~33 ms. Esta pequena antecipação cobre a
// idade normal de um snapshot sem depender do relógio de parede do dispositivo.
const DUEL_PREDICTION_LEAD_MS = 48;
const MAX_CLIENT_FRAME_MS = 33;
const CLIENT_SIMULATION_STEP_MS = 1000 / 60;

function cloneState(state: AirHockeyState) {
  return structuredClone(state) as AirHockeyState;
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
  // Estado de renderização: não participa da física nem da reconciliação.
  // A arena o usa para desenhar a própria paddle no mesmo frame do ponteiro.
  const localIntentRef = useRef<PaddleIntent | null>(null);
  const pendingInputs = useRef<PendingInput[]>([]);
  const nextInputSequence = useRef(0);

  useEffect(() => {
    const socket = getSocket();
    lastDuoTick.current = 0;
    pendingInputs.current = [];
    nextInputSequence.current = 0;

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

        // Reconciliação: servidor primeiro; depois apenas intenções ainda não
        // processadas. Nenhum impulso é copiado do cliente para o servidor.
        let predicted = cloneState(next);
        for (const input of pendingInputs.current) {
          predicted = engineRef.current.applyAction(predicted as never, { type: "move", ...input }, selfId) as AirHockeyState;
        }
        predicted = advancePrediction(engineRef.current, predicted, DUEL_PREDICTION_LEAD_MS);
        predictedLocalRef.current = predicted;
        predictedPuckRef.current = { ...predicted.puck };
        stateRef.current = predicted;
        if (next.phase !== "playing") localIntentRef.current = null;
        updateMeta(next);
        return;
      }

      if (stateRef.current?.mode === "solo" && next.startedAt === stateRef.current.startedAt) return;
      soloFinished.current = false;
      localIntentRef.current = null;
      stateRef.current = next;
      updateMeta(next);
    };

    const sync = () => socket.emit("room:sync", { code: roomCode, playerId: getPlayerId() }, (response: { ok: boolean; gameState?: AirHockeyState }) => {
      if (response.ok && response.gameState) accept(response.gameState);
    });
    sync();

    let frame = 0;
    let previous = performance.now();
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

    // Não altera a simulação: é apenas a posição desenhada da paddle local.
    localIntentRef.current = { x, y };
    const sequence = ++nextInputSequence.current;
    const input = { x, y, sequence };
    pendingInputs.current.push(input);
    const base = predictedLocalRef.current ?? authoritativeRef.current ?? state;
    const predicted = engineRef.current.applyAction(cloneState(base) as never, { type: "move", ...input }, getPlayerId()) as AirHockeyState;
    predictedLocalRef.current = predicted;
    predictedPuckRef.current = { ...predicted.puck };
    stateRef.current = predicted;
    getSocket().emit("airhockey:move", input);
  }, []);

  const newGame = useCallback(() => getSocket().emit("airhockey:newGame"), []);
  return { stateRef, authoritativeRef, predictedLocalRef, predictedPuckRef, localIntentRef, meta, move, newGame };
}
