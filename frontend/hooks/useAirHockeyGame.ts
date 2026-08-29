"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AirHockeyState } from "@/lib/airHockeyTypes";
import { getPlayerId } from "@/lib/playerId";
import { getSocket } from "@/lib/socket";

export function useAirHockeyGame(roomCode: string) {
  const stateRef = useRef<AirHockeyState | null>(null);
  const [meta, setMeta] = useState<AirHockeyState | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const accept = (next: AirHockeyState | null) => {
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
    socket.on("game:state", accept);
    socket.on("connect", sync);
    return () => { socket.off("game:state", accept); socket.off("connect", sync); };
  }, [roomCode]);

  const move = useCallback((x: number, y: number) => getSocket().emit("airhockey:move", { x, y }), []);
  const newGame = useCallback(() => getSocket().emit("airhockey:newGame"), []);
  return { stateRef, meta, move, newGame };
}
