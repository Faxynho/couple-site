"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { RPGState } from "@/lib/rpgTypes";

export function useRPGGame(roomCode: string) {
  const [state, setState] = useState<RPGState | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.emit("room:sync", roomCode, (res: { ok: boolean; gameState?: RPGState }) => {
      if (res.ok && res.gameState) setState(res.gameState);
    });

    const onState = (next: RPGState | null) => setState(next);
    socket.on("game:state", onState);
    return () => {
      socket.off("game:state", onState);
    };
  }, [roomCode]);

  const selectCard = useCallback((cardInstanceId: string) => {
    getSocket().emit("rpg:selectCard", { cardInstanceId });
  }, []);

  const newGame = useCallback(() => {
    getSocket().emit("rpg:newGame");
  }, []);

  return { state, selectCard, newGame };
}
