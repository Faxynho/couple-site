import { promises as fs } from "fs";
import path from "path";
import { GameId } from "../types";
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
  return { id, name: DEFAULT_NAMES[id], photo: null, updatedAt: Date.now() };
}

function defaultSoloStats(): AccountSoloStats {
  return { timeMs: 0, gamePlayCounts: {}, difficultyCounts: {} };
}

function defaultDuoParticipation(): AccountDuoParticipation {
  return { duelWins: 0, duelLosses: 0, duelDraws: 0, gameWinCounts: {}, gameLossCounts: {} };
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
    if (loaded.profiles?.[id]) base.profiles[id] = { ...base.profiles[id], ...loaded.profiles[id] };
    if (loaded.solo?.[id]) {
      base.solo[id] = {
        ...base.solo[id],
        ...loaded.solo[id],
        gamePlayCounts: { ...loaded.solo[id].gamePlayCounts },
        difficultyCounts: { ...loaded.solo[id].difficultyCounts },
      };
    }
    if (loaded.duoPerAccount?.[id]) {
      base.duoPerAccount[id] = {
        ...base.duoPerAccount[id],
        ...loaded.duoPerAccount[id],
        gameWinCounts: { ...loaded.duoPerAccount[id].gameWinCounts },
        gameLossCounts: { ...loaded.duoPerAccount[id].gameLossCounts },
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

class AccountStore {
  private data: AccountsData = emptyData();
  private loadPromise: Promise<void> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savingNow = false;
  private saveAgainAfter = false;

  /** Chamado uma vez, na subida do servidor (ver src/index.ts) — garante que
   *  os dados salvos já estejam em memória antes do primeiro request. */
  ready(): Promise<void> {
    if (!this.loadPromise) this.loadPromise = this.load();
    return this.loadPromise;
  }

  private async load() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const raw = await fs.readFile(DATA_FILE, "utf-8");
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

  private async flush() {
    if (this.savingNow) {
      this.saveAgainAfter = true;
      return;
    }
    this.savingNow = true;
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tmpFile = `${DATA_FILE}.tmp`;
      await fs.writeFile(tmpFile, JSON.stringify(this.data, null, 2), "utf-8");
      await fs.rename(tmpFile, DATA_FILE);
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
      return { id: p.id, name: p.name, photo: p.photo };
    });
  }

  updateProfile(id: AccountId, patch: { name?: string; photo?: string | null }): AccountProfile {
    const current = this.data.profiles[id];
    const next: AccountProfile = {
      ...current,
      name: patch.name !== undefined ? patch.name : current.name,
      photo: patch.photo !== undefined ? patch.photo : current.photo,
      updatedAt: Date.now(),
    };
    this.data.profiles[id] = next;
    this.scheduleSave();
    return next;
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
