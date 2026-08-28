"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getPlayerId } from "@/lib/playerId";
import { PuzzleState } from "@/lib/types";
import { playSoundEffect } from "@/lib/sound";

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
        if (groupCount < prevGroupCount.current) playSoundEffect("puzzleSnap");
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
    const sync = () => {
      socket.emit("room:sync", { code: roomCode, playerId: getPlayerId() }, (res: { ok: boolean; gameState?: PuzzleState }) => {
        if (res.ok && res.gameState) {
          prevGroupCount.current = Object.keys(res.gameState.groups).length;
          applyState(res.gameState);
        }
      });
    };

    sync();

    const onState = (next: PuzzleState | null) => applyState(next);
    const onDragRelay = (payload: { groupId: string; x: number; y: number }) => {
      setRemoteDrags((prev) => ({ ...prev, [payload.groupId]: { x: payload.x, y: payload.y } }));
    };

    socket.on("game:state", onState);
    socket.on("game:dragRelay", onDragRelay);
    socket.on("connect", sync);
    return () => {
      socket.off("game:state", onState);
      socket.off("game:dragRelay", onDragRelay);
      socket.off("connect", sync);
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
