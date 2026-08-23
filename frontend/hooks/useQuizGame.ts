"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { QuizState } from "@/lib/quizTypes";

export function useQuizGame(roomCode: string) {
  const [state, setState] = useState<QuizState | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.emit("room:sync", roomCode, (res: { ok: boolean; gameState?: QuizState }) => {
      if (res.ok && res.gameState) setState(res.gameState);
    });

    const onState = (next: QuizState | null) => setState(next);
    socket.on("game:state", onState);
    return () => {
      socket.off("game:state", onState);
    };
  }, [roomCode]);

  const submitAnswer = useCallback((questionIndex: number, optionIndex: number) => {
    getSocket().emit("quiz:submitAnswer", { questionIndex, optionIndex });
  }, []);

  const newGame = useCallback((difficulty?: string) => {
    getSocket().emit("quiz:newGame", { difficulty });
  }, []);

  return { state, submitAnswer, newGame };
}
