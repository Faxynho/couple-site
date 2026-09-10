"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getRoomPlayerId } from "@/lib/playerId";
import { MemoryState } from "@/lib/memoryTypes";

export function useMemoryGame(roomCode: string) {
  const [state, setState] = useState<MemoryState | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const sync = () => {
      socket.emit("room:sync", { code: roomCode, playerId: getRoomPlayerId(roomCode) }, (res: { ok: boolean; gameState?: MemoryState }) => {
        if (res.ok && res.gameState) setState(res.gameState);
      });
    };

    sync();
    const onState = (next: MemoryState | null) => setState(next);
    socket.on("game:state", onState);
    socket.on("connect", sync);
    return () => {
      socket.off("game:state", onState);
      socket.off("connect", sync);
    };
  }, [roomCode]);

  const flipCard = useCallback((slotId: string) => {
    getSocket().emit("memory:flipCard", { slotId });
  }, []);

  const newGame = useCallback((difficulty?: string) => {
    getSocket().emit("memory:newGame", { difficulty });
  }, []);

  return { state, flipCard, newGame };
}
