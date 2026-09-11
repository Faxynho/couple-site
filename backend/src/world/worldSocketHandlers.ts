import { Server, Socket } from "socket.io";
import { AccountId } from "../accounts/types";
import { RoomManager } from "../rooms/RoomManager";
import { PERSISTENT_DUO_ROOM_CODE } from "../rooms/persistentDuo";
import { clampWorldPosition, isWorldDecorationType, isWorldDirection, isWorldScene, WORLD_MAX_SPEED_PX_PER_SECOND, WORLD_SCENE_RULES, WORLD_TILE_SIZE } from "./worldConfig";
import { WORLD_ID, WorldPlayerState } from "./types";
import { worldStore } from "./WorldStore";

const WORLD_LIVE_ROOM = `world:${WORLD_ID}:live`;

interface WorldSocketData {
  roomCode?: string;
  playerId?: string;
  playerName?: string;
  accountId?: AccountId;
}

type WorldSocket = Socket<any, any, any, WorldSocketData>;
type Ack = (response: Record<string, unknown>) => void;

const liveSockets = new Map<AccountId, Set<string>>();
const livePlayers = new Map<AccountId, WorldPlayerState>();

function validMember(socket: WorldSocket): socket is WorldSocket & { data: WorldSocketData & { accountId: AccountId; playerId: AccountId; roomCode: string } } {
  const accountId = socket.data.accountId;
  return (accountId === "andre" || accountId === "flavia") && socket.data.playerId === accountId && socket.data.roomCode === PERSISTENT_DUO_ROOM_CODE;
}

function playersSnapshot() {
  return [...livePlayers.values()].map((state) => ({ ...state }));
}

function addLiveSocket(accountId: AccountId, socketId: string) {
  const ids = liveSockets.get(accountId) ?? new Set<string>();
  ids.add(socketId);
  liveSockets.set(accountId, ids);
}

function removeLiveSocket(io: Server, socket: WorldSocket, roomManager: RoomManager, returnToLobby: boolean) {
  const accountId = socket.data.accountId;
  if (!accountId) return;
  const ids = liveSockets.get(accountId);
  if (!ids?.delete(socket.id)) return;
  socket.leave(WORLD_LIVE_ROOM);
  if (ids.size === 0) {
    liveSockets.delete(accountId);
    livePlayers.delete(accountId);
  }
  if (returnToLobby && socket.data.roomCode === PERSISTENT_DUO_ROOM_CODE && socket.data.playerId === accountId) {
    const room = roomManager.getRoom(PERSISTENT_DUO_ROOM_CODE);
    room?.setPersistentPresence(accountId, socket.id, "lobby");
    if (room) io.to(room.code).emit("room:update", room.toSnapshot());
  }
  io.to(WORLD_LIVE_ROOM).emit("world:players", playersSnapshot());
}

function constrainMovement(previous: WorldPlayerState, x: number, y: number, now: number) {
  const requested = clampWorldPosition(previous.scene, x, y);
  const elapsedSeconds = Math.max(0.016, Math.min(1, (now - previous.updatedAt) / 1000));
  const allowance = WORLD_MAX_SPEED_PX_PER_SECOND * elapsedSeconds + 48;
  const dx = requested.x - previous.x;
  const dy = requested.y - previous.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= allowance || distance === 0) return requested;
  const ratio = allowance / distance;
  return { x: previous.x + dx * ratio, y: previous.y + dy * ratio };
}

export function registerWorldSocketHandlers(io: Server, socket: WorldSocket, roomManager: RoomManager) {
  socket.on("world:join", (_payload: unknown, callback?: Ack) => {
    if (!validMember(socket)) {
      callback?.({ ok: false, error: "Nosso Mundo pertence apenas às contas André e Flávia no lobby persistente." });
      return;
    }
    const accountId = socket.data.accountId;
    const room = roomManager.getRoom(PERSISTENT_DUO_ROOM_CODE);
    if (room?.status === "playing" || room?.status === "finished") {
      callback?.({ ok: false, error: "Volte ao lobby do minijogo antes de entrar no Nosso Mundo." });
      return;
    }
    const state = worldStore.getPlayer(accountId);
    addLiveSocket(accountId, socket.id);
    livePlayers.set(accountId, state);
    socket.join(WORLD_LIVE_ROOM);

    room?.setPersistentPresence(accountId, socket.id, "world");
    if (room) io.to(room.code).emit("room:update", room.toSnapshot());

    callback?.({
      ok: true,
      snapshot: { worldId: WORLD_ID, players: playersSnapshot(), decorations: worldStore.getDecorations() },
    });
    io.to(WORLD_LIVE_ROOM).emit("world:players", playersSnapshot());
  });

  socket.on("world:move", (payload: unknown) => {
    if (!validMember(socket) || !liveSockets.get(socket.data.accountId)?.has(socket.id) || !payload || typeof payload !== "object") return;
    const input = payload as Record<string, unknown>;
    const previous = livePlayers.get(socket.data.accountId) ?? worldStore.getPlayer(socket.data.accountId);
    if (!isWorldScene(input.scene) || input.scene !== previous.scene || !isWorldDirection(input.direction) || !Number.isFinite(input.x) || !Number.isFinite(input.y)) return;
    const now = Date.now();
    const position = constrainMovement(previous, Number(input.x), Number(input.y), now);
    const state = worldStore.setPlayer(socket.data.accountId, {
      scene: previous.scene,
      x: position.x,
      y: position.y,
      direction: input.direction,
      moving: input.moving === true,
      skinId: previous.skinId,
    });
    livePlayers.set(socket.data.accountId, state);
    socket.to(WORLD_LIVE_ROOM).emit("world:playerMoved", state);
  });

  socket.on("world:changeScene", (payload: unknown, callback?: Ack) => {
    if (!validMember(socket) || !liveSockets.get(socket.data.accountId)?.has(socket.id) || !payload || typeof payload !== "object") {
      callback?.({ ok: false, error: "Sessão do mundo inválida." });
      return;
    }
    const target = (payload as { scene?: unknown }).scene;
    const previous = livePlayers.get(socket.data.accountId) ?? worldStore.getPlayer(socket.data.accountId);
    if (!isWorldScene(target) || target === previous.scene) {
      callback?.({ ok: false, error: "Destino inválido." });
      return;
    }
    const spawn = target === "house-interior"
      ? WORLD_SCENE_RULES["house-interior"].spawn
      : { x: 30 * WORLD_TILE_SIZE, y: 15 * WORLD_TILE_SIZE };
    const state = worldStore.changeScene(socket.data.accountId, target, spawn.x, spawn.y);
    livePlayers.set(socket.data.accountId, state);
    callback?.({ ok: true, player: state });
    io.to(WORLD_LIVE_ROOM).emit("world:playerMoved", state);
  });

  socket.on("world:decorationPlace", (payload: unknown, callback?: Ack) => {
    if (!validMember(socket) || !liveSockets.get(socket.data.accountId)?.has(socket.id) || !payload || typeof payload !== "object") {
      callback?.({ ok: false, error: "Sessão do mundo inválida." });
      return;
    }
    const input = payload as Record<string, unknown>;
    if (!isWorldDecorationType(input.type) || !isWorldScene(input.scene) || !Number.isInteger(input.gridX) || !Number.isInteger(input.gridY)) {
      callback?.({ ok: false, error: "Decoração inválida." });
      return;
    }
    const decoration = worldStore.placeDecoration(socket.data.accountId, { type: input.type, scene: input.scene, gridX: Number(input.gridX), gridY: Number(input.gridY) });
    if (!decoration) { callback?.({ ok: false, error: "Esse espaço não está livre para decorar." }); return; }
    callback?.({ ok: true, decoration });
    io.to(WORLD_LIVE_ROOM).emit("world:decorations", worldStore.getDecorations());
  });

  socket.on("world:decorationMove", (payload: unknown, callback?: Ack) => {
    if (!validMember(socket) || !liveSockets.get(socket.data.accountId)?.has(socket.id) || !payload || typeof payload !== "object") {
      callback?.({ ok: false, error: "Sessão do mundo inválida." });
      return;
    }
    const input = payload as Record<string, unknown>;
    if (typeof input.id !== "string" || !isWorldScene(input.scene) || !Number.isInteger(input.gridX) || !Number.isInteger(input.gridY)) {
      callback?.({ ok: false, error: "Movimento inválido." });
      return;
    }
    const decoration = worldStore.moveDecoration(input.id, input.scene, Number(input.gridX), Number(input.gridY));
    if (!decoration) { callback?.({ ok: false, error: "O objeto foi removido ou o novo espaço está ocupado." }); return; }
    callback?.({ ok: true, decoration });
    io.to(WORLD_LIVE_ROOM).emit("world:decorations", worldStore.getDecorations());
  });

  socket.on("world:decorationRemove", (payload: unknown, callback?: Ack) => {
    if (!validMember(socket) || !liveSockets.get(socket.data.accountId)?.has(socket.id) || !payload || typeof payload !== "object" || typeof (payload as { id?: unknown }).id !== "string") {
      callback?.({ ok: false, error: "Remoção inválida." });
      return;
    }
    const removed = worldStore.removeDecoration((payload as { id: string }).id);
    if (!removed) { callback?.({ ok: false, error: "Esse objeto já não existe." }); return; }
    callback?.({ ok: true });
    io.to(WORLD_LIVE_ROOM).emit("world:decorations", worldStore.getDecorations());
  });

  socket.on("world:leave", () => removeLiveSocket(io, socket, roomManager, true));
  socket.on("disconnect", () => removeLiveSocket(io, socket, roomManager, false));
}
