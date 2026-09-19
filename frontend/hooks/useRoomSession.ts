"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getRoomPlayerId } from "@/lib/playerId";
import { getActiveAccountId } from "@/lib/accountSession";
import { clearStoredRoomCode, setStoredRoomCode } from "@/lib/roomSession";
import { GameId, PersistentDuoPresence, RoomSnapshot } from "@/lib/types";
import { isPersistentDuoRoomCode, rememberPersistentDuoMinigamesReturn } from "@/lib/persistentDuo";
import { usePathname } from "next/navigation";

interface AckResult {
  ok: boolean;
  error?: string;
  room?: RoomSnapshot;
}

interface SyncResult {
  ok: boolean;
  room?: RoomSnapshot;
  gameState?: unknown;
  error?: string;
}

const pendingLeaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

function cancelPendingLeave(code: string) {
  const timer = pendingLeaveTimers.get(code);
  if (timer) clearTimeout(timer);
  pendingLeaveTimers.delete(code);
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
export function useRoomSession(code: string, persistentPresence?: Exclude<PersistentDuoPresence, "offline">) {
  const pathname = usePathname();
  const resolvedPresence = persistentPresence ?? (pathname.startsWith("/game/") ? "minigame" : "lobby");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const selfId = useRef<string | null>(null);
  if (selfId.current === null) selfId.current = getRoomPlayerId(code) || null;
  const [notFound, setNotFound] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    cancelPendingLeave(code);

    const sync = () => {
      socket.emit("room:sync", {
        code,
        playerId: getRoomPlayerId(code),
        accountId: getActiveAccountId(),
        presence: resolvedPresence,
      }, (res: SyncResult) => {
        if (res.ok && res.room) {
          setRoom(res.room);
          setNotFound(false);
          if (res.room.roomMode === "duo" && res.room.roomKind !== "persistent-duo") setStoredRoomCode(res.room.code);
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
      if (isPersistentDuoRoomCode(code)) {
        const timer = setTimeout(() => {
          pendingLeaveTimers.delete(code);
          socket.emit("room:leave", { code });
        }, 250);
        pendingLeaveTimers.set(code, timer);
      }
    };
  }, [code, resolvedPresence]);

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
    rememberPersistentDuoMinigamesReturn(code);
    getSocket().emit("room:backToGameSelect");
  }, [code]);

  /** Só o host chama isso — atualiza a configuração pendente do jogo escolhido. */
  const setConfig = useCallback(
    (payload: {
      imageId?: string;
      difficulty?: string;
      drawGuessDuration?: string;
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

  const setPersistentPresence = useCallback((presence: Exclude<PersistentDuoPresence, "offline">) => {
    getSocket().emit("room:setPersistentPresence", { presence });
  }, []);

  const setPersistentDuoName = useCallback((displayName: string) => {
    return new Promise<AckResult>((resolve) => {
      getSocket().emit("room:setPersistentDuoName", { displayName }, (res: AckResult) => {
        if (!res.ok) setError(res.error || "Não foi possível salvar o nome do lobby.");
        resolve(res);
      });
    });
  }, []);

  const leaveRoom = useCallback(() => {
    cancelPendingLeave(code);
    getSocket().emit("room:leave", { code });
    clearStoredRoomCode();
  }, [code]);

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
    setPersistentPresence,
    setPersistentDuoName,
    leaveRoom,
  };
}
