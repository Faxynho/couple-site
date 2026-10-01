import { promises as fs } from "fs";
import path from "path";
import { GameId } from "../types";
import { isProfileBorderId } from "./profileBorders";
import {
  ACCOUNT_IDS,
  AccountDuoParticipation,
  AccountId,
  AccountProfile,
  AccountRecords,
  AccountSoloStats,
  AccountsData,
  PublicAccountProfile,
  RecordEntry,
  RecordScoreType,
} from "./types";

/**
 * Persistência simples em arquivo JSON — a plataforma não tem banco de dados
 * (ver README) e adicionar um agora só para dois perfis fixos seria
 * desproporcional. O arquivo mora em `backend/data/accounts.json`, fora do
 * controle de versão (ver .gitignore), e é criado automaticamente com os
 * valores padrão no primeiro `npm run dev`/`npm start` se ainda não existir.
 *
 * Tudo fica em memória depois de carregado (accountStore.ready() é aguardado
 * uma única vez, na subida do servidor, em src/index.ts) — cada leitura de
 * estatística e cada gravação de partida mexe só no objeto em memória; a
 * escrita em disco acontece em segundo plano, com um pequeno debounce, então
 * nenhuma rota nem o fim de uma partida jamais espera por I/O de arquivo.
 */

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "accounts.json");
const SAVE_DEBOUNCE_MS = 800;

const DEFAULT_NAMES: Record<AccountId, string> = {
  andre: "André",
  flavia: "Flávia",
};

function defaultProfile(id: AccountId): AccountProfile {
  return { id, name: DEFAULT_NAMES[id], photo: null, border: null, ownedBorders: [], updatedAt: Date.now() };
}

function defaultSoloStats(): AccountSoloStats {
  return { timeMs: 0, gamePlayCounts: {}, difficultyCounts: {}, gameGoals: {}, gameOutcomeCounts: {} };
}

function defaultDuoParticipation(): AccountDuoParticipation {
  return { duelWins: 0, duelLosses: 0, duelDraws: 0, gameWinCounts: {}, gameLossCounts: {}, gameGoals: {}, gameOutcomeCounts: {} };
}

function defaultRecords(): AccountRecords {
  return { solo: {}, duo: {} };
}

function emptyData(): AccountsData {
  const profiles = {} as Record<AccountId, AccountProfile>;
  const solo = {} as Record<AccountId, AccountSoloStats>;
  const duoPerAccount = {} as Record<AccountId, AccountDuoParticipation>;
  const records = {} as Record<AccountId, AccountRecords>;
  for (const id of ACCOUNT_IDS) {
    profiles[id] = defaultProfile(id);
    solo[id] = defaultSoloStats();
    duoPerAccount[id] = defaultDuoParticipation();
    records[id] = defaultRecords();
  }
  return {
    profiles,
    solo,
    duoShared: { totalGamesFinished: 0, togetherCompleted: 0, totalDuels: 0, timeMs: 0, difficultyCounts: {} },
    duoPerAccount,
    records,
    togetherRecords: {},
  };
}

/** Mescla dado carregado do disco com os padrões — protege contra um arquivo
 *  de uma versão anterior que ainda não tinha algum campo novo (evita ter
 *  que apagar o arquivo toda vez que esse módulo ganhar uma estatística nova). */
function mergeWithDefaults(loaded: Partial<AccountsData> | null): AccountsData {
  const base = emptyData();
  if (!loaded || typeof loaded !== "object") return base;

  for (const id of ACCOUNT_IDS) {
    if (loaded.profiles?.[id]) {
      base.profiles[id] = { ...base.profiles[id], ...loaded.profiles[id] };
      // Arquivos salvos antes das bordas existirem não têm esses campos; e uma
      // borda removida do catálogo não pode continuar equipada/possuída.
      const loadedOwned = Array.isArray(loaded.profiles[id].ownedBorders) ? loaded.profiles[id].ownedBorders : [];
      const owned = [...new Set(loadedOwned.filter(isProfileBorderId))];
      const equipped = loaded.profiles[id].border;
      base.profiles[id].ownedBorders = owned;
      base.profiles[id].border = isProfileBorderId(equipped) && owned.includes(equipped) ? equipped : null;
    }
    if (loaded.solo?.[id]) {
      base.solo[id] = {
        ...base.solo[id],
        ...loaded.solo[id],
        gamePlayCounts: { ...loaded.solo[id].gamePlayCounts },
        difficultyCounts: { ...loaded.solo[id].difficultyCounts },
        gameGoals: { ...loaded.solo[id].gameGoals },
        gameOutcomeCounts: { ...loaded.solo[id].gameOutcomeCounts },
      };
    }
    if (loaded.duoPerAccount?.[id]) {
      base.duoPerAccount[id] = {
        ...base.duoPerAccount[id],
        ...loaded.duoPerAccount[id],
        gameWinCounts: { ...loaded.duoPerAccount[id].gameWinCounts },
        gameLossCounts: { ...loaded.duoPerAccount[id].gameLossCounts },
        gameGoals: { ...loaded.duoPerAccount[id].gameGoals },
        gameOutcomeCounts: { ...loaded.duoPerAccount[id].gameOutcomeCounts },
      };
    }
    if (loaded.records?.[id]) {
      base.records[id] = {
        solo: { ...loaded.records[id].solo },
        duo: { ...loaded.records[id].duo },
      };
    }
  }
  if (loaded.duoShared) {
    base.duoShared = {
      ...base.duoShared,
      ...loaded.duoShared,
      difficultyCounts: { ...loaded.duoShared.difficultyCounts },
    };
  }
  if (loaded.togetherRecords) {
    base.togetherRecords = { ...loaded.togetherRecords };
  }
  return base;
}

function isBetter(candidate: number, current: RecordEntry | undefined, scoreType: RecordScoreType): boolean {
  if (!current) return true;
  return scoreType === "time" ? candidate < current.value : candidate > current.value;
}

export class AccountStore {
  private data: AccountsData = emptyData();
  private loadPromise: Promise<void> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savingNow = false;
  private saveAgainAfter = false;

  /** `dataFile` é injetável só para os testes usarem um arquivo temporário em
   *  vez de `backend/data/accounts.json`. */
  constructor(private readonly dataFile: string = DATA_FILE) {}

  /** Chamado uma vez, na subida do servidor (ver src/index.ts) — garante que
   *  os dados salvos já estejam em memória antes do primeiro request. */
  ready(): Promise<void> {
    if (!this.loadPromise) this.loadPromise = this.load();
    return this.loadPromise;
  }

  private async load() {
    try {
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
      const raw = await fs.readFile(this.dataFile, "utf-8");
      this.data = mergeWithDefaults(JSON.parse(raw));
    } catch {
      // Arquivo ainda não existe (primeira vez) ou está corrompido — segue
      // com os valores padrão; a próxima gravação recria o arquivo do zero.
      this.data = emptyData();
    }
  }

  private scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flush();
    }, SAVE_DEBOUNCE_MS);
  }

  /** Grava em disco agora, sem esperar o debounce (usado pelos testes). */
  async flushNow(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.flush();
  }

  private async flush() {
    if (this.savingNow) {
      this.saveAgainAfter = true;
      return;
    }
    this.savingNow = true;
    try {
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
      const tmpFile = `${this.dataFile}.tmp`;
      await fs.writeFile(tmpFile, JSON.stringify(this.data, null, 2), "utf-8");
      await fs.rename(tmpFile, this.dataFile);
    } catch (err) {
      console.error("Não foi possível salvar backend/data/accounts.json:", err);
    } finally {
      this.savingNow = false;
      if (this.saveAgainAfter) {
        this.saveAgainAfter = false;
        this.scheduleSave();
      }
    }
  }

  getPublicProfiles(): PublicAccountProfile[] {
    return ACCOUNT_IDS.map((id) => {
      const p = this.data.profiles[id];
      return { id: p.id, name: p.name, photo: p.photo, border: p.border };
    });
  }

  updateProfile(id: AccountId, patch: { name?: string; photo?: string | null; border?: string | null }): AccountProfile {
    const current = this.data.profiles[id];
    // Defesa em profundidade: a rota já responde 403 para borda não desbloqueada,
    // mas o store também nunca equipa uma borda que a conta não possui.
    const borderAllowed = patch.border === null || (patch.border !== undefined && this.ownsBorder(id, patch.border));
    const next: AccountProfile = {
      ...current,
      name: patch.name !== undefined ? patch.name : current.name,
      photo: patch.photo !== undefined ? patch.photo : current.photo,
      border: borderAllowed ? (patch.border as string | null) : current.border,
      updatedAt: Date.now(),
    };
    this.data.profiles[id] = next;
    this.scheduleSave();
    return next;
  }

  // --- Bordas de perfil ---------------------------------------------------
  // O catálogo e os preços ficam em profileBorders.ts; aqui só a posse e a
  // borda equipada de cada conta.

  getBorderState(id: AccountId): { equipped: string | null; owned: string[] } {
    const profile = this.data.profiles[id];
    return { equipped: profile.border, owned: [...profile.ownedBorders] };
  }

  ownsBorder(id: AccountId, borderId: string): boolean {
    return this.data.profiles[id].ownedBorders.includes(borderId);
  }

  /** Registra a posse de uma borda (idempotente). Devolve `true` só quando a
   *  borda era nova para a conta; id fora do catálogo é ignorado. */
  grantBorder(id: AccountId, borderId: string): boolean {
    if (!isProfileBorderId(borderId) || this.ownsBorder(id, borderId)) return false;
    const profile = this.data.profiles[id];
    this.data.profiles[id] = { ...profile, ownedBorders: [...profile.ownedBorders, borderId], updatedAt: Date.now() };
    this.scheduleSave();
    return true;
  }

  /** Payload completo para as abas de Estatísticas e Recordes — os perfis
   *  (nome/foto) vêm juntos para a UI não precisar de uma segunda chamada. */
  getOverview() {
    return {
      profiles: this.data.profiles,
      solo: this.data.solo,
      duoShared: this.data.duoShared,
      duoPerAccount: this.data.duoPerAccount,
      records: this.data.records,
      togetherRecords: this.data.togetherRecords,
    };
  }

  private tryUpdateRecord(
    bucket: Partial<Record<GameId, Partial<Record<string, RecordEntry>>>>,
    gameId: GameId,
    rank: string,
    value: number,
    scoreType: RecordScoreType
  ) {
    if (!bucket[gameId]) bucket[gameId] = {};
    const gameRecords = bucket[gameId]!;
    if (isBetter(value, gameRecords[rank], scoreType)) {
      gameRecords[rank] = { value, scoreType, achievedAt: Date.now() };
    }
  }

  /** Ponto único de escrita de estatísticas — chamado por
   *  accounts/gameResult.ts sempre que uma partida (solo ou duo) termina. */
  recordSoloMatch(accountId: AccountId, gameId: GameId, rank: string, durationMs: number, metricValue: number | null, scoreType: RecordScoreType) {
    const stats = this.data.solo[accountId];
    stats.timeMs += durationMs;
    stats.gamePlayCounts[gameId] = (stats.gamePlayCounts[gameId] ?? 0) + 1;
    stats.difficultyCounts[rank] = (stats.difficultyCounts[rank] ?? 0) + 1;
    if (metricValue !== null) {
      this.tryUpdateRecord(this.data.records[accountId].solo, gameId, rank, metricValue, scoreType);
    }
    this.scheduleSave();
  }

  recordDuoSharedMatch(bucket: "together" | "duel", rank: string, durationMs: number) {
    const shared = this.data.duoShared;
    shared.totalGamesFinished += 1;
    shared.timeMs += durationMs;
    shared.difficultyCounts[rank] = (shared.difficultyCounts[rank] ?? 0) + 1;
    if (bucket === "together") shared.togetherCompleted += 1;
    else shared.totalDuels += 1;
    this.scheduleSave();
  }

  /** Recorde "Juntos" — uma marca só, da dupla, não de uma conta isolada
   *  (ver comentário em accounts/types.ts). */
  recordTogetherMatch(gameId: GameId, rank: string, value: number, scoreType: RecordScoreType) {
    this.tryUpdateRecord(this.data.togetherRecords, gameId, rank, value, scoreType);
    this.scheduleSave();
  }

  recordDuelOutcome(
    accountId: AccountId,
    gameId: GameId,
    rank: string,
    result: "win" | "loss" | "draw",
    metricValue: number | null,
    scoreType: RecordScoreType
  ) {
    const participation = this.data.duoPerAccount[accountId];
    if (result === "win") {
      participation.duelWins += 1;
      participation.gameWinCounts[gameId] = (participation.gameWinCounts[gameId] ?? 0) + 1;
    } else if (result === "loss") {
      participation.duelLosses += 1;
      participation.gameLossCounts[gameId] = (participation.gameLossCounts[gameId] ?? 0) + 1;
    } else {
      participation.duelDraws += 1;
    }
    if (metricValue !== null) {
      this.tryUpdateRecord(this.data.records[accountId].duo, gameId, rank, metricValue, scoreType);
    }
    this.scheduleSave();
  }

  recordGameGoals(bucket: "solo" | "duel", accountId: AccountId, gameId: GameId, scored: number, conceded: number) {
    const target = bucket === "solo" ? this.data.solo[accountId].gameGoals : this.data.duoPerAccount[accountId].gameGoals;
    const current = target[gameId] ?? { scored: 0, conceded: 0 };
    target[gameId] = { scored: current.scored + Math.max(0, scored), conceded: current.conceded + Math.max(0, conceded) };
    this.scheduleSave();
  }

  recordGameOutcome(bucket: "solo" | "duel", accountId: AccountId, gameId: GameId, rank: string, result: "win" | "loss" | "draw" | "solo") {
    const owner = bucket === "solo" ? this.data.solo[accountId] : this.data.duoPerAccount[accountId];
    const gameCounts = owner.gameOutcomeCounts[gameId] ?? {};
    const current = gameCounts[rank] ?? { games: 0, wins: 0, losses: 0, draws: 0 };
    // Em Solo, "solo" só representa vitória quando o extract do jogo gerou
    // métrica de recorde; o Xadrez passa o resultado concreto abaixo.
    const next = { ...current, games: current.games + 1 };
    if (result === "win" || result === "solo") next.wins += 1;
    else if (result === "loss") next.losses += 1;
    else next.draws += 1;
    owner.gameOutcomeCounts[gameId] = { ...gameCounts, [rank]: next };
    this.scheduleSave();
  }

  // --- Reset (aba de Configurações, só visível para a conta "andre") -----
  // Cada categoria é resetada separadamente, como pedido, para poder corrigir
  // só a parte afetada por um bug/engano sem perder o resto.

  resetSoloStats(id: AccountId) {
    this.data.solo[id] = defaultSoloStats();
    this.scheduleSave();
  }

  resetDuoSharedStats() {
    this.data.duoShared = { totalGamesFinished: 0, togetherCompleted: 0, totalDuels: 0, timeMs: 0, difficultyCounts: {} };
    this.scheduleSave();
  }

  resetDuoParticipation(id: AccountId) {
    this.data.duoPerAccount[id] = defaultDuoParticipation();
    this.scheduleSave();
  }

  resetRecords(id: AccountId, mode: "solo" | "duo") {
    this.data.records[id][mode] = {};
    this.scheduleSave();
  }

  resetTogetherRecords() {
    this.data.togetherRecords = {};
    this.scheduleSave();
  }
}

export const accountStore = new AccountStore();
