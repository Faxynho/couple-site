"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getPlayerId } from "@/lib/playerId";
import type { CasinoMiniGame, CasinoRacerId, CasinoState, LastChanceCoinSide, RouletteBet } from "@/lib/casinoTypes";

interface SyncResult {
  ok: boolean;
  gameState?: CasinoState;
}

export function useCasinoGame(roomCode: string) {
  const [state, setState] = useState<CasinoState | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const sync = () => {
      socket.emit("room:sync", { code: roomCode, playerId: getPlayerId() }, (res: SyncResult) => {
        if (res.ok && res.gameState) setState(res.gameState);
      });
    };
    sync();
    const onState = (next: CasinoState | null) => setState(next);
    socket.on("game:state", onState);
    socket.on("connect", sync);
    return () => {
      socket.off("game:state", onState);
      socket.off("connect", sync);
    };
  }, [roomCode]);

  const send = useCallback((action: Record<string, unknown>) => {
    getSocket().emit("casino:action", action);
  }, []);

  const vote = useCallback((game: CasinoMiniGame) => send({ type: "vote", game }), [send]);
  const lockBet = useCallback((amount: number) => send({ type: "lockBet", amount }), [send]);
  const minesOpen = useCallback((index: number) => send({ type: "minesOpen", index }), [send]);
  const cashOut = useCallback(() => send({ type: "cashOut" }), [send]);
  const crashCashOut = useCallback(() => send({ type: "crashCashOut" }), [send]);
  const roulettePick = useCallback((bet: RouletteBet) => send({ type: "roulettePick", bet }), [send]);
  const slotsSpin = useCallback(() => send({ type: "slotsSpin" }), [send]);
  const racePick = useCallback((racerId: CasinoRacerId) => send({ type: "racePick", racerId }), [send]);
  const diceRoll = useCallback(() => send({ type: "diceRoll" }), [send]);
  const diceContinue = useCallback(() => send({ type: "diceContinue" }), [send]);
  const hiloGuess = useCallback((direction: "higher" | "lower") => send({ type: "hiloGuess", direction }), [send]);
  const hiloContinue = useCallback(() => send({ type: "hiloContinue" }), [send]);
  const nextRound = useCallback(() => send({ type: "nextRound" }), [send]);
  const lastChanceChoose = useCallback((side: LastChanceCoinSide) => send({ type: "lastChanceChoose", side }), [send]);
  const lastChanceSpin = useCallback(() => send({ type: "lastChanceSpin" }), [send]);
  const newGame = useCallback(() => getSocket().emit("casino:newGame"), []);

  return {
    state,
    vote,
    lockBet,
    minesOpen,
    cashOut,
    crashCashOut,
    roulettePick,
    slotsSpin,
    racePick,
    diceRoll,
    diceContinue,
    hiloGuess,
    hiloContinue,
    nextRound,
    lastChanceChoose,
    lastChanceSpin,
    newGame,
  };
}
