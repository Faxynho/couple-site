"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getPlayerId } from "@/lib/playerId";
import { SudokuState } from "@/lib/sudokuTypes";

export function useSudokuGame(roomCode: string) {
  const [state, setState] = useState<SudokuState | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const sync = () => {
      socket.emit("room:sync", { code: roomCode, playerId: getPlayerId() }, (res: { ok: boolean; gameState?: SudokuState }) => {
        if (res.ok && res.gameState) setState(res.gameState);
      });
    };

    sync();

    const onState = (next: SudokuState | null) => setState(next);
    socket.on("game:state", onState);
    socket.on("connect", sync);
    return () => {
      socket.off("game:state", onState);
      socket.off("connect", sync);
    };
  }, [roomCode]);

  const setCell = useCallback((index: number, value: number) => {
    getSocket().emit("sudoku:setCell", { index, value });
  }, []);

  const newPuzzle = useCallback((difficulty?: string) => {
    getSocket().emit("sudoku:newPuzzle", { difficulty });
  }, []);

  const resetGame = useCallback(() => {
    getSocket().emit("game:reset");
  }, []);

  return { state, setCell, newPuzzle, resetGame };
}
