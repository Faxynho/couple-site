import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ACCOUNT_IDS, AccountId, isAccountId } from "../accounts/types";
import { canPlaceDecoration, clampWorldPosition, defaultWorldPlayer, isWorldDecorationType, isWorldDirection, isWorldScene } from "./worldConfig";
import { PersistentWorldData, WORLD_ID, WorldDecoration, WorldPlayerState, WorldSceneId } from "./types";

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "persistent-world.json");
const SAVE_DEBOUNCE_MS = 900;

function emptyData(): PersistentWorldData {
  return {
    version: 1,
    worldId: WORLD_ID,
    players: { andre: defaultWorldPlayer("andre"), flavia: defaultWorldPlayer("flavia") },
    decorations: [],
    updatedAt: Date.now(),
  };
}

function sanitizePlayer(value: unknown, accountId: AccountId): WorldPlayerState {
  const fallback = defaultWorldPlayer(accountId);
  if (!value || typeof value !== "object") return fallback;
  const item = value as Partial<WorldPlayerState>;
  const scene = isWorldScene(item.scene) ? item.scene : fallback.scene;
  const position = clampWorldPosition(scene, Number(item.x), Number(item.y));
  return {
    accountId,
    scene,
    x: Number.isFinite(position.x) ? position.x : fallback.x,
    y: Number.isFinite(position.y) ? position.y : fallback.y,
    direction: isWorldDirection(item.direction) ? item.direction : fallback.direction,
    moving: false,
    skinId: typeof item.skinId === "string" && item.skinId === `${accountId}-default` ? item.skinId : fallback.skinId,
    updatedAt: Number.isFinite(item.updatedAt) ? Number(item.updatedAt) : fallback.updatedAt,
  };
}

function sanitizeDecoration(value: unknown): WorldDecoration | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<WorldDecoration>;
  if (typeof item.id !== "string" || !isWorldDecorationType(item.type) || !isWorldScene(item.scene) || !Number.isInteger(item.gridX) || !Number.isInteger(item.gridY) || !isAccountId(item.placedBy)) return null;
  return { id: item.id.slice(0, 80), type: item.type, scene: item.scene, gridX: Number(item.gridX), gridY: Number(item.gridY), placedBy: item.placedBy, updatedAt: Number(item.updatedAt) || Date.now() };
}

class WorldStore {
  private data = emptyData();
  private loadPromise: Promise<void> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savingNow = false;
  private saveAgainAfter = false;

  ready(): Promise<void> {
    if (!this.loadPromise) this.loadPromise = this.load();
    return this.loadPromise;
  }

  getPlayer(accountId: AccountId): WorldPlayerState {
    return { ...this.data.players[accountId], moving: false };
  }

  getDecorations(): WorldDecoration[] {
    return this.data.decorations.map((item) => ({ ...item }));
  }

  setPlayer(accountId: AccountId, state: Omit<WorldPlayerState, "accountId" | "skinId" | "updatedAt"> & { skinId?: string }): WorldPlayerState {
    const position = clampWorldPosition(state.scene, state.x, state.y);
    const next: WorldPlayerState = {
      accountId,
      scene: state.scene,
      x: position.x,
      y: position.y,
      direction: state.direction,
      moving: state.moving,
      skinId: state.skinId === `${accountId}-default` ? state.skinId : `${accountId}-default`,
      updatedAt: Date.now(),
    };
    this.data.players[accountId] = next;
    this.touch();
    return { ...next };
  }

  changeScene(accountId: AccountId, scene: WorldSceneId, x: number, y: number): WorldPlayerState {
    const current = this.data.players[accountId];
    return this.setPlayer(accountId, { scene, x, y, direction: scene === "exterior" ? "down" : "up", moving: false, skinId: current.skinId });
  }

  placeDecoration(accountId: AccountId, input: Pick<WorldDecoration, "type" | "scene" | "gridX" | "gridY">): WorldDecoration | null {
    if (!canPlaceDecoration(input.scene, input.type, input.gridX, input.gridY, this.data.decorations)) return null;
    const decoration: WorldDecoration = { ...input, id: randomUUID(), placedBy: accountId, updatedAt: Date.now() };
    this.data.decorations.push(decoration);
    this.touch();
    return { ...decoration };
  }

  moveDecoration(id: string, scene: WorldSceneId, gridX: number, gridY: number): WorldDecoration | null {
    const index = this.data.decorations.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const current = this.data.decorations[index];
    if (!canPlaceDecoration(scene, current.type, gridX, gridY, this.data.decorations, id)) return null;
    const next = { ...current, scene, gridX, gridY, updatedAt: Date.now() };
    this.data.decorations[index] = next;
    this.touch();
    return { ...next };
  }

  removeDecoration(id: string): boolean {
    const before = this.data.decorations.length;
    this.data.decorations = this.data.decorations.filter((item) => item.id !== id);
    if (this.data.decorations.length === before) return false;
    this.touch();
    return true;
  }

  private async load() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const raw = await fs.readFile(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<PersistentWorldData>;
      const loaded = emptyData();
      for (const accountId of ACCOUNT_IDS) loaded.players[accountId] = sanitizePlayer(parsed.players?.[accountId], accountId);
      const decorations: WorldDecoration[] = [];
      for (const value of Array.isArray(parsed.decorations) ? parsed.decorations : []) {
        const item = sanitizeDecoration(value);
        if (item && canPlaceDecoration(item.scene, item.type, item.gridX, item.gridY, decorations)) decorations.push(item);
      }
      loaded.decorations = decorations;
      loaded.updatedAt = Number(parsed.updatedAt) || Date.now();
      this.data = loaded;
    } catch {
      this.data = emptyData();
    }
  }

  private touch() {
    this.data.updatedAt = Date.now();
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => { this.saveTimer = null; void this.flush(); }, SAVE_DEBOUNCE_MS);
  }

  private async flush() {
    if (this.savingNow) { this.saveAgainAfter = true; return; }
    this.savingNow = true;
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tmp = `${DATA_FILE}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(this.data, null, 2), "utf8");
      await fs.rename(tmp, DATA_FILE);
    } catch (error) {
      console.error("Não foi possível salvar backend/data/persistent-world.json:", error);
    } finally {
      this.savingNow = false;
      if (this.saveAgainAfter) { this.saveAgainAfter = false; this.touch(); }
    }
  }
}

export const worldStore = new WorldStore();
