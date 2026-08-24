"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getPlayerId } from "@/lib/playerId";
import { ColorMemoryState } from "@/lib/colorTypes";

export interface LiveColorPreview {
  h: number;
  s: number;
  v: number;
}

export function useColorGame(roomCode: string) {
  const [state, setState] = useState<ColorMemoryState | null>(null);
  const [livePreview, setLivePreview] = useState<LiveColorPreview | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const sync = () => {
      socket.emit(
        "room:sync",
        { code: roomCode, playerId: getPlayerId() },
        (res: { ok: boolean; gameState?: ColorMemoryState }) => {
          if (res.ok && res.gameState) setState(res.gameState);
        }
      );
    };

    sync();

    const onState = (next: ColorMemoryState | null) => {
      setState(next);
      // Uma vez que a rodada muda (ou termina), o preview ao vivo antigo não
      // faz mais sentido — evita mostrar a última cor da rodada anterior.
      setLivePreview(null);
    };
    const onLivePreview = (preview: LiveColorPreview) => setLivePreview(preview);

    socket.on("game:state", onState);
    socket.on("colors:livePreview", onLivePreview);
    socket.on("connect", sync);
    return () => {
      socket.off("game:state", onState);
      socket.off("colors:livePreview", onLivePreview);
      socket.off("connect", sync);
    };
  }, [roomCode]);

  const submitGuess = useCallback((round: number, h: number, s: number, v: number) => {
    getSocket().emit("colors:submitGuess", { round, h, s, v });
  }, []);

  const nextRound = useCallback(() => {
    getSocket().emit("colors:nextRound");
  }, []);

  const newGame = useCallback((difficulty?: string) => {
    getSocket().emit("colors:newGame", { difficulty });
  }, []);

  // Emite a posição atual dos sliders para quem está vendo a cor acompanhar
  // em tempo real — limitado a ~12x/s para não sobrecarregar o socket.
  const lastSentRef = useRef(0);
  const sendLivePreview = useCallback((h: number, s: number, v: number) => {
    const now = Date.now();
    if (now - lastSentRef.current < 80) return;
    lastSentRef.current = now;
    getSocket().emit("colors:liveGuess", { h, s, v });
  }, []);

  return { state, livePreview, submitGuess, nextRound, newGame, sendLivePreview };
}

