"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { GameId, Player, RoomSnapshot } from "@/lib/types";

interface CreateOrJoinResult {
  ok: boolean;
  room?: RoomSnapshot;
  player?: Player;
  error?: string;
}

export function useRoom() {
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    setSelfId(socket.id ?? null);

    const onConnect = () => setSelfId(socket.id ?? null);
    const onRoomUpdate = (snapshot: RoomSnapshot) => setRoom(snapshot);

    socket.on("connect", onConnect);
    socket.on("room:update", onRoomUpdate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("room:update", onRoomUpdate);
    };
  }, []);

  const createRoom = useCallback((gameId: GameId, playerName: string) => {
    setLoading(true);
    setError(null);
    return new Promise<CreateOrJoinResult>((resolve) => {
      getSocket().emit("room:create", { gameId, playerName }, (res: CreateOrJoinResult) => {
        setLoading(false);
        if (res.ok && res.room) setRoom(res.room);
        else setError(res.error || "Não foi possível criar a sala.");
        resolve(res);
      });
    });
  }, []);

  const joinRoom = useCallback((code: string, playerName: string) => {
    setLoading(true);
    setError(null);
    return new Promise<CreateOrJoinResult>((resolve) => {
      getSocket().emit("room:join", { code: code.toUpperCase(), playerName }, (res: CreateOrJoinResult) => {
        setLoading(false);
        if (res.ok && res.room) setRoom(res.room);
        else setError(res.error || "Não foi possível entrar na sala.");
        resolve(res);
      });
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
    }) => {
      getSocket().emit("room:setConfig", payload);
    },
    []
  );

  return { room, selfId, error, loading, createRoom, joinRoom, leaveRoom, startGame, setConfig };
}
