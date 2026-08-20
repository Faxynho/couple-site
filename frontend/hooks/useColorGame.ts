"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { ColorMemoryState } from "@/lib/colorTypes";

export function useColorGame(roomCode: string) {
  const [state, setState] = useState<ColorMemoryState | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.emit("room:sync", roomCode, (res: { ok: boolean; gameState?: ColorMemoryState }) => {
      if (res.ok && res.gameState) setState(res.gameState);
    });

    const onState = (next: ColorMemoryState | null) => setState(next);
    socket.on("game:state", onState);
    return () => {
      socket.off("game:state", onState);
    };
  }, [roomCode]);

  const submitGuess = useCallback((round: number, h: number, s: number, v: number) => {
    getSocket().emit("colors:submitGuess", { round, h, s, v });
  }, []);

  const nextRound = useCallback(() => {
    getSocket().emit("colors:nextRound");
  }, []);

  const newGame = useCallback((difficulty?: string) => {
    getSocket().emit("colors:newGame", { difficulty });
  }, []);

  return { state, submitGuess, nextRound, newGame };
}
