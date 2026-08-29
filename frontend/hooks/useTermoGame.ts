"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getPlayerId } from "@/lib/playerId";
import { TermoState } from "@/lib/termoTypes";

export function useTermoGame(roomCode: string) {
  const [state, setState] = useState<TermoState | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const sync = () => {
      socket.emit("room:sync", { code: roomCode, playerId: getPlayerId() }, (response: { ok: boolean; gameState?: TermoState }) => {
        if (response.ok && response.gameState) setState(response.gameState);
      });
    };
    sync();
    const onState = (next: TermoState | null) => setState(next);
    socket.on("game:state", onState);
    socket.on("connect", sync);
    return () => {
      socket.off("game:state", onState);
      socket.off("connect", sync);
    };
  }, [roomCode]);

  const submitGuess = useCallback((word: string) => getSocket().emit("termo:submitGuess", { word }), []);
  const newGame = useCallback(() => getSocket().emit("termo:newGame"), []);
  return { state, submitGuess, newGame };
}
