"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getPlayerId } from "@/lib/playerId";
import { RPGState } from "@/lib/rpgTypes";

export function useRPGGame(roomCode: string) {
  const [state, setState] = useState<RPGState | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const sync = () => {
      socket.emit("room:sync", { code: roomCode, playerId: getPlayerId() }, (res: { ok: boolean; gameState?: RPGState }) => {
        if (res.ok && res.gameState) setState(res.gameState);
      });
    };

    sync();

    const onState = (next: RPGState | null) => setState(next);
    socket.on("game:state", onState);
    socket.on("connect", sync);
    return () => {
      socket.off("game:state", onState);
      socket.off("connect", sync);
    };
  }, [roomCode]);

  const selectCard = useCallback((cardInstanceId: string) => {
    getSocket().emit("rpg:selectCard", { cardInstanceId });
  }, []);

  const rerollHand = useCallback(() => {
    getSocket().emit("rpg:rerollHand");
  }, []);

  const newGame = useCallback(() => {
    getSocket().emit("rpg:newGame");
  }, []);

  return { state, selectCard, rerollHand, newGame };
}
