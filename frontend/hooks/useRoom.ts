"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getPlayerId } from "@/lib/playerId";
import { GameId, Player, RoomSnapshot } from "@/lib/types";

interface CreateOrJoinResult {
  ok: boolean;
  room?: RoomSnapshot;
  player?: Player;
  error?: string;
}

export function useRoom() {
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  // A identidade de "quem sou eu" agora é o id persistente do navegador, não
  // mais o socket.id (que mudava a cada reconexão e fazia a UI achar que
  // você tinha virado outra pessoa).
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

  const createRoom = useCallback((gameId: GameId, playerName: string) => {
    setLoading(true);
    setError(null);
    return new Promise<CreateOrJoinResult>((resolve) => {
      getSocket().emit(
        "room:create",
        { gameId, playerName, playerId: getPlayerId() },
        (res: CreateOrJoinResult) => {
          setLoading(false);
          if (res.ok && res.room) setRoom(res.room);
          else setError(res.error || "Não foi possível criar a sala.");
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
          if (res.ok && res.room) setRoom(res.room);
          else setError(res.error || "Não foi possível entrar na sala.");
          resolve(res);
        }
      );
    });
  }, []);

  const leaveRoom = useCallback(() => {
    getSocket().emit("room:leave");
    setRoom(null);
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

  return { room, selfId, error, loading, createRoom, joinRoom, leaveRoom, startGame, setConfig };
}
