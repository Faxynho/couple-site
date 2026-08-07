"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { SudokuState } from "@/lib/sudokuTypes";

export function useSudokuGame(roomCode: string) {
  const [state, setState] = useState<SudokuState | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.emit("room:sync", roomCode, (res: { ok: boolean; gameState?: SudokuState }) => {
      if (res.ok && res.gameState) setState(res.gameState);
    });

    const onState = (next: SudokuState | null) => setState(next);
    socket.on("game:state", onState);
    return () => {
      socket.off("game:state", onState);
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
