"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getPlayerId } from "@/lib/playerId";
import { setStoredRoomCode } from "@/lib/roomSession";
import { GameId, Player, RoomMode, RoomSnapshot } from "@/lib/types";

interface CreateOrJoinResult {
  ok: boolean;
  room?: RoomSnapshot;
  player?: Player;
  error?: string;
}

/**
 * Hook de ENTRADA — cria uma sala Solo (já com o jogo escolhido) ou uma sala
 * Duo (sempre sem jogo, no lobby) e, no caso Solo, também permite configurar
 * e iniciar em seguida. Depois do create/join a página redireciona para
 * `/sala/[code]` (Duo) ou `/game/[gameId]/[code]` (Solo), onde quem cuida da
 * sincronização contínua é o `useRoomSession`.
 */
export function useRoom() {
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [selfId] = useState<string | null>(() => getPlayerId() || null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const onRoomUpdate = (snapshot: RoomSnapshot) => setRoom(snapshot);
    socket.on("room:update", onRoomUpdate);
    return () => {
      socket.off("room:update", onRoomUpdate);
    };
  }, []);

  const createRoom = useCallback((roomMode: RoomMode, playerName: string, gameId?: GameId) => {
    setLoading(true);
    setError(null);
    return new Promise<CreateOrJoinResult>((resolve) => {
      getSocket().emit(
        "room:create",
        { roomMode, gameId, playerName, playerId: getPlayerId() },
        (res: CreateOrJoinResult) => {
          setLoading(false);
          if (res.ok && res.room) {
            setRoom(res.room);
            if (res.room.roomMode === "duo") setStoredRoomCode(res.room.code);
          } else {
            setError(res.error || "Não foi possível criar a sala.");
          }
          resolve(res);
        }
      );
    });
  }, []);

  const joinRoom = useCallback((code: string, playerName: string) => {
    setLoading(true);
    setError(null);
    return new Promise<CreateOrJoinResult>((resolve) => {
      getSocket().emit(
        "room:join",
        { code: code.toUpperCase(), playerName, playerId: getPlayerId() },
        (res: CreateOrJoinResult) => {
          setLoading(false);
          if (res.ok && res.room) {
            setRoom(res.room);
            if (res.room.roomMode === "duo") setStoredRoomCode(res.room.code);
          } else {
            setError(res.error || "Não foi possível entrar na sala.");
          }
          resolve(res);
        }
      );
    });
  }, []);

  const startGame = useCallback(() => {
    return new Promise<CreateOrJoinResult>((resolve) => {
      getSocket().emit("game:start", {}, (res: CreateOrJoinResult) => {
        if (!res.ok) setError(res.error || "Não foi possível iniciar o jogo.");
        resolve(res);
      });
    });
  }, []);

  /** Só o host deve chamar isso — atualiza a configuração da sala em tempo
   *  real para o outro jogador (a UI já deve esconder isso de quem não é host). */
  const setConfig = useCallback(
    (payload: {
      imageId?: string;
      difficulty?: string;
      imageWidth?: number;
      imageHeight?: number;
      colorMode?: string;
      seerId?: string | null;
      matchMode?: string;
    }) => {
      getSocket().emit("room:setConfig", payload);
    },
    []
  );

  return { room, selfId, error, loading, createRoom, joinRoom, startGame, setConfig };
}
