"use client";

import { useCallback, useEffect, useState } from "react";
import { ChessPromotion, ChessState } from "@/lib/chessTypes";
import { getRoomPlayerId } from "@/lib/playerId";
import { getSocket } from "@/lib/socket";

export function useChessGame(roomCode: string) {
  const [state, setState] = useState<ChessState | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const sync = () => socket.emit("room:sync", { code: roomCode, playerId: getRoomPlayerId(roomCode) }, (res: { ok: boolean; gameState?: ChessState }) => {
      if (res.ok && res.gameState) setState(res.gameState);
    });
    sync();
    const onState = (next: ChessState | null) => setState(next);
    socket.on("game:state", onState);
    socket.on("connect", sync);
    return () => {
      socket.off("game:state", onState);
      socket.off("connect", sync);
    };
  }, [roomCode]);

  const move = useCallback((from: string, to: string, promotion?: ChessPromotion) => {
    getSocket().emit("chess:move", { from, to, promotion });
  }, []);
  const newGame = useCallback(() => getSocket().emit("chess:newGame"), []);

  return { state, move, newGame };
}
