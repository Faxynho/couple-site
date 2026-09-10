import { promises as fs } from "fs";
import path from "path";
import { ACCOUNT_IDS, AccountId, isAccountId } from "../accounts/types";
import { PersistentDuoPresence } from "../types";

export const PERSISTENT_DUO_ROOM_CODE = "PERSISTENT_DUO";
export const PERSISTENT_DUO_ACCOUNT_IDS = ACCOUNT_IDS;
export const PERSISTENT_DUO_DEFAULT_DISPLAY_NAME = "Lobby de André e Flávia";
export const PERSISTENT_DUO_DISPLAY_NAME_MAX_LENGTH = 40;

export interface PersistentDuoLobbyData {
  displayName: string;
}

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "persistent-duo-lobby.json");
const SAVE_DEBOUNCE_MS = 800;

export function normalizePersistentDuoDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  return Array.from(normalized).slice(0, PERSISTENT_DUO_DISPLAY_NAME_MAX_LENGTH).join("");
}

class PersistentDuoStore {
  private data: PersistentDuoLobbyData = { displayName: PERSISTENT_DUO_DEFAULT_DISPLAY_NAME };
  private loadPromise: Promise<void> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savingNow = false;
  private saveAgainAfter = false;

  ready(): Promise<void> {
    if (!this.loadPromise) this.loadPromise = this.load();
    return this.loadPromise;
  }

  getLobby(): PersistentDuoLobbyData {
    return { ...this.data };
  }

  setDisplayName(value: unknown): string | null {
    const displayName = normalizePersistentDuoDisplayName(value);
    if (!displayName) return null;
    this.data.displayName = displayName;
    this.scheduleSave();
    return displayName;
  }

  private async load() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const raw = await fs.readFile(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Partial<PersistentDuoLobbyData>;
      const displayName = normalizePersistentDuoDisplayName(parsed.displayName);
      if (displayName) this.data.displayName = displayName;
    } catch {
      // Primeira execução ou arquivo inválido: usa o nome padrão.
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
    } catch (error) {
      console.error("Não foi possível salvar backend/data/persistent-duo-lobby.json:", error);
    } finally {
      this.savingNow = false;
      if (this.saveAgainAfter) {
        this.saveAgainAfter = false;
        this.scheduleSave();
      }
    }
  }
}

export const persistentDuoStore = new PersistentDuoStore();

export function isPersistentDuoAccountId(value: unknown): value is AccountId {
  return isAccountId(value);
}

export function isPersistentDuoPresence(value: unknown): value is Exclude<PersistentDuoPresence, "offline"> {
  return value === "lobby" || value === "world" || value === "minigame";
}
