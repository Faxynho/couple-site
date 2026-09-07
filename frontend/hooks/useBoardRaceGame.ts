"use client";

import { useCallback, useEffect, useState } from "react";
import { BoardRacePowerId, BoardRaceState } from "@/lib/boardRaceTypes";
import { getPlayerId } from "@/lib/playerId";
import { getSocket } from "@/lib/socket";

export function useBoardRaceGame(roomCode: string) {
  const [state, setState] = useState<BoardRaceState | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const sync = () => {
      socket.emit("room:sync", { code: roomCode, playerId: getPlayerId() }, (response: { ok: boolean; gameState?: BoardRaceState }) => {
        if (response.ok && response.gameState) setState(response.gameState);
      });
    };
    const onState = (next: BoardRaceState | null) => setState(next);
    sync();
    socket.on("game:state", onState);
    socket.on("connect", sync);
    return () => {
      socket.off("game:state", onState);
      socket.off("connect", sync);
    };
  }, [roomCode]);

  const roll = useCallback(() => getSocket().emit("boardrace:action", { type: "roll" }), []);
  const answerQuiz = useCallback((optionIndex: number) => getSocket().emit("boardrace:action", { type: "answerQuiz", optionIndex }), []);
  const answerWord = useCallback((answer: string) => getSocket().emit("boardrace:action", { type: "answerWord", answer }), []);
  const giveUpWord = useCallback(() => getSocket().emit("boardrace:action", { type: "giveUpWord" }), []);
  const chooseSafe = useCallback((optionIndex: number) => getSocket().emit("boardrace:action", { type: "chooseSafe", optionIndex }), []);
  const usePower = useCallback((powerId: BoardRacePowerId, targetPlayerId?: string) => getSocket().emit("boardrace:action", { type: "usePower", powerId, targetPlayerId }), []);
  const minigameAction = useCallback((action: unknown) => getSocket().emit("boardrace:action", { type: "minigameAction", action }), []);
  const newGame = useCallback(() => getSocket().emit("boardrace:newGame"), []);

  return { state, roll, answerQuiz, answerWord, giveUpWord, chooseSafe, usePower, minigameAction, newGame };
}
