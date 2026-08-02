"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { RoomSnapshot } from "@/lib/types";

interface SyncResult {
  ok: boolean;
  room?: RoomSnapshot;
  gameState?: unknown;
  error?: string;
}

/** Sincroniza a sala ao montar a tela do jogo (necessário após navegar da sala de espera). */
export function useGameRoom(code: string) {
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    setSelfId(socket.id ?? null);

    socket.emit("room:sync", code, (res: SyncResult) => {
      if (res.ok && res.room) {
        setRoom(res.room);
      } else {
        setNotFound(true);
      }
    });

    const onRoomUpdate = (snapshot: RoomSnapshot) => {
      if (snapshot.code === code) setRoom(snapshot);
    };
    const onConnect = () => setSelfId(socket.id ?? null);

    socket.on("room:update", onRoomUpdate);
    socket.on("connect", onConnect);

    return () => {
      socket.off("room:update", onRoomUpdate);
      socket.off("connect", onConnect);
    };
  }, [code]);

  return { room, selfId, notFound };
}
