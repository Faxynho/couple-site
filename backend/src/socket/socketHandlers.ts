import { Server, Socket } from "socket.io";
import { RoomManager } from "../rooms/RoomManager";
import { GameId } from "../types";
import { isValidImageId } from "../games/puzzle/puzzleImages";

interface SocketData {
  roomCode?: string;
  playerName?: string;
}

type AckCallback = (response: Record<string, unknown>) => void;


function broadcastRoom(io: Server, roomCode: string, roomManager: RoomManager) {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;
  io.to(roomCode).emit("room:update", room.toSnapshot());
}

function broadcastGameState(io: Server, roomCode: string, roomManager: RoomManager) {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;
  io.to(roomCode).emit("game:state", room.gameState);
}

export function registerSocketHandlers(io: Server, roomManager: RoomManager) {
  io.on("connection", (socket: Socket<any, any, any, SocketData>) => {
    socket.on("room:create", (payload: { gameId: GameId; playerName: string }, callback: AckCallback) => {
      const room = roomManager.createRoom(payload.gameId);
      const player = room.addPlayer(socket.id, payload.playerName);
      socket.data.roomCode = room.code;
      socket.data.playerName = payload.playerName;
      socket.join(room.code);
      callback?.({ ok: true, room: room.toSnapshot(), player });
    });

    socket.on("room:join", (payload: { code: string; playerName: string }, callback: AckCallback) => {
      const room = roomManager.getRoom(payload.code);
      if (!room) {
        callback?.({ ok: false, error: "Sala não encontrada. Confira o código." });
        return;
      }
      if (room.players.size >= room.maxPlayers && !room.players.has(socket.id)) {
        callback?.({ ok: false, error: "Essa sala já está completa." });
        return;
      }
      const player = room.addPlayer(socket.id, payload.playerName);
      socket.data.roomCode = room.code;
      socket.data.playerName = payload.playerName;
      socket.join(room.code);
      callback?.({ ok: true, room: room.toSnapshot(), player });
      broadcastRoom(io, room.code, roomManager);
      if (room.gameState) broadcastGameState(io, room.code, roomManager);
    });

    // Permite que uma página recém-montada (ex.: tela do jogo após navegação
    // ou um refresh) recupere o estado atual da sala em que o socket já está.
    socket.on("room:sync", (code: string, callback: AckCallback) => {
      const room = roomManager.getRoom(code);
      if (!room || !room.players.has(socket.id)) {
        callback?.({ ok: false, error: "Sala não encontrada para este jogador." });
        return;
      }
      socket.data.roomCode = room.code;
      socket.join(room.code);
      callback?.({ ok: true, room: room.toSnapshot(), gameState: room.gameState });
    });

    socket.on("room:leave", () => {
      const code = socket.data.roomCode;
      if (!code) return;
      const room = roomManager.getRoom(code);
      if (room) {
        room.markDisconnected(socket.id);
        socket.leave(code);
        broadcastRoom(io, code, roomManager);
      }
      socket.data.roomCode = undefined;
    });

    socket.on("game:start", (payload: { imageId?: string; gridSize?: number } | undefined, callback: AckCallback) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room) {
        callback?.({ ok: false, error: "Sala inválida." });
        return;
      }
      if (!room.bothConnected()) {
        callback?.({ ok: false, error: "Espere os dois jogadores entrarem na sala." });
        return;
      }
      const options = payload?.imageId && isValidImageId(payload.imageId) ? payload : undefined;
      room.startGame(options);
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
      callback?.({ ok: true });
    });

    socket.on("game:pickup", (payload: { groupId: string }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room) return;
      room.applyAction({ type: "pickup", groupId: payload.groupId }, socket.id);
      broadcastGameState(io, code!, roomManager);
    });

    // Repassado em tempo real para o outro jogador, sem validar nem persistir —
    // é isso que mantém o arrastar fluido (o servidor só grava o estado no "drop").
    socket.on("game:drag", (payload: { groupId: string; x: number; y: number }) => {
      const code = socket.data.roomCode;
      if (!code) return;
      socket.to(code).emit("game:dragRelay", {
        groupId: payload.groupId,
        x: payload.x,
        y: payload.y,
        playerId: socket.id,
      });
    });

    socket.on("game:drop", (payload: { groupId: string; x: number; y: number }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room) return;
      room.applyAction({ type: "drop", groupId: payload.groupId, x: payload.x, y: payload.y }, socket.id);
      broadcastGameState(io, code!, roomManager);
      if (room.status === "finished") {
        broadcastRoom(io, code!, roomManager);
      }
    });

    socket.on("game:reset", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room) return;
      room.resetGame();
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    socket.on("game:newImage", (payload: { imageId: string }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || !isValidImageId(payload.imageId)) return;
      room.startGame({ imageId: payload.imageId });
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    socket.on("disconnect", () => {
      const code = socket.data.roomCode;
      if (!code) return;
      const room = roomManager.getRoom(code);
      if (room) {
        room.markDisconnected(socket.id);
        broadcastRoom(io, code, roomManager);
      }
    });
  });
}
