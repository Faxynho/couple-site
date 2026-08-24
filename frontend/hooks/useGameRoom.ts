"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getPlayerId } from "@/lib/playerId";
import { RoomSnapshot } from "@/lib/types";

interface SyncResult {
  ok: boolean;
  room?: RoomSnapshot;
  gameState?: unknown;
  error?: string;
}

/** Sincroniza a sala ao montar a tela do jogo (necessário após navegar da
 *  sala de espera) E sempre que o WebSocket reconectar — é essa segunda
 *  parte que faltava: sem ela, uma queda de conexão no meio da partida
 *  (comum no celular) deixava o jogador "fantasma" para o servidor, com a
 *  tela parecendo travar numa pergunta antiga ou mostrando a sala vazia. */
export function useGameRoom(code: string) {
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  // Identidade estável do navegador — não é mais o socket.id, que mudava a
  // cada reconexão e fazia a UI "perder" quem era o próprio jogador.
  const selfId = useRef<string | null>(null);
  if (selfId.current === null) selfId.current = getPlayerId() || null;
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const sync = () => {
      socket.emit("room:sync", { code, playerId: getPlayerId() }, (res: SyncResult) => {
        if (res.ok && res.room) {
          setRoom(res.room);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      });
    };

    sync();

    const onRoomUpdate = (snapshot: RoomSnapshot) => {
      if (snapshot.code === code) setRoom(snapshot);
    };
    // "connect" dispara na conexão inicial E em toda reconexão automática do
    // socket.io-client — refazer o sync aqui é o que re-associa esta sessão
    // (com um socket.id novo) à identidade persistente do jogador no servidor.
    const onConnect = () => sync();

    socket.on("room:update", onRoomUpdate);
    socket.on("connect", onConnect);

    return () => {
      socket.off("room:update", onRoomUpdate);
      socket.off("connect", onConnect);
    };
  }, [code]);

  return { room, selfId: selfId.current, notFound };
}
