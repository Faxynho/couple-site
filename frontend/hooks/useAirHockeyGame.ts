"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AirHockeyState } from "@/lib/airHockeyTypes";
import { getPlayerId } from "@/lib/playerId";
import { getSocket } from "@/lib/socket";

export function useAirHockeyGame(roomCode: string) {
  const stateRef = useRef<AirHockeyState | null>(null);
  const [meta, setMeta] = useState<AirHockeyState | null>(null);

  useEffect(() => {
    const socket = getSocket();
    let clockOffsetMs = 0;
    const accept = (next: AirHockeyState | null) => {
      if (!next) { stateRef.current = next; return; }
      // Os snapshots carregam o instante exato do tick no Railway. Em vez de
      // desenhá-los como se fossem "agora" (o que expõe toda a latência
      // Vercel ↔ Railway), o Canvas os extrapola até o relógio atual.
      const stamped = { ...next, clockOffsetMs };
      stateRef.current = stamped;
      setMeta((previous) => {
        if (previous && previous.phase === stamped.phase && previous.goalSerial === stamped.goalSerial && previous.scores[stamped.playerIds[0]] === stamped.scores[stamped.playerIds[0]] && previous.scores[stamped.playerIds[1]] === stamped.scores[stamped.playerIds[1]]) return previous;
        return stamped;
      });
    };
    const sync = () => socket.emit("room:sync", { code: roomCode, playerId: getPlayerId() }, (response: { ok: boolean; gameState?: AirHockeyState }) => {
      if (response.ok && response.gameState) accept(response.gameState);
    });
    sync();

    // Pequena medição periódica, sem afetar o loop de jogo. Ela compensa
    // relógios diferentes entre navegador e servidor e deixa a extrapolação
    // do disco independente da frequência dos snapshots.
    const measureClock = () => {
      const sentAt = Date.now();
      socket.timeout(1800).emit("airhockey:ping", (error: Error | null, response?: { serverNow?: number }) => {
        if (error || !Number.isFinite(response?.serverNow)) return;
        const roundTrip = Date.now() - sentAt;
        clockOffsetMs = (response!.serverNow as number) - (sentAt + roundTrip / 2);
        if (stateRef.current) stateRef.current.clockOffsetMs = clockOffsetMs;
      });
    };
    measureClock();
    const clockTimer = window.setInterval(measureClock, 5000);
    socket.on("game:state", accept);
    socket.on("connect", sync);
    return () => { window.clearInterval(clockTimer); socket.off("game:state", accept); socket.off("connect", sync); };
  }, [roomCode]);

  const move = useCallback((x: number, y: number) => getSocket().emit("airhockey:move", { x, y }), []);
  const newGame = useCallback(() => getSocket().emit("airhockey:newGame"), []);
  return { stateRef, meta, move, newGame };
}
