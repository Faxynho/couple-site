export type GameId = "puzzle" | "sudoku" | "colors" | "memory" | "termo" | "crossword" | "wordsearch" | "quiz" | "whoami" | "rpg" | "airhockey" | "chess" | "boardrace" | "casino";

/** Mesma ordem do catálogo (`GAMES`, em games.ts) — usada para sortear a
 *  sugestão de sequência de jogos da sala Duo. */
export const ALL_GAME_IDS: GameId[] = ["puzzle", "sudoku", "colors", "memory", "termo", "crossword", "wordsearch", "quiz", "whoami", "rpg", "airhockey", "chess", "boardrace", "casino"];

/** "solo": sessão de um único jogador — sem convite, sem convidado, sem sala
 *  persistente. "duo": sala pensada para dois jogadores, criada ANTES de
 *  escolher o jogo, que sobrevive à troca de jogo/modo e a quedas de conexão. */
export type RoomMode = "solo" | "duo";
export type RoomKind = "standard" | "persistent-duo";
export type PersistentDuoPresence = "offline" | "lobby" | "world" | "minigame";

export interface PersistentDuoLobby {
  displayName: string;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  /** Conta fixa (André/Flávia) que esse jogador selecionou antes de entrar na
   *  sala — ausente para quem entrou como Visitante. */
  accountId?: "andre" | "flavia";
}

/** "lobby": sala Duo criada, ainda sem jogo escolhido. "waiting"/"ready":
 *  jogo escolhido, tela de configuração antes de iniciar. "playing"/"finished":
 *  partida em andamento/terminada. */
export type RoomStatus = "lobby" | "waiting" | "ready" | "playing" | "finished";

export interface RoomSnapshot {
  code: string;
  roomMode: RoomMode;
  roomKind: RoomKind;
  /** `null` só enquanto uma sala Duo ainda não escolheu o primeiro jogo. */
  gameId: GameId | null;
  status: RoomStatus;
  players: Player[];
  maxPlayers: number;
  hostId: string | null;
  persistentDuoPresence: Record<"andre" | "flavia", PersistentDuoPresence> | null;
  persistentDuoLobby: PersistentDuoLobby | null;
  pendingImageId: string | null;
  pendingImageWidth: number | null;
  pendingImageHeight: number | null;
  pendingDifficulty: string;
  pendingColorMode: string;
  pendingSeerId: string | null;
  pendingMatchMode: string;
  /** Categoria escolhida para o Quem Sou Eu? ("all" mistura tudo). */
  pendingWhoAmICategory: string;
  /** Id escolhido pelo host para jogar de Rosa no Xadrez Duo. */
  pendingChessPinkPlayerId?: string | null;
  /** Aparência base do anfitrião no RPG; o outro jogador recebe a outra. */
  pendingRpgAppearance?: "man" | "woman";
  /** Peças selecionadas na configuração da Corrida de Tabuleiro. */
  pendingBoardRacePawnColors?: Record<string, "blue" | "pink">;
  /** Sugestão de sequência de jogos da sala Duo (sem efeito numa sala Solo). */
  sequence: GameId[];
  /** Ids (dentro de `sequence`) já jogados até o fim desde o último sorteio. */
  sequenceProgress: GameId[];
}

export interface PieceGroup {
  id: string;
  pieceIds: number[];
  originX: number;
  originY: number;
  heldBy?: string;
}

export interface PuzzleState {
  imageId: string;
  imageWidth: number;
  imageHeight: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  difficulty: string;
  rows: number;
  cols: number;
  pieceCount: number;
  pieceSize: number;
  boardWidth: number;
  boardHeight: number;
  targetX: number;
  targetY: number;
  edgeSignsH: number[];
  edgeSignsV: number[];
  groups: Record<string, PieceGroup>;
  pieceToGroup: Record<number, string>;
  moves: number;
  startedAt: number;
  solved: boolean;
  solvedAt: number | null;
  lastActionId: string | null;
}

export interface GameDefinition {
  id: GameId;
  name: string;
  description: string;
  emoji: string;
  image: string;
  available: boolean;
  /** false = não aparece no catálogo Solo. */
  soloAvailable?: boolean;
}
