import { ALL_GAME_IDS, GameId, PersistentDuoLobby, PersistentDuoPresence, Player, RoomKind, RoomMode, RoomSnapshot, RoomStatus } from "../types";
import { getGameEngine } from "../games/GameRegistry";
import { recordFinishedMatch } from "../accounts/gameResult";
import { PERSISTENT_DUO_ACCOUNT_IDS, isPersistentDuoAccountId, normalizePersistentDuoDisplayName, persistentDuoStore } from "./persistentDuo";

const PLAYER_COLORS = ["#F2A6B8", "#9FC3E8"]; // rosa e azul pastel, um por jogador
const DEFAULT_PENDING_DIFFICULTY = "medium";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class Room {
  readonly code: string;
  readonly roomMode: RoomMode;
  readonly roomKind: RoomKind;
  /** Jogo selecionado no momento — `null` só é possível numa sala Duo que
   *  ainda não escolheu o primeiro jogo (status "lobby"). Mutável: é isso que
   *  permite trocar de jogo sem sair da sala. */
  gameId: GameId | null;
  readonly maxPlayers: number;
  players: Map<string, Player> = new Map();
  status: RoomStatus;
  gameState: unknown = null;
  createdAt = Date.now();
  persistentDuoLobby: PersistentDuoLobby | null;

  /** Mapeia a identidade PERSISTENTE de cada jogador (Player.id, gerada uma
   *  vez pelo cliente e guardada no navegador) para o socket.id da conexão
   *  ATUAL desse jogador — que muda a cada reconexão de WebSocket (queda de
   *  wifi, app em segundo plano no celular, etc). É assim que sabemos para
   *  qual conexão enviar os eventos direcionados a um jogador específico. */
  private socketIds: Map<string, Set<string>> = new Map();
  private socketPresences: Map<string, Map<string, Exclude<PersistentDuoPresence, "offline">>> = new Map();

  /** O primeiro jogador a entrar vira o host — só ele configura, troca de
   *  jogo/modo, expulsa o convidado e inicia a partida. Se o host cair da
   *  conexão (ou sair de propósito) e o outro jogador ainda estiver
   *  conectado, a posição passa automaticamente para ele (ver markDisconnected). */
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
  /** Específico dos jogos com modo de partida (incluindo Termo em Duelo). */
  pendingMatchMode = "together";
  /** Categoria do Quem Sou Eu?; "all" mistura todas. */
  pendingWhoAmICategory = "all";
  /** Id do jogador que será Rosa no Xadrez Duo. Rosa equivale às brancas. */
  pendingChessPinkPlayerId: string | null = null;
  /** Aparência do host para o RPG; o outro humano recebe a oposta. */
  pendingRpgAppearance: "man" | "woman" = "man";
  private pendingRpgAppearancePlayerId: string | null = null;
  /** Escolha de peão da Corrida de Tabuleiro. No Duo as cores são opostas. */
  pendingBoardRacePawnColors: Record<string, "blue" | "pink"> = {};

  /** Sugestão de sequência de jogos (só relevante em salas Duo). */
  sequence: GameId[] = [];
  sequenceProgress: GameId[] = [];

  /** Evita registrar a mesma partida duas vezes nas estatísticas de conta —
   *  `isSolved` continua `true` em toda ação aplicada DEPOIS do fim do jogo
   *  (ex.: o vencedor de um duelo mexendo na própria grade enquanto espera o
   *  outro terminar), então sem esse guard `recordFinishedMatch` rodaria de
   *  novo a cada uma dessas ações. Zerado sempre que uma partida nova começa. */
  private statsRecordedForMatch = false;

  constructor(code: string, roomMode: RoomMode, gameId: GameId | null = null, roomKind: RoomKind = "standard") {
    this.code = code;
    this.roomMode = roomMode;
    this.roomKind = roomKind;
    this.maxPlayers = roomMode === "solo" ? 1 : 2;
    this.gameId = gameId;
    this.status = gameId ? "waiting" : "lobby";
    this.persistentDuoLobby = roomKind === "persistent-duo" ? persistentDuoStore.getLobby() : null;
    if (roomMode === "duo") {
      this.sequence = shuffle(ALL_GAME_IDS);
    }
  }

  addPlayer(id: string, name: string, accountId?: "andre" | "flavia"): Player | null {
    if (this.roomKind === "persistent-duo" && (!isPersistentDuoAccountId(accountId) || id !== accountId)) {
      return null;
    }
    // Mesma identidade persistente já presente na sala: é uma RECONEXÃO
    // (refresh, nova aba, ou o WebSocket caiu e reabriu com um socket.id
    // novo por baixo dos panos), não um terceiro jogador entrando — nunca
    // cria uma segunda entrada nem conta contra o limite de jogadores.
    const existing = this.players.get(id);
    if (existing) {
      existing.connected = true;
      if (name?.trim()) existing.name = name.trim();
      // Só atualiza se vier um valor — nunca "esquece" a conta numa
      // reconexão/room:sync que não manda esse campo.
      if (accountId) existing.accountId = accountId;
      if (this.status === "waiting" || this.status === "ready") {
        this.status = this.bothConnected() ? "ready" : "waiting";
      }
      return existing;
    }

    if (this.players.size >= this.maxPlayers) {
      return null;
    }
    if (this.roomKind === "standard" && this.hostId === null) {
      this.hostId = id;
    }
    const colorIndex = this.players.size % PLAYER_COLORS.length;
    const player: Player = {
      id,
      name: name?.trim() || `Jogador ${this.players.size + 1}`,
      color: PLAYER_COLORS[colorIndex],
      connected: true,
      accountId,
    };
    this.players.set(id, player);
    // Não regride o status se o jogo já começou (ex.: um amigo entra depois
    // que o host já iniciou sozinho) — só ajusta waiting/ready antes disso.
    if (this.status === "waiting" || this.status === "ready") {
      this.status = this.players.size === this.maxPlayers ? "ready" : "waiting";
    }
    return player;
  }

  /** Associa a identidade persistente de um jogador ao socket.id da conexão
   *  atual — chamado em todo room:create/room:join/room:sync bem-sucedido. */
  setSocketId(
    playerId: string,
    socketId: string,
    presence: Exclude<PersistentDuoPresence, "offline"> = "lobby"
  ) {
    const ids = this.socketIds.get(playerId) ?? new Set<string>();
    ids.add(socketId);
    this.socketIds.set(playerId, ids);
    if (this.roomKind === "persistent-duo") {
      const presences = this.socketPresences.get(playerId) ?? new Map();
      presences.set(socketId, presence);
      this.socketPresences.set(playerId, presences);
    }
  }

  /** socket.id atual de um jogador (para eventos direcionados a ele), ou
   *  undefined se ele nunca se conectou ou já foi substituído por uma
   *  reconexão mais nova. */
  getSocketId(playerId: string): string | undefined {
    return this.socketIds.get(playerId)?.values().next().value;
  }

  getSocketIds(playerId: string): string[] {
    return [...(this.socketIds.get(playerId) ?? [])];
  }

  setPersistentPresence(playerId: string, socketId: string, presence: Exclude<PersistentDuoPresence, "offline">) {
    if (this.roomKind !== "persistent-duo" || !this.socketIds.get(playerId)?.has(socketId)) return;
    const presences = this.socketPresences.get(playerId) ?? new Map();
    presences.set(socketId, presence);
    this.socketPresences.set(playerId, presences);
  }

  setAllConnectedPersistentPresence(presence: Exclude<PersistentDuoPresence, "offline">) {
    if (this.roomKind !== "persistent-duo") return;
    for (const [playerId, socketIds] of this.socketIds) {
      const presences = this.socketPresences.get(playerId) ?? new Map();
      for (const socketId of socketIds) presences.set(socketId, presence);
      this.socketPresences.set(playerId, presences);
    }
  }

  private getPersistentPresence(playerId: string): PersistentDuoPresence {
    const values = [...(this.socketPresences.get(playerId)?.values() ?? [])];
    if (values.includes("minigame")) return "minigame";
    if (values.includes("world")) return "world";
    if (values.includes("lobby")) return "lobby";
    return "offline";
  }

  getPersistentDuoPresence(): Record<"andre" | "flavia", PersistentDuoPresence> | null {
    if (this.roomKind !== "persistent-duo") return null;
    return {
      andre: this.getPersistentPresence("andre"),
      flavia: this.getPersistentPresence("flavia"),
    };
  }

  arePersistentDuoPlayersInLobby(): boolean {
    const presence = this.getPersistentDuoPresence();
    return Boolean(presence && PERSISTENT_DUO_ACCOUNT_IDS.every((id) => presence[id] === "lobby"));
  }

  setPersistentDuoDisplayName(value: unknown): string | null {
    if (this.roomKind !== "persistent-duo") return null;
    const displayName = normalizePersistentDuoDisplayName(value);
    if (!displayName) return null;
    this.persistentDuoLobby = { displayName: persistentDuoStore.setDisplayName(displayName) ?? displayName };
    return this.persistentDuoLobby.displayName;
  }

  /** Chamado tanto numa queda de conexão quanto numa saída deliberada
   *  (room:leave). Marca o jogador como desconectado e, se ele era o host,
   *  passa a posição para o outro jogador (se algum ainda estiver
   *  conectado) — assim a sala nunca fica "sem dono" e travada. */
  markDisconnected(id: string, socketId?: string) {
    if (socketId) {
      const ids = this.socketIds.get(id);
      ids?.delete(socketId);
      this.socketPresences.get(id)?.delete(socketId);
      if (ids && ids.size > 0) {
        const player = this.players.get(id);
        if (player) player.connected = true;
        return;
      }
    }
    this.socketIds.delete(id);
    this.socketPresences.delete(id);
    const player = this.players.get(id);
    if (player) {
      player.connected = false;
      // A Corrida de Tabuleiro pode ficar pausada naturalmente aguardando a
      // identidade persistente reconectar. Seu estado autoritativo permanece
      // jogável e o room:sync recoloca o mesmo jogador na partida.
      if ((this.status === "playing" && this.gameId !== "boardrace" && this.gameId !== "whoami" && this.gameId !== "casino") || this.status === "ready") {
        this.status = "waiting";
      }
    }
    if (this.gameState) {
      const engine = getGameEngine(this.gameId as GameId);
      if (engine.releasePlayer) {
        this.gameState = engine.releasePlayer(this.gameState, id);
      }
    }
    if (this.hostId === id) {
      const successor = [...this.players.values()].find((p) => p.id !== id && p.connected);
      if (successor) this.hostId = successor.id;
    }
  }

  /** Remove um jogador definitivamente da sala (usado só para expulsar o
   *  convidado) — diferente de markDisconnected, que mantém o lugar dele
   *  reservado para uma reconexão. Depois de expulso, o código da sala
   *  continua o mesmo, mas essa identidade específica não faz mais parte dela. */
  removePlayer(id: string) {
    this.players.delete(id);
    this.socketIds.delete(id);
    this.socketPresences.delete(id);
    if (this.hostId === id) {
      const successor = [...this.players.values()][0];
      this.hostId = successor?.id ?? null;
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

  canManage(playerId: string): boolean {
    return this.roomKind === "persistent-duo"
      ? this.players.has(playerId) && Boolean(this.players.get(playerId)?.connected)
      : this.isHost(playerId);
  }

  /** Configuração inicial de cada jogo ao ser selecionado — os valores de
   *  modo mudam conforme o tipo de sala: uma sala Solo já entra no único modo
   *  que faz sentido sozinho; uma sala Duo entra no modo cooperativo padrão
   *  (nunca em "solo"/"soloBot", que não fazem sentido com o convidado presente). */
  private defaultMatchModeFor(gameId: GameId): string {
    if (gameId === "whoami") return this.roomMode === "solo" ? "togetherHints" : "duelHints";
    if (gameId === "boardrace") return this.roomMode === "solo" ? "solo" : "duel";
    if (gameId === "casino") return this.roomMode === "solo" ? "soloBot" : "duel";
    if (gameId === "quiz" || gameId === "memory") return this.roomMode === "solo" ? "solo" : "together";
    if (gameId === "termo") return this.roomMode === "solo" ? "solo" : "duel";
    if (gameId === "airhockey") return this.roomMode === "solo" ? "solo" : "duel";
    if (gameId === "chess") return this.roomMode === "solo" ? "solo" : "duel";
    if (gameId === "rpg") return this.roomMode === "solo" ? "soloBot" : "1v1";
    return "together"; // crossword / wordsearch / sudoku — puzzle/colors ignoram este campo
  }

  /** Só o host chama isso (numa sala Duo) — troca o jogo ativo da sala sem
   *  sair dela, reiniciando a configuração pendente com os padrões daquele
   *  jogo e voltando para a tela de configuração (nunca inicia sozinho). */
  selectGame(gameId: GameId) {
    this.gameId = gameId;
    this.gameState = null;
    this.pendingImageId = null;
    this.pendingImageWidth = null;
    this.pendingImageHeight = null;
    this.pendingDifficulty = gameId === "termo" ? "one" : gameId === "whoami" ? "easy" : gameId === "casino" ? "normal" : DEFAULT_PENDING_DIFFICULTY;
    this.pendingColorMode = "competitive";
    this.pendingSeerId = null;
    this.pendingMatchMode = this.defaultMatchModeFor(gameId);
    this.pendingWhoAmICategory = "all";
    this.pendingChessPinkPlayerId = gameId === "chess" && this.roomMode === "duo"
      ? [...this.players.keys()][0] ?? null
      : null;
    this.pendingRpgAppearance = "man";
    this.pendingRpgAppearancePlayerId = null;
    this.pendingBoardRacePawnColors = {};
    this.status = this.players.size === this.maxPlayers ? "ready" : "waiting";
  }

  /** "Voltar" a partir do jogo em andamento (ou já terminado) para a tela de
   *  configuração do MESMO jogo — mantém dificuldade/modo já escolhidos, só
   *  descarta a partida atual, para trocar o modo (ex.: Juntos -> Duelo) sem
   *  sair da sala. */
  backToConfig() {
    if (!this.gameId) return;
    this.gameState = null;
    this.status = this.players.size === this.maxPlayers ? "ready" : "waiting";
    this.setAllConnectedPersistentPresence("lobby");
  }

  /** "Voltar" mais uma vez — sai da configuração/jogo atual e volta para a
   *  escolha de jogo (lobby da sala), sem tirar ninguém da sala. */
  backToGameSelect() {
    this.gameId = null;
    this.gameState = null;
    this.status = "lobby";
    this.setAllConnectedPersistentPresence("lobby");
  }

  /** Sorteia uma nova ordem para a sugestão de sequência de jogos e zera o
   *  progresso marcado — só faz sentido numa sala Duo. */
  shuffleSequence() {
    this.sequence = shuffle(ALL_GAME_IDS);
    this.sequenceProgress = [];
  }

  /** Marca um jogo como já jogado nesta rodada da sequência sugerida (chamado
   *  sempre que uma partida termina) — idempotente. */
  private markSequenceProgress(gameId: GameId) {
    if (this.roomMode !== "duo") return;
    if (!this.sequenceProgress.includes(gameId)) {
      this.sequenceProgress = [...this.sequenceProgress, gameId];
    }
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
    whoamiCategory?: string;
    chessPinkPlayerId?: string | null;
    rpgAppearance?: "man" | "woman";
    boardRacePawnColor?: "blue" | "pink";
  }, actorPlayerId?: string) {
    if (config.imageId !== undefined) this.pendingImageId = config.imageId;
    if (config.imageWidth !== undefined) this.pendingImageWidth = config.imageWidth;
    if (config.imageHeight !== undefined) this.pendingImageHeight = config.imageHeight;
    if (config.difficulty !== undefined) this.pendingDifficulty = config.difficulty;
    if (config.colorMode !== undefined) this.pendingColorMode = config.colorMode;
    if (config.seerId !== undefined) this.pendingSeerId = config.seerId;
    if (config.matchMode !== undefined) this.pendingMatchMode = config.matchMode;
    if (config.whoamiCategory !== undefined) this.pendingWhoAmICategory = config.whoamiCategory;
    if (config.chessPinkPlayerId !== undefined) this.pendingChessPinkPlayerId = config.chessPinkPlayerId;
    if (config.rpgAppearance !== undefined) {
      this.pendingRpgAppearance = config.rpgAppearance;
      if (this.roomKind === "persistent-duo" && actorPlayerId) this.pendingRpgAppearancePlayerId = actorPlayerId;
    }
    if (config.boardRacePawnColor !== undefined && this.hostId) this.setBoardRacePawnColor(this.hostId, config.boardRacePawnColor);
  }

  /** A escolha mais recente fica com quem a fez; o outro jogador recebe a cor
   * oposta. O servidor mantém essa regra antes de iniciar a partida. */
  setBoardRacePawnColor(playerId: string, color: "blue" | "pink") {
    if (this.gameId !== "boardrace" || !this.players.has(playerId)) return;
    const opposite = color === "blue" ? "pink" : "blue";
    const next: Record<string, "blue" | "pink"> = {};
    for (const id of this.players.keys()) next[id] = id === playerId ? color : opposite;
    this.pendingBoardRacePawnColors = next;
  }

  startGame(overrides?: Record<string, unknown>) {
    if (!this.gameId) return;
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

    // Palavras Cruzadas, Caça-Palavras, Sudoku e Termo usam o campo de modo
    // "together"/"duel" (independente do `colorMode`, que é específico da
    // Memória de Cores). O Quiz reaproveita o mesmo campo com valores
    // "solo" | "together" | "duel". O Mini RPG reaproveita o mesmo campo com
    // valores "1v1" | "soloBot" | "duoBot".
    const matchMode =
      this.gameId === "crossword" ||
      this.gameId === "wordsearch" ||
      this.gameId === "quiz" ||
      this.gameId === "whoami" ||
      this.gameId === "rpg" ||
      this.gameId === "sudoku" ||
      this.gameId === "memory" ||
      this.gameId === "termo" ||
      this.gameId === "airhockey"
        || this.gameId === "chess"
        || this.gameId === "boardrace"
        || this.gameId === "casino"
        ? this.pendingMatchMode
        : undefined;

    const options = {
      imageId: this.pendingImageId ?? undefined,
      imageWidth: this.pendingImageWidth ?? undefined,
      imageHeight: this.pendingImageHeight ?? undefined,
      difficulty: this.pendingDifficulty,
      // Cassino Solo sempre nasce contra o BOT. Não depende de um setConfig
      // chegar antes do start: o próprio tipo da sala define o modo seguro.
      mode: this.gameId === "casino"
        ? (this.roomMode === "solo" ? "soloBot" : "duel")
        : matchMode ?? colorMode,
      category: this.gameId === "whoami" ? this.pendingWhoAmICategory : undefined,
      seerId: seerId ?? undefined,
      guesserId: guesserId ?? undefined,
      // Fixado no início da partida — usado pelo Palavras Cruzadas/Caça-Palavras
      // para saber quantos jogadores precisam terminar antes de encerrar o duelo.
      playerIds: connectedIds,
      pinkPlayerId: this.gameId === "chess" && this.roomMode === "duo" ? this.pendingChessPinkPlayerId : undefined,
      rpgAppearance: this.gameId === "rpg" ? this.pendingRpgAppearance : undefined,
      pawnColors: this.gameId === "boardrace" ? this.pendingBoardRacePawnColors : undefined,
      hostPlayerId: this.gameId === "rpg" ? (this.pendingRpgAppearancePlayerId ?? this.hostId ?? connectedIds[0]) : undefined,
      ...overrides,
    };
    this.gameState = engine.createInitialState(options);
    this.status = "playing";
    this.setAllConnectedPersistentPresence("minigame");
    this.statsRecordedForMatch = false;
  }

  resetGame() {
    if (!this.gameId) return;
    const engine = getGameEngine(this.gameId);
    if (this.gameState) {
      this.gameState = engine.reset(this.gameState);
      this.status = "playing";
      this.statsRecordedForMatch = false;
    }
  }

  /** Reidrata exclusivamente uma sala Solo nova a partir do snapshot salvo no
   * navegador. Salas Duo nunca passam por este caminho. */
  restoreSoloGameState(state: unknown) {
    if (this.roomMode !== "solo" || !this.gameId) return;
    const engine = getGameEngine(this.gameId);
    let restored = state;
    // Posse de ponteiro/arraste é transitória. Se o app fechou no meio de um
    // gesto (especialmente no Quebra-cabeça), a peça precisa voltar livre.
    if (engine.releasePlayer) {
      for (const playerId of this.players.keys()) restored = engine.releasePlayer(restored, playerId);
    }
    this.gameState = restored;
    this.status = "playing";
    this.statsRecordedForMatch = false;

    const saved = restored as Record<string, unknown>;
    if (typeof saved.difficulty === "string") this.pendingDifficulty = saved.difficulty;
    if (typeof saved.variant === "string") this.pendingDifficulty = saved.variant;
    if (this.gameId === "casino" && typeof saved.length === "string") this.pendingDifficulty = saved.length;
    if (typeof saved.mode === "string") this.pendingMatchMode = saved.mode;
    if (typeof saved.imageId === "string") this.pendingImageId = saved.imageId;
    if (typeof saved.imageWidth === "number") this.pendingImageWidth = saved.imageWidth;
    if (typeof saved.imageHeight === "number") this.pendingImageHeight = saved.imageHeight;
  }

  applyAction(action: unknown, playerId: string) {
    if (!this.gameId) return;
    const engine = getGameEngine(this.gameId);
    if (!this.gameState) return;
    this.gameState = engine.applyAction(this.gameState, action, playerId);
    if (engine.isSolved(this.gameState)) {
      this.status = "finished";
      this.markSequenceProgress(this.gameId);
      if (!this.statsRecordedForMatch) {
        this.statsRecordedForMatch = true;
        try {
          recordFinishedMatch({
            roomMode: this.roomMode,
            gameId: this.gameId,
            players: [...this.players.values()],
            gameState: this.gameState,
          });
        } catch (err) {
          // Uma falha ao interpretar o estado de um jogo nunca pode derrubar
          // a partida em si — só a estatística dessa partida específica é perdida.
          console.error(`Falha ao registrar estatísticas da partida (${this.gameId}):`, err);
        }
      }
    }
  }

  toSnapshot(): RoomSnapshot {
    return {
      code: this.code,
      roomMode: this.roomMode,
      roomKind: this.roomKind,
      gameId: this.gameId,
      status: this.status,
      players: [...this.players.values()],
      maxPlayers: this.maxPlayers,
      hostId: this.hostId,
      persistentDuoPresence: this.getPersistentDuoPresence(),
      persistentDuoLobby: this.persistentDuoLobby,
      pendingImageId: this.pendingImageId,
      pendingImageWidth: this.pendingImageWidth,
      pendingImageHeight: this.pendingImageHeight,
      pendingDifficulty: this.pendingDifficulty,
      pendingColorMode: this.pendingColorMode,
      pendingSeerId: this.pendingSeerId,
      pendingMatchMode: this.pendingMatchMode,
      pendingWhoAmICategory: this.pendingWhoAmICategory,
      pendingChessPinkPlayerId: this.pendingChessPinkPlayerId,
      pendingRpgAppearance: this.pendingRpgAppearance,
      pendingBoardRacePawnColors: this.pendingBoardRacePawnColors,
      sequence: this.sequence,
      sequenceProgress: this.sequenceProgress,
    };
  }
}
