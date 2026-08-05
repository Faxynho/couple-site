"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import { PuzzleState } from "@/lib/types";

/** Toca um "pop" curto e suave via Web Audio API — sem depender de arquivos de áudio. */
function playSnapSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
    osc.onended = () => ctx.close();
  } catch {
    // Áudio é apenas um extra decorativo; falhas silenciosas não devem afetar o jogo.
  }
}

interface RemoteDragPosition {
  x: number;
  y: number;
}

export function usePuzzle(roomCode: string) {
  const [state, setState] = useState<PuzzleState | null>(null);
  const [remoteDrags, setRemoteDrags] = useState<Record<string, RemoteDragPosition>>({});
  const prevGroupCount = useRef<number>(Infinity);

  useEffect(() => {
    const socket = getSocket();

    const applyState = (next: PuzzleState | null) => {
      if (next) {
        const groupCount = Object.keys(next.groups).length;
        if (groupCount < prevGroupCount.current) playSnapSound();
        prevGroupCount.current = groupCount;

        // Limpa posições de arrasto "remoto" de grupos que já não existem mais
        // (foram fundidos) ou que não estão mais sendo segurados por ninguém.
        setRemoteDrags((prev) => {
          let changed = false;
          const copy = { ...prev };
          for (const groupId of Object.keys(copy)) {
            const group = next.groups[groupId];
            if (!group || !group.heldBy) {
              delete copy[groupId];
              changed = true;
            }
          }
          return changed ? copy : prev;
        });
      }
      setState(next);
    };

    // Estado inicial (a página do jogo é montada depois que o game:start já foi disparado).
    socket.emit("room:sync", roomCode, (res: { ok: boolean; gameState?: PuzzleState }) => {
      if (res.ok && res.gameState) {
        prevGroupCount.current = Object.keys(res.gameState.groups).length;
        applyState(res.gameState);
      }
    });

    const onState = (next: PuzzleState | null) => applyState(next);
    const onDragRelay = (payload: { groupId: string; x: number; y: number }) => {
      setRemoteDrags((prev) => ({ ...prev, [payload.groupId]: { x: payload.x, y: payload.y } }));
    };

    socket.on("game:state", onState);
    socket.on("game:dragRelay", onDragRelay);
    return () => {
      socket.off("game:state", onState);
      socket.off("game:dragRelay", onDragRelay);
    };
  }, [roomCode]);

  const pickup = useCallback((groupId: string) => {
    getSocket().emit("game:pickup", { groupId });
  }, []);

  const drag = useCallback((groupId: string, x: number, y: number) => {
    getSocket().emit("game:drag", { groupId, x, y });
  }, []);

  const drop = useCallback((groupId: string, x: number, y: number) => {
    getSocket().emit("game:drop", { groupId, x, y });
    setRemoteDrags((prev) => {
      if (!(groupId in prev)) return prev;
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  }, []);

  const resetGame = useCallback(() => {
    getSocket().emit("game:reset");
  }, []);

  const newImage = useCallback((imageId: string, difficulty?: string, imageWidth?: number, imageHeight?: number) => {
    getSocket().emit("game:newImage", { imageId, difficulty, imageWidth, imageHeight });
  }, []);

  return { state, remoteDrags, pickup, drag, drop, resetGame, newImage };
}
