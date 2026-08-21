/**
 * Tipos compartilhados do servidor.
 *
 * O tipo `GameId` é o único ponto que precisa crescer quando um novo jogo
 * cooperativo for adicionado à plataforma (Jogo da Velha, Forca, Sudoku...).
 */

export type GameId = "puzzle" | "sudoku" | "colors"; // adicione novos ids aqui: "puzzle" | "sudoku" | "colors" | "tictactoe" | ...

export interface Player {
  id: string; // socket.id
  name: string;
  color: string; // cor de identificação do jogador na UI (avatar/cursor)
  connected: boolean;
}

export type RoomStatus = "waiting" | "ready" | "playing" | "finished";

export interface RoomSnapshot {
  code: string;
  gameId: GameId;
  status: RoomStatus;
  players: Player[];
  maxPlayers: number;
  /** socket.id de quem criou a sala — só ele pode mudar a configuração e iniciar. */
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
