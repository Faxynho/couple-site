"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getRoomPlayerId } from "@/lib/playerId";
import { QuizState } from "@/lib/quizTypes";

interface SyncResult {
  ok: boolean;
  gameState?: QuizState;
}

export function useQuizGame(roomCode: string) {
  const [state, setState] = useState<QuizState | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const sync = () => {
      socket.emit("room:sync", { code: roomCode, playerId: getRoomPlayerId(roomCode) }, (res: SyncResult) => {
        if (res.ok && res.gameState) setState(res.gameState);
      });
    };

    sync();

    const onState = (next: QuizState | null) => setState(next);
    socket.on("game:state", onState);
    // Depois de qualquer reconexão do WebSocket, busca o estado atual de novo
    // — sem isso, a resposta e a pergunta ficavam "presas" na última que
    // chegou antes da queda de conexão, até o próximo evento por acaso chegar.
    socket.on("connect", sync);
    return () => {
      socket.off("game:state", onState);
      socket.off("connect", sync);
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
