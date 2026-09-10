import { GameId, RoomMode } from "../types";
import { Room } from "./Room";
import { PERSISTENT_DUO_ROOM_CODE } from "./persistentDuo";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem O/0/I/1 para evitar confusão

function generateCode(length = 5): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  /** `gameId` só deve vir preenchido para salas Solo (que já nascem com o
   *  jogo escolhido). Uma sala Duo sempre nasce sem jogo (lobby) — o jogo é
   *  escolhido depois, dentro da sala, via `room:selectGame`. */
  createRoom(roomMode: RoomMode, gameId: GameId | null = null): Room {
    let code = generateCode();
    while (this.rooms.has(code)) {
      code = generateCode();
    }
    const room = new Room(code, roomMode, gameId);
    this.rooms.set(code, room);
    return room;
  }

  /** A instância pode ser limpa quando vazia; o identificador lógico é sempre
   * o mesmo e a sala é recriada automaticamente na próxima entrada. */
  getOrCreatePersistentDuoRoom(): Room {
    const existing = this.rooms.get(PERSISTENT_DUO_ROOM_CODE);
    if (existing) return existing;
    const room = new Room(PERSISTENT_DUO_ROOM_CODE, "duo", null, "persistent-duo");
    this.rooms.set(PERSISTENT_DUO_ROOM_CODE, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  /** Usada pelo relógio do servidor do Quiz para varrer salas ativas em busca de timeouts. */
  getAllRooms(): Room[] {
    return [...this.rooms.values()];
  }

  removeRoom(code: string) {
    this.rooms.delete(code.toUpperCase());
  }

  /** Limpa salas vazias periodicamente para não acumular memória. */
  sweepEmptyRooms() {
    for (const [code, room] of this.rooms) {
      const isStale = room.isEmpty() && Date.now() - room.createdAt > 1000 * 60 * 30;
      if (isStale) this.rooms.delete(code);
    }
  }
}
