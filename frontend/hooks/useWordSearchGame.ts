"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { WordSearchState } from "@/lib/wordsearchTypes";

export function useWordSearchGame(roomCode: string) {
  const [state, setState] = useState<WordSearchState | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.emit("room:sync", roomCode, (res: { ok: boolean; gameState?: WordSearchState }) => {
      if (res.ok && res.gameState) setState(res.gameState);
    });

    const onState = (next: WordSearchState | null) => setState(next);
    socket.on("game:state", onState);
    return () => {
      socket.off("game:state", onState);
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
