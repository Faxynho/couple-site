/**
 * Tipos compartilhados do servidor.
 *
 * O tipo `GameId` é o único ponto que precisa crescer quando um novo jogo
 * cooperativo for adicionado à plataforma (Jogo da Velha, Forca, Sudoku...).
 */

export type GameId = "puzzle" | "sudoku" | "colors" | "crossword" | "wordsearch" | "quiz" | "rpg"; // adicione novos ids aqui

/** Lista de todos os ids de jogo, na mesma ordem do catálogo — usada para
 *  sortear a sugestão de sequência de jogos da sala Duo. */
export const ALL_GAME_IDS: GameId[] = ["puzzle", "sudoku", "colors", "crossword", "wordsearch", "quiz", "rpg"];

/** "solo": sessão de um único jogador, sem convite nem convidado — a sala
 *  existe só para reaproveitar a mesma infraestrutura de motor de jogo.
 *  "duo": sala persistente pensada para dois jogadores, criada ANTES de
 *  escolher o jogo, que sobrevive à troca de jogo/modo e a quedas de conexão. */
export type RoomMode = "solo" | "duo";

export interface Player {
  // Identidade PERSISTENTE do jogador (gerada uma vez pelo cliente e salva no
  // navegador) — NÃO é o socket.id. O socket.id muda a cada reconexão de
  // WebSocket; usar isso como identidade de jogador é o que fazia a sala
  // "esquecer" quem era quem depois de uma queda de conexão. A conexão atual
  // de cada jogador é rastreada à parte, em Room.socketIds.
  id: string;
  name: string;
  color: string; // cor de identificação do jogador na UI (avatar/cursor)
  connected: boolean;
}

/** "lobby": sala Duo criada, ainda sem jogo escolhido — mostra o catálogo de
 *  jogos para o anfitrião escolher. "waiting"/"ready": jogo escolhido, tela de
 *  configuração (dificuldade/modo) antes de iniciar. "playing"/"finished":
 *  partida em andamento/terminada. */
export type RoomStatus = "lobby" | "waiting" | "ready" | "playing" | "finished";

export interface RoomSnapshot {
  code: string;
  roomMode: RoomMode;
  /** Jogo atualmente selecionado na sala — `null` enquanto a sala Duo está no
   *  lobby (nenhum jogo escolhido ainda). Nunca é `null` numa sala Solo. */
  gameId: GameId | null;
  status: RoomStatus;
  players: Player[];
  maxPlayers: number;
  /** id PERSISTENTE (Player.id) de quem criou a sala (ou de quem herdou a
   *  posição depois que o anfitrião original caiu) — só ele pode mudar a
   *  configuração, trocar de jogo/modo e expulsar o convidado. */
  hostId: string | null;
  /** Configuração escolhida pelo host, sincronizada em tempo real com o outro jogador. */
  pendingImageId: string | null;
  pendingImageWidth: number | null;
  pendingImageHeight: number | null;
  pendingDifficulty: string;
  /** Específico da Memória de Cores: "competitive" (cada um palpita e comparam)
   *  ou "cooperative" (um vê a cor e guia o outro, pontuando juntos). */
  pendingColorMode: string;
  /** Específico da Memória de Cores no modo cooperativo: id de quem vê a cor. */
  pendingSeerId: string | null;
  /** Específico do Palavras Cruzadas e do Caça-Palavras: "together" (juntos)
   *  ou "duel" (um contra o outro), escolhido pelo host na sala de espera.
   *  O Quiz reaproveita o mesmo campo com valores "solo" | "together" | "duel".
   *  O Mini RPG reaproveita o mesmo campo com valores "1v1" | "soloBot" | "duoBot". */
  pendingMatchMode: string;
  /** Sugestão de sequência de jogos da sala Duo: uma ordem sorteada com todos
   *  os jogos do catálogo. Sem efeito numa sala Solo. */
  sequence: GameId[];
  /** Ids (dentro de `sequence`) que já foram jogados até o fim desde o último
   *  sorteio — resetado toda vez que a sequência é sorteada de novo. */
  sequenceProgress: GameId[];
}

/**
 * Contrato que todo "motor de jogo" cooperativo precisa implementar.
 * TState é o formato do estado público enviado ao cliente e TAction é o
 * formato das jogadas recebidas de um jogador. Novos jogos só precisam
 * implementar esta interface e se registrar no GameRegistry.
 */
export interface GameEngine<TState, TAction> {
  readonly id: GameId;
  createInitialState(options?: Record<string, unknown>): TState;
  /** Aplica a ação de um jogador e retorna o novo estado (ou o mesmo, se inválida). */
  applyAction(state: TState, action: TAction, playerId: string): TState;
  /** Verifica se o estado atual representa uma vitória cooperativa. */
  isSolved(state: TState): boolean;
  /** Reinicia o jogo mantendo as mesmas opções/configuração. */
  reset(state: TState): TState;
  /** Libera travas/posses de um jogador que desconectou (opcional). */
  releasePlayer?(state: TState, playerId: string): TState;
}
