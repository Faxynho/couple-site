"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getPlayerId } from "@/lib/playerId";
import { clearStoredRoomCode, setStoredRoomCode } from "@/lib/roomSession";
import { GameId, RoomSnapshot } from "@/lib/types";

interface AckResult {
  ok: boolean;
  error?: string;
}

interface SyncResult {
  ok: boolean;
  room?: RoomSnapshot;
  gameState?: unknown;
  error?: string;
}

/**
 * Sincroniza a sala ao montar QUALQUER tela que dependa dela — lobby de
 * escolha de jogo, configuração ou partida em andamento — e sempre que o
 * WebSocket reconectar. Substitui o antigo `useGameRoom` (que só cobria a
 * tela de jogo): agora a mesma resiliência a refresh/queda de conexão vale
 * também para a sala de espera/configuração, então ninguém "cai da sessão"
 * independente de em qual etapa da sala Duo estava.
 *
 * Também expõe as ações da sala: trocar de jogo, voltar (configuração ou
 * escolha de jogo), expulsar o convidado, sortear a sequência sugerida — e
 * escuta `room:kicked` para tirar o jogador expulso da tela.
 */
export function useRoomSession(code: string) {
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const selfId = useRef<string | null>(null);
  if (selfId.current === null) selfId.current = getPlayerId() || null;
  const [notFound, setNotFound] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const sync = () => {
      socket.emit("room:sync", { code, playerId: getPlayerId() }, (res: SyncResult) => {
        if (res.ok && res.room) {
          setRoom(res.room);
          setNotFound(false);
          if (res.room.roomMode === "duo") setStoredRoomCode(res.room.code);
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
    const onKicked = (payload: { code: string }) => {
      if (payload.code === code) {
        setKicked(true);
        clearStoredRoomCode();
      }
    };

    socket.on("room:update", onRoomUpdate);
    socket.on("connect", onConnect);
    socket.on("room:kicked", onKicked);

    return () => {
      socket.off("room:update", onRoomUpdate);
      socket.off("connect", onConnect);
      socket.off("room:kicked", onKicked);
    };
  }, [code]);

  /** Só o host chama isso — escolhe (ou troca) o jogo ativo da sala. */
  const selectGame = useCallback((gameId: GameId) => {
    getSocket().emit("room:selectGame", { gameId });
  }, []);

  /** Só o host chama isso — volta da partida atual para a configuração do
   *  mesmo jogo (para trocar o modo, por exemplo), sem sair da sala. */
  const backToConfig = useCallback(() => {
    getSocket().emit("room:backToConfig");
  }, []);

  /** Só o host chama isso — volta mais um passo, para a escolha de jogo. */
  const backToGameSelect = useCallback(() => {
    getSocket().emit("room:backToGameSelect");
  }, []);

  /** Só o host chama isso — atualiza a configuração pendente do jogo escolhido. */
  const setConfig = useCallback(
    (payload: {
      imageId?: string;
      difficulty?: string;
      imageWidth?: number;
      imageHeight?: number;
      colorMode?: string;
      seerId?: string | null;
      matchMode?: string;
      whoamiCategory?: string;
      chessPinkPlayerId?: string | null;
      rpgAppearance?: "man" | "woman";
      boardRacePawnColor?: "blue" | "pink";
    }) => {
      getSocket().emit("room:setConfig", payload);
    },
    []
  );

  const setBoardRacePawnColor = useCallback((color: "blue" | "pink") => {
    getSocket().emit("room:setBoardRacePawn", { color });
  }, []);

  const startGame = useCallback(() => {
    return new Promise<AckResult>((resolve) => {
      getSocket().emit("game:start", {}, (res: AckResult) => {
        if (!res.ok) setError(res.error || "Não foi possível iniciar o jogo.");
        resolve(res);
      });
    });
  }, []);

  /** Só o host chama isso — remove o convidado da sala definitivamente. */
  const kickPlayer = useCallback((targetPlayerId: string) => {
    getSocket().emit("room:kick", { targetPlayerId });
  }, []);

  /** Só o host chama isso — sorteia uma nova ordem para a sugestão de sequência. */
  const shuffleSequence = useCallback(() => {
    getSocket().emit("room:shuffleSequence");
  }, []);

  const leaveRoom = useCallback(() => {
    getSocket().emit("room:leave");
    clearStoredRoomCode();
  }, []);

  return {
    room,
    selfId: selfId.current,
    notFound,
    kicked,
    error,
    selectGame,
    backToConfig,
    backToGameSelect,
    setConfig,
    setBoardRacePawnColor,
    startGame,
    kickPlayer,
    shuffleSequence,
    leaveRoom,
  };
}
