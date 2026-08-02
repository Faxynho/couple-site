import { GameId, Player, RoomSnapshot, RoomStatus } from "../types";
import { getGameEngine } from "../games/GameRegistry";

const PLAYER_COLORS = ["#F2A6B8", "#9FC3E8"]; // rosa e azul pastel, um por jogador

export class Room {
  readonly code: string;
  readonly gameId: GameId;
  readonly maxPlayers = 2;
  players: Map<string, Player> = new Map();
  status: RoomStatus = "waiting";
  gameState: unknown = null;
  createdAt = Date.now();

  constructor(code: string, gameId: GameId) {
    this.code = code;
    this.gameId = gameId;
  }

  addPlayer(id: string, name: string): Player | null {
    if (this.players.size >= this.maxPlayers && !this.players.has(id)) {
      return null;
    }
    const colorIndex = this.players.size % PLAYER_COLORS.length;
    const player: Player = {
      id,
      name: name?.trim() || `Jogador ${this.players.size + 1}`,
      color: PLAYER_COLORS[colorIndex],
      connected: true,
    };
    this.players.set(id, player);
    this.status = this.players.size === this.maxPlayers ? "ready" : "waiting";
    return player;
  }

  markDisconnected(id: string) {
    const player = this.players.get(id);
    if (player) {
      player.connected = false;
      if (this.status === "playing" || this.status === "ready") {
        this.status = "waiting";
      }
    }
    if (this.gameState) {
      const engine = getGameEngine(this.gameId);
      if (engine.releasePlayer) {
        this.gameState = engine.releasePlayer(this.gameState, id);
      }
    }
  }

  isEmpty(): boolean {
    return [...this.players.values()].every((p) => !p.connected);
  }

  bothConnected(): boolean {
    return this.players.size === this.maxPlayers && [...this.players.values()].every((p) => p.connected);
  }

  startGame(options?: Record<string, unknown>) {
    const engine = getGameEngine(this.gameId);
    this.gameState = engine.createInitialState(options);
    this.status = "playing";
  }

  resetGame() {
    const engine = getGameEngine(this.gameId);
    if (this.gameState) {
      this.gameState = engine.reset(this.gameState);
      this.status = "playing";
    }
  }

  applyAction(action: unknown, playerId: string) {
    const engine = getGameEngine(this.gameId);
    if (!this.gameState) return;
    this.gameState = engine.applyAction(this.gameState, action, playerId);
    if (engine.isSolved(this.gameState)) {
      this.status = "finished";
    }
  }

  toSnapshot(): RoomSnapshot {
    return {
      code: this.code,
      gameId: this.gameId,
      status: this.status,
      players: [...this.players.values()],
      maxPlayers: this.maxPlayers,
    };
  }
}
