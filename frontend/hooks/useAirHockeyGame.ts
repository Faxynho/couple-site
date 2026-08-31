"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AirHockeyState } from "@/lib/airHockeyTypes";
import { getPlayerId } from "@/lib/playerId";
import { getSocket } from "@/lib/socket";
import { AirHockeyGame } from "../../backend/src/games/airhockey/AirHockeyGame";

export function useAirHockeyGame(roomCode: string) {
  const stateRef = useRef<AirHockeyState | null>(null);
  const [meta, setMeta] = useState<AirHockeyState | null>(null);
  const engineRef = useRef(new AirHockeyGame());
  const soloFinished = useRef(false);
  const lastDuoTick = useRef(0);
  const authoritativeRef = useRef<AirHockeyState | null>(null);
  const predictedLocalRef = useRef<AirHockeyState | null>(null);
  // Estrutura isolada para a etapa de prediction do disco. Por enquanto ela
  // apenas espelha a base autoritativa: não participa de render nem física.
  const predictedPuckRef = useRef<AirHockeyState["puck"] | null>(null);
  const pendingInputs = useRef<Array<{ x: number; y: number; sequence: number }>>([]);

  useEffect(() => {
    const socket = getSocket();
    const accept = (next: AirHockeyState | null) => {
      if (next?.mode === "duel" && next.lastTickAt !== undefined && next.lastTickAt < lastDuoTick.current) return;
      if (next?.mode === "duel" && next.lastTickAt !== undefined) lastDuoTick.current = next.lastTickAt;
      if (next?.mode === "duel") {
        authoritativeRef.current = next;
        predictedPuckRef.current = { ...next.puck };
        const confirmed = next.lastProcessedInputSequence?.[getPlayerId()] ?? 0;
        pendingInputs.current = pendingInputs.current.filter((input) => input.sequence > confirmed);
        let predicted = structuredClone(next);
        for (const input of pendingInputs.current) predicted = engineRef.current.applyAction(predicted as never, { type: "move", ...input }, getPlayerId()) as AirHockeyState;
        predictedLocalRef.current = predicted;
      }
      if (next?.mode === "solo" && stateRef.current?.mode === "solo" && next.startedAt === stateRef.current.startedAt) return;
      if (next?.mode === "solo") soloFinished.current = false;
      stateRef.current = next;
      if (!next) return;
      setMeta((previous) => {
        if (previous && previous.phase === next.phase && previous.goalSerial === next.goalSerial && previous.scores[next.playerIds[0]] === next.scores[next.playerIds[0]] && previous.scores[next.playerIds[1]] === next.scores[next.playerIds[1]]) return previous;
        return next;
      });
    };
    const sync = () => socket.emit("room:sync", { code: roomCode, playerId: getPlayerId() }, (response: { ok: boolean; gameState?: AirHockeyState }) => {
      if (response.ok && response.gameState) accept(response.gameState);
    });
    sync();

    let frame=0; let previous=performance.now();
    const localTick=(time:number)=>{ const state=stateRef.current; if(state?.mode==="solo" && state.phase!=="finished") { const now=Date.now(); stateRef.current=engineRef.current.applyAction(state as never,{type:"tick",now},"system") as AirHockeyState; const current=stateRef.current; setMeta(old=>!old||old.phase!==current.phase||old.goalSerial!==current.goalSerial||old.scores[current.playerIds[0]]!==current.scores[current.playerIds[0]]||old.scores[current.playerIds[1]]!==current.scores[current.playerIds[1]]?current:old); if(current.phase==="finished"&&!soloFinished.current){soloFinished.current=true;getSocket().emit("airhockey:soloComplete",{score:current.scores[current.playerIds[0]],conceded:current.scores[current.playerIds[1]]});} } previous=time; frame=requestAnimationFrame(localTick);}; frame=requestAnimationFrame(localTick);

    socket.on("game:state", accept);
    socket.on("connect", sync);
    return () => { cancelAnimationFrame(frame); socket.off("game:state", accept); socket.off("connect", sync); };
  }, [roomCode]);

  const move = useCallback((x: number, y: number, sequence?: number) => { const state=stateRef.current; if(state?.mode==="solo"){ stateRef.current=engineRef.current.applyAction(state as never,{type:"move",x,y},getPlayerId()) as AirHockeyState; return; } if(state?.mode==="duel"&&sequence!==undefined){const input={x,y,sequence};pendingInputs.current.push(input);const base=predictedLocalRef.current??authoritativeRef.current??state;predictedLocalRef.current=engineRef.current.applyAction(structuredClone(base) as never,{type:"move",...input},getPlayerId()) as AirHockeyState;} getSocket().emit("airhockey:move", { x, y, sequence }); }, []);
  const newGame = useCallback(() => getSocket().emit("airhockey:newGame"), []);
  return { stateRef, authoritativeRef, predictedLocalRef, predictedPuckRef, meta, move, newGame };
}
