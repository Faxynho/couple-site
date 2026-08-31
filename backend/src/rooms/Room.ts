import { ALL_GAME_IDS, GameId, Player, RoomMode, RoomSnapshot, RoomStatus } from "../types";
import { getGameEngine } from "../games/GameRegistry";
import { recordFinishedMatch } from "../accounts/gameResult";

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
  /** Jogo selecionado no momento — `null` só é possível numa sala Duo que
   *  ainda não escolheu o primeiro jogo (status "lobby"). Mutável: é isso que
   *  permite trocar de jogo sem sair da sala. */
  gameId: GameId | null;
  readonly maxPlayers: number;
  players: Map<string, Player> = new Map();
  status: RoomStatus;
  gameState: unknown = null;
  createdAt = Date.now();

  /** Mapeia a identidade PERSISTENTE de cada jogador (Player.id, gerada uma
   *  vez pelo cliente e guardada no navegador) para o socket.id da conexão
   *  ATUAL desse jogador — que muda a cada reconexão de WebSocket (queda de
   *  wifi, app em segundo plano no celular, etc). É assim que sabemos para
   *  qual conexão enviar os eventos direcionados a um jogador específico. */
  private socketIds: Map<string, string> = new Map();

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
  /** Id do jogador que será Rosa no Xadrez Duo. Rosa equivale às brancas. */
  pendingChessPinkPlayerId: string | null = null;

  /** Sugestão de sequência de jogos (só relevante em salas Duo). */
  sequence: GameId[] = [];
  sequenceProgress: GameId[] = [];

  /** Evita registrar a mesma partida duas vezes nas estatísticas de conta —
   *  `isSolved` continua `true` em toda ação aplicada DEPOIS do fim do jogo
   *  (ex.: o vencedor de um duelo mexendo na própria grade enquanto espera o
   *  outro terminar), então sem esse guard `recordFinishedMatch` rodaria de
   *  novo a cada uma dessas ações. Zerado sempre que uma partida nova começa. */
  private statsRecordedForMatch = false;

  constructor(code: string, roomMode: RoomMode, gameId: GameId | null = null) {
    this.code = code;
    this.roomMode = roomMode;
    this.maxPlayers = roomMode === "solo" ? 1 : 2;
    this.gameId = gameId;
    this.status = gameId ? "waiting" : "lobby";
    if (roomMode === "duo") {
      this.sequence = shuffle(ALL_GAME_IDS);
    }
  }

  addPlayer(id: string, name: string, accountId?: "andre" | "flavia"): Player | null {
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
    if (this.hostId === null) {
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
  setSocketId(playerId: string, socketId: string) {
    this.socketIds.set(playerId, socketId);
  }

  /** socket.id atual de um jogador (para eventos direcionados a ele), ou
   *  undefined se ele nunca se conectou ou já foi substituído por uma
   *  reconexão mais nova. */
  getSocketId(playerId: string): string | undefined {
    return this.socketIds.get(playerId);
  }

  /** Chamado tanto numa queda de conexão quanto numa saída deliberada
   *  (room:leave). Marca o jogador como desconectado e, se ele era o host,
   *  passa a posição para o outro jogador (se algum ainda estiver
   *  conectado) — assim a sala nunca fica "sem dono" e travada. */
  markDisconnected(id: string) {
    const player = this.players.get(id);
    if (player) {
      player.connected = false;
      if (this.status === "playing" || this.status === "ready") {
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

  /** Configuração inicial de cada jogo ao ser selecionado — os valores de
   *  modo mudam conforme o tipo de sala: uma sala Solo já entra no único modo
   *  que faz sentido sozinho; uma sala Duo entra no modo cooperativo padrão
   *  (nunca em "solo"/"soloBot", que não fazem sentido com o convidado presente). */
  private defaultMatchModeFor(gameId: GameId): string {
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
    this.pendingDifficulty = gameId === "termo" ? "one" : DEFAULT_PENDING_DIFFICULTY;
    this.pendingColorMode = "competitive";
    this.pendingSeerId = null;
    this.pendingMatchMode = this.defaultMatchModeFor(gameId);
    this.pendingChessPinkPlayerId = gameId === "chess" && this.roomMode === "duo"
      ? [...this.players.keys()][0] ?? null
      : null;
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
  }

  /** "Voltar" mais uma vez — sai da configuração/jogo atual e volta para a
   *  escolha de jogo (lobby da sala), sem tirar ninguém da sala. */
  backToGameSelect() {
    this.gameId = null;
    this.gameState = null;
    this.status = "lobby";
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
    chessPinkPlayerId?: string | null;
  }) {
    if (config.imageId !== undefined) this.pendingImageId = config.imageId;
    if (config.imageWidth !== undefined) this.pendingImageWidth = config.imageWidth;
    if (config.imageHeight !== undefined) this.pendingImageHeight = config.imageHeight;
    if (config.difficulty !== undefined) this.pendingDifficulty = config.difficulty;
    if (config.colorMode !== undefined) this.pendingColorMode = config.colorMode;
    if (config.seerId !== undefined) this.pendingSeerId = config.seerId;
    if (config.matchMode !== undefined) this.pendingMatchMode = config.matchMode;
    if (config.chessPinkPlayerId !== undefined) this.pendingChessPinkPlayerId = config.chessPinkPlayerId;
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
      this.gameId === "rpg" ||
      this.gameId === "sudoku" ||
      this.gameId === "memory" ||
      this.gameId === "termo" ||
      this.gameId === "airhockey"
        || this.gameId === "chess"
        ? this.pendingMatchMode
        : undefined;

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
      pinkPlayerId: this.gameId === "chess" && this.roomMode === "duo" ? this.pendingChessPinkPlayerId : undefined,
      ...overrides,
    };
    this.gameState = engine.createInitialState(options);
    this.status = "playing";
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
      pendingChessPinkPlayerId: this.pendingChessPinkPlayerId,
      sequence: this.sequence,
      sequenceProgress: this.sequenceProgress,
    };
  }
}
