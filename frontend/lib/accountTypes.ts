import { GameId } from "@/lib/types";
import { AccountId } from "@/lib/accountSession";

export type { AccountId };

export interface PublicAccountProfile {
  id: AccountId;
  name: string;
  photo: string | null;
  /** Id da borda de avatar equipada (catálogo em lib/profileBorders.ts), ou
   *  `null`/ausente para o avatar sem moldura. */
  border?: string | null;
}

export type RecordScoreType = "time" | "points";

export interface RecordEntry {
  value: number;
  scoreType: RecordScoreType;
  achievedAt: number;
}

/** Rank "geral" usado pelo Mini RPG, único jogo sem seletor de dificuldade. */
export const NO_RANK = "geral";

export interface AccountRecords {
  solo: Partial<Record<GameId, Partial<Record<string, RecordEntry>>>>;
  duo: Partial<Record<GameId, Partial<Record<string, RecordEntry>>>>;
}

/** Recorde "Juntos" — marca da dupla (não de uma conta isolada), em partidas
 *  cooperativas (Quebra-cabeça, modo "together", Mini RPG em dupla vs. BOT). */
export type TogetherRecords = Partial<Record<GameId, Partial<Record<string, RecordEntry>>>>;

export interface AccountSoloStats {
  timeMs: number;
  gamePlayCounts: Partial<Record<GameId, number>>;
  difficultyCounts: Partial<Record<string, number>>;
  gameGoals: Partial<Record<GameId, { scored: number; conceded: number }>>;
  gameOutcomeCounts: Partial<Record<GameId, Partial<Record<string, { games: number; wins: number; losses: number; draws: number }>>>>;
}

export interface AccountDuoParticipation {
  duelWins: number;
  duelLosses: number;
  duelDraws: number;
  gameWinCounts: Partial<Record<GameId, number>>;
  gameLossCounts: Partial<Record<GameId, number>>;
  gameGoals: Partial<Record<GameId, { scored: number; conceded: number }>>;
  gameOutcomeCounts: Partial<Record<GameId, Partial<Record<string, { games: number; wins: number; losses: number; draws: number }>>>>;
}

export interface DuoSharedStats {
  totalGamesFinished: number;
  togetherCompleted: number;
  totalDuels: number;
  timeMs: number;
  difficultyCounts: Partial<Record<string, number>>;
}

export interface AccountProfile {
  id: AccountId;
  name: string;
  photo: string | null;
  border?: string | null;
  /** Bordas já compradas por esta conta. */
  ownedBorders?: string[];
  updatedAt: number;
}

/** Resposta de `GET /api/accounts/:id/borders` e da compra de uma borda. */
export interface ProfileBorderState {
  equipped: string | null;
  owned: string[];
  /** Preços em moedas globais, vindos do servidor (fonte da verdade). */
  prices: Record<string, number>;
  globalCoins: number;
}

export interface AccountsOverview {
  profiles: Record<AccountId, AccountProfile>;
  solo: Record<AccountId, AccountSoloStats>;
  duoShared: DuoSharedStats;
  duoPerAccount: Record<AccountId, AccountDuoParticipation>;
  records: Record<AccountId, AccountRecords>;
  togetherRecords: TogetherRecords;
}
