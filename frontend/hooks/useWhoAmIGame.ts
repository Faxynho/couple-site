"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getRoomPlayerId } from "@/lib/playerId";
import { WhoAmIState } from "@/lib/whoAmITypes";

interface SyncResult {
  ok: boolean;
  gameState?: WhoAmIState;
}

export function useWhoAmIGame(roomCode: string) {
  const [state, setState] = useState<WhoAmIState | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const sync = () => {
      socket.emit("room:sync", { code: roomCode, playerId: getRoomPlayerId(roomCode) }, (res: SyncResult) => {
        if (res.ok && res.gameState) setState(res.gameState);
      });
    };

    sync();
    const onState = (next: WhoAmIState | null) => setState(next);
    socket.on("game:state", onState);
    socket.on("connect", sync);

    return () => {
      socket.off("game:state", onState);
      socket.off("connect", sync);
    };
  }, [roomCode]);

  const revealHint = useCallback(() => {
    getSocket().emit("whoami:action", { type: "revealHint" });
  }, []);

  const submitGuess = useCallback((guess: string) => {
    getSocket().emit("whoami:action", { type: "submitGuess", guess });
  }, []);

  const giveUp = useCallback(() => {
    getSocket().emit("whoami:action", { type: "giveUp" });
  }, []);

  const newGame = useCallback(() => {
    getSocket().emit("whoami:newGame");
  }, []);

  return { state, revealHint, submitGuess, giveUp, newGame };
}
