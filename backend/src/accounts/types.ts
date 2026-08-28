import { GameId } from "../types";

/**
 * Sistema de "contas fixas" — como só duas pessoas jogam no site, não existe
 * cadastro/senha: são só dois perfis pré-definidos que qualquer um pode
 * selecionar (a seleção em si não é uma barreira de segurança, é só "quem
 * está jogando agora" — o mesmo espírito de não ter autenticação que já
 * valia para as salas por código).
 */
export type AccountId = "andre" | "flavia";
export const ACCOUNT_IDS: AccountId[] = ["andre", "flavia"];
export function isAccountId(value: unknown): value is AccountId {
  return value === "andre" || value === "flavia";
}

export interface AccountProfile {
  id: AccountId;
  name: string;
  /** Data URL (base64) já redimensionada/comprimida no navegador, ou `null`
   *  para usar o avatar de iniciais padrão. */
  photo: string | null;
  updatedAt: number;
}

export type RecordScoreType = "time" | "points";

export interface RecordEntry {
  /** Milissegundos (scoreType "time", menor é melhor) ou pontos (scoreType
   *  "points", maior é melhor). */
  value: number;
  scoreType: RecordScoreType;
  achievedAt: number;
}

/** Chave de dificuldade do jogo — "easy" | "medium" | "hard" na maioria,
 *  "easy" | "hard" na Memória de Cores, e a constante abaixo para o Mini RPG
 *  (único jogo sem seletor de dificuldade). */
export type RankKey = string;
export const NO_RANK: RankKey = "geral";

/** Recordes pessoais de uma conta — separados por jogo e por rank (dificuldade),
 *  e por sua vez divididos entre solo e duo (recorde pessoal em partidas de
 *  Duelo; jogos sem modo de duelo — como o Quebra-cabeça — nunca populam essa
 *  metade). */
export interface AccountRecords {
  solo: Partial<Record<GameId, Partial<Record<RankKey, RecordEntry>>>>;
  duo: Partial<Record<GameId, Partial<Record<RankKey, RecordEntry>>>>;
}

/** Recorde "Juntos" — não pertence a uma conta isolada, é a marca da DUPLA
 *  em partidas cooperativas (Quebra-cabeça, modo "together" de Sudoku/Cruzadas/
 *  Caça-Palavras/Quiz, Memória de Cores cooperativa, Mini RPG em dupla contra
 *  o BOT). Só existe uma entrada por jogo/rank, não duas (uma por conta). */
export type TogetherRecords = Partial<Record<GameId, Partial<Record<RankKey, RecordEntry>>>>;

export interface AccountSoloStats {
  timeMs: number;
  gamePlayCounts: Partial<Record<GameId, number>>;
  difficultyCounts: Partial<Record<RankKey, number>>;
}

/** Parte das estatísticas de Duo que é individual de cada conta — só o que
 *  diz respeito a Duelos (vitórias/derrotas), já que o resto (tempo total,
 *  partidas juntos, dificuldade mais jogada) é da dupla como um todo. */
export interface AccountDuoParticipation {
  duelWins: number;
  duelLosses: number;
  duelDraws: number;
  gameWinCounts: Partial<Record<GameId, number>>;
  gameLossCounts: Partial<Record<GameId, number>>;
}

/** Estatísticas de Duo que pertencem à dupla, não a uma conta isolada — só
 *  são incrementadas quando as DUAS contas fixas (não visitantes) estão na
 *  sala, já que "quantos jogos vocês já terminaram juntos" só faz sentido
 *  quando é realmente o André e a Flávia jogando um com o outro. */
export interface DuoSharedStats {
  totalGamesFinished: number;
  togetherCompleted: number;
  totalDuels: number;
  timeMs: number;
  difficultyCounts: Partial<Record<RankKey, number>>;
}

export interface AccountsData {
  profiles: Record<AccountId, AccountProfile>;
  solo: Record<AccountId, AccountSoloStats>;
  duoShared: DuoSharedStats;
  duoPerAccount: Record<AccountId, AccountDuoParticipation>;
  records: Record<AccountId, AccountRecords>;
  togetherRecords: TogetherRecords;
}

/** Formato compacto devolvido por GET /api/accounts — só o necessário para a
 *  tela de seleção de conta e o cabeçalho, nunca as estatísticas. */
export interface PublicAccountProfile {
  id: AccountId;
  name: string;
  photo: string | null;
}
