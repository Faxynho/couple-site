"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getRoomPlayerId } from "@/lib/playerId";
import { CrosswordState } from "@/lib/crosswordTypes";

export function useCrosswordGame(roomCode: string) {
  const [state, setState] = useState<CrosswordState | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const sync = () => {
      socket.emit(
        "room:sync",
        { code: roomCode, playerId: getRoomPlayerId(roomCode) },
        (res: { ok: boolean; gameState?: CrosswordState }) => {
          if (res.ok && res.gameState) setState(res.gameState);
        }
      );
    };

    sync();

    const onState = (next: CrosswordState | null) => setState(next);
    socket.on("game:state", onState);
    socket.on("connect", sync);
    return () => {
      socket.off("game:state", onState);
      socket.off("connect", sync);
    };
  }, [roomCode]);

  const setCell = useCallback((row: number, col: number, letter: string) => {
    getSocket().emit("crossword:setCell", { row, col, letter });
  }, []);

  const newPuzzle = useCallback((difficulty?: string) => {
    getSocket().emit("crossword:newPuzzle", { difficulty });
  }, []);

  return { state, setCell, newPuzzle };
}
