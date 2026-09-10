"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getRoomPlayerId } from "@/lib/playerId";
import { WordSearchState } from "@/lib/wordsearchTypes";

export function useWordSearchGame(roomCode: string) {
  const [state, setState] = useState<WordSearchState | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const sync = () => {
      socket.emit(
        "room:sync",
        { code: roomCode, playerId: getRoomPlayerId(roomCode) },
        (res: { ok: boolean; gameState?: WordSearchState }) => {
          if (res.ok && res.gameState) setState(res.gameState);
        }
      );
    };

    sync();

    const onState = (next: WordSearchState | null) => setState(next);
    socket.on("game:state", onState);
    socket.on("connect", sync);
    return () => {
      socket.off("game:state", onState);
      socket.off("connect", sync);
    };
  }, [roomCode]);

  const submitSelection = useCallback(
    (startRow: number, startCol: number, endRow: number, endCol: number) => {
      getSocket().emit("wordsearch:submitSelection", { startRow, startCol, endRow, endCol });
    },
    []
  );

  const newPuzzle = useCallback((difficulty?: string) => {
    getSocket().emit("wordsearch:newPuzzle", { difficulty });
  }, []);

  return { state, submitSelection, newPuzzle };
}
