"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AirHockeyState } from "@/lib/airHockeyTypes";
import { getPlayerId } from "@/lib/playerId";
import { getSocket } from "@/lib/socket";
import { AirHockeyGame } from "../../backend/src/games/airhockey/AirHockeyGame";

type PendingInput = { x: number; y: number; sequence: number };
type PaddleIntent = { x: number; y: number };

// Também usado pelo tick autoritativo. Renderização continua livre em RAF;
// somente a simulação anda por múltiplos inteiros deste passo.
const PHYSICS_STEP_MS = 16;
const MAX_CATCH_UP_STEPS = 12;

function cloneState(state: AirHockeyState) {
  return structuredClone(state) as AirHockeyState;
}

function advanceFixed(engine: AirHockeyGame, state: AirHockeyState, elapsedMs: number, maxSteps = Number.POSITIVE_INFINITY) {
  let next = state;
  const steps = Math.min(maxSteps, Math.floor(Math.max(0, elapsedMs) / PHYSICS_STEP_MS));
  for (let step = 0; step < steps && next.phase !== "finished"; step += 1) {
    const lastTickAt = next.lastTickAt ?? Date.now();
    next = engine.applyAction(next as never, { type: "tick", now: lastTickAt + PHYSICS_STEP_MS }, "system") as AirHockeyState;
  }
  return { state: next, consumedMs: steps * PHYSICS_STEP_MS };
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
  const localIntentRef = useRef<PaddleIntent | null>(null);
  const pendingInputs = useRef<PendingInput[]>([]);
  const nextInputSequence = useRef(0);
  const predictionRemainderMs = useRef(0);
  // serverNow - clientNow; escolhido pela amostra de menor RTT.
  const serverClockOffsetMs = useRef(0);
  const bestClockRttMs = useRef(Number.POSITIVE_INFINITY);

  useEffect(() => {
    const socket = getSocket();
    lastDuoTick.current = 0;
    pendingInputs.current = [];
    nextInputSequence.current = 0;
    predictionRemainderMs.current = 0;
    bestClockRttMs.current = Number.POSITIVE_INFINITY;

    const updateMeta = (next: AirHockeyState) => {
      setMeta((previous) => {
        if (previous && previous.phase === next.phase && previous.goalSerial === next.goalSerial && previous.scores[next.playerIds[0]] === next.scores[next.playerIds[0]] && previous.scores[next.playerIds[1]] === next.scores[next.playerIds[1]]) return previous;
        return next;
      });
    };

    const syncClock = () => {
      const sentAt = Date.now();
      socket.emit("airhockey:clock", (response: { serverNow?: number }) => {
        const receivedAt = Date.now();
        if (!Number.isFinite(response?.serverNow)) return;
        const rtt = receivedAt - sentAt;
        if (rtt <= bestClockRttMs.current) {
          bestClockRttMs.current = rtt;
          serverClockOffsetMs.current = (response.serverNow as number) - (sentAt + receivedAt) / 2;
        }
      });
    };

    const accept = (next: AirHockeyState | null) => {
      if (!next) { stateRef.current = null; return; }
      if (next.mode === "duel") {
        const snapshotTick = next.lastTickAt ?? 0;
        if (snapshotTick <= lastDuoTick.current) return;
        lastDuoTick.current = snapshotTick;
        authoritativeRef.current = next;

        const selfId = getPlayerId();
        const confirmed = next.lastProcessedInputSequence?.[selfId] ?? 0;
        pendingInputs.current = pendingInputs.current.filter((input) => input.sequence > confirmed);
        nextInputSequence.current = Math.max(nextInputSequence.current, confirmed);

        // Rebase autoritativo, replay somente das intenções ainda pendentes e
        // avanço até o presente usando a idade real deste snapshot.
        let predicted = cloneState(next);
        for (const input of pendingInputs.current) {
          predicted = engineRef.current.applyAction(predicted as never, { type: "move", ...input }, selfId) as AirHockeyState;
        }
        const serverNowInClientClock = Date.now() + serverClockOffsetMs.current;
        const snapshotAgeMs = Math.max(0, serverNowInClientClock - snapshotTick);
        const advanced = advanceFixed(engineRef.current, predicted, snapshotAgeMs);
        predicted = advanced.state;
        predictionRemainderMs.current = snapshotAgeMs - advanced.consumedMs;
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

    const sync = () => {
      syncClock();
      socket.emit("room:sync", { code: roomCode, playerId: getPlayerId() }, (response: { ok: boolean; gameState?: AirHockeyState }) => {
        if (response.ok && response.gameState) accept(response.gameState);
      });
    };
    sync();
    const clockInterval = window.setInterval(syncClock, 2000);

    let frame = 0;
    let previous = performance.now();
    const localTick = (time: number) => {
      const state = stateRef.current;
      const frameMs = Math.max(0, Math.min(100, time - previous));
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
        predictionRemainderMs.current += frameMs;
        const advanced = advanceFixed(engineRef.current, state, predictionRemainderMs.current, MAX_CATCH_UP_STEPS);
        predictionRemainderMs.current -= advanced.consumedMs;
        predictedLocalRef.current = advanced.state;
        predictedPuckRef.current = { ...advanced.state.puck };
        stateRef.current = advanced.state;
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

  const previewMove = useCallback((x: number, y: number) => {
    // Caminho exclusivamente visual da paddle local; não mexe no relógio nem
    // inventa um passo físico diferente da simulação autoritativa.
    localIntentRef.current = { x, y };
  }, []);

  const move = useCallback((x: number, y: number) => {
    const state = stateRef.current;
    if (!state) return;
    if (state.mode === "solo") {
      stateRef.current = engineRef.current.applyAction(state as never, { type: "move", x, y }, getPlayerId()) as AirHockeyState;
      return;
    }
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
  return { stateRef, authoritativeRef, predictedLocalRef, predictedPuckRef, localIntentRef, meta, move, previewMove, newGame };
}
