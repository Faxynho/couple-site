import { GameId, Player, RoomSnapshot, RoomStatus } from "../types";
import { getGameEngine } from "../games/GameRegistry";

const PLAYER_COLORS = ["#F2A6B8", "#9FC3E8"]; // rosa e azul pastel, um por jogador
const DEFAULT_PENDING_DIFFICULTY = "medium";

export class Room {
  readonly code: string;
  readonly gameId: GameId;
  readonly maxPlayers = 2;
  players: Map<string, Player> = new Map();
  status: RoomStatus = "waiting";
  gameState: unknown = null;
  createdAt = Date.now();

  /** O primeiro jogador a entrar vira o host — só ele configura e inicia a partida. */
  hostId: string | null = null;

  /** Configuração da partida escolhida pelo host, sincronizada em tempo real
   *  com o outro jogador enquanto ambos estão na sala de espera. */
  pendingImageId: string | null = null;
  pendingImageWidth: number | null = null;
  pendingImageHeight: number | null = null;
  pendingDifficulty = DEFAULT_PENDING_DIFFICULTY;
  /** Específico da Memória de Cores. */
  pendingColorMode = "competitive";
  pendingSeerId: string | null = null;
  /** Específico do Palavras Cruzadas e do Caça-Palavras: "together" ou "duel". */
  pendingMatchMode = "together";

  constructor(code: string, gameId: GameId) {
    this.code = code;
    this.gameId = gameId;
  }

  addPlayer(id: string, name: string): Player | null {
    if (this.players.size >= this.maxPlayers && !this.players.has(id)) {
      return null;
    }
    if (this.hostId === null) {
      this.hostId = id;
    }
    const colorIndex = this.players.size % PLAYER_COLORS.length;
    const player: Player = {
      id,
      name: name?.trim() || `Jogador ${this.players.size + 1}`,
      color: PLAYER_COLORS[colorIndex],
      connected: true,
    };
    this.players.set(id, player);
    // Não regride o status se o jogo já começou (ex.: um amigo entra depois
    // que o host já iniciou sozinho) — só ajusta waiting/ready antes disso.
    if (this.status === "waiting" || this.status === "ready") {
      this.status = this.players.size === this.maxPlayers ? "ready" : "waiting";
    }
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

  isHost(playerId: string): boolean {
    return this.hostId === playerId;
  }

  /** Só o host chama isso — atualiza a configuração pendente e é transmitido via room:update. */
  setPendingConfig(config: {
    imageId?: string;
    imageWidth?: number;
    imageHeight?: number;
    difficulty?: string;
    colorMode?: string;
    seerId?: string | null;
    matchMode?: string;
  }) {
    if (config.imageId !== undefined) this.pendingImageId = config.imageId;
    if (config.imageWidth !== undefined) this.pendingImageWidth = config.imageWidth;
    if (config.imageHeight !== undefined) this.pendingImageHeight = config.imageHeight;
    if (config.difficulty !== undefined) this.pendingDifficulty = config.difficulty;
    if (config.colorMode !== undefined) this.pendingColorMode = config.colorMode;
    if (config.seerId !== undefined) this.pendingSeerId = config.seerId;
    if (config.matchMode !== undefined) this.pendingMatchMode = config.matchMode;
  }

  startGame(overrides?: Record<string, unknown>) {
    const engine = getGameEngine(this.gameId);

    // Modo cooperativo da Memória de Cores exige dois jogadores com papéis
    // fixos; sem o segundo jogador conectado, cai automaticamente para o
    // modo competitivo (que já funciona sozinho).
    const connectedIds = [...this.players.values()].filter((p) => p.connected).map((p) => p.id);
    let colorMode = this.pendingColorMode;
    let seerId: string | null = null;
    let guesserId: string | null = null;
    if (colorMode === "cooperative" && connectedIds.length >= 2) {
      seerId = this.pendingSeerId && connectedIds.includes(this.pendingSeerId) ? this.pendingSeerId : connectedIds[0];
      guesserId = connectedIds.find((id) => id !== seerId) ?? null;
    } else {
      colorMode = "competitive";
    }

    // Palavras Cruzadas e Caça-Palavras usam um modo genérico "together"/"duel"
    // (independente do `colorMode`, que é específico da Memória de Cores).
    const matchMode = this.gameId === "crossword" || this.gameId === "wordsearch" ? this.pendingMatchMode : undefined;

    const options = {
      imageId: this.pendingImageId ?? undefined,
      imageWidth: this.pendingImageWidth ?? undefined,
      imageHeight: this.pendingImageHeight ?? undefined,
      difficulty: this.pendingDifficulty,
      mode: matchMode ?? colorMode,
      seerId: seerId ?? undefined,
      guesserId: guesserId ?? undefined,
      // Fixado no início da partida — usado pelo Palavras Cruzadas/Caça-Palavras
      // para saber quantos jogadores precisam terminar antes de encerrar o duelo.
      playerIds: connectedIds,
      ...overrides,
    };
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
      hostId: this.hostId,
      pendingImageId: this.pendingImageId,
      pendingImageWidth: this.pendingImageWidth,
      pendingImageHeight: this.pendingImageHeight,
      pendingDifficulty: this.pendingDifficulty,
      pendingColorMode: this.pendingColorMode,
      pendingSeerId: this.pendingSeerId,
      pendingMatchMode: this.pendingMatchMode,
    };
  }
}
