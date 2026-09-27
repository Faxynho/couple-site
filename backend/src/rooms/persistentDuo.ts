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

export type SharedDrawingTool = "brush" | "eraser" | "fill" | "shape";

export type SharedDrawingShape =
  | "line"
  | "square"
  | "rectangle"
  | "circle"
  | "triangle"
  | "star"
  | "diamond"
  | "arrow";

export interface SharedDrawingPoint {
  x: number;
  y: number;
}

export interface SharedDrawingStroke {
  id: string;
  tool: SharedDrawingTool;
  color: string;
  size: number;
  points: SharedDrawingPoint[];
  shape?: SharedDrawingShape;
}

export interface SharedDrawingBoard {
  revision: number;
  strokes: SharedDrawingStroke[];
  redoStrokes: SharedDrawingStroke[];
  updatedAt: number;
}

export interface SharedDrawingBoardSnapshot {
  revision: number;
  strokes: SharedDrawingStroke[];
  canUndo: boolean;
  canRedo: boolean;
  updatedAt: number;
}

interface PersistentDuoStoredData extends PersistentDuoLobbyData {
  drawing: SharedDrawingBoard;
  petRooms: Record<PetRoomId, PetRoomState>;
  petRoomsDev: Record<PetRoomId, PetRoomState>;
}

export type PetRoomId = "nix" | "max";
export interface PetRoomState {
  revision: number;
  slots: Record<string, string>;
}
export interface PetRoomSnapshot extends PetRoomState {
  petId: PetRoomId;
  environment: "real" | "dev";
}

// These IDs mirror the visual catalog. Reject unknown IDs and never trust a client slot.
const PET_DECORATION_SLOTS: Record<string, string> = {
  "heart-frame": "wall-heart", "paw-poster": "wall-paw", shelf: "wall-shelf",
  plant: "floor-plant", rug: "floor-rug", bed: "floor-bed",
  dresser: "floor-dresser", lamp: "floor-lamp", bowls: "floor-bowls", bone: "floor-bone",
};
const DEFAULT_PET_ROOM_SLOTS = Object.fromEntries(
  Object.entries(PET_DECORATION_SLOTS).map(([id, slot]) => [slot, id]),
);
const newPetRoomState = (equipped = false): PetRoomState => ({ revision: 0, slots: equipped ? { ...DEFAULT_PET_ROOM_SLOTS } : {} });

export function isPetRoomId(value: unknown): value is PetRoomId {
  return value === "nix" || value === "max";
}

function sanitizePetRoomState(value: unknown, seedLegacyComposition: boolean): PetRoomState {
  const input = value && typeof value === "object" ? value as Partial<PetRoomState> : {};
  const revision = Number.isSafeInteger(input.revision) && Number(input.revision) >= 0 ? Number(input.revision) : 0;
  // The original rooms started with an empty revision-0 catalog. Seed the new
  // composition once; a room the user has changed keeps its chosen items.
  if (seedLegacyComposition && revision === 0 && (!input.slots || Object.keys(input.slots).length === 0)) return newPetRoomState(true);
  const slots: Record<string, string> = {};
  if (input.slots && typeof input.slots === "object" && !Array.isArray(input.slots)) {
    for (const [slot, id] of Object.entries(input.slots)) {
      if (typeof id !== "string") continue;
      if (PET_DECORATION_SLOTS[id] === slot) slots[slot] = id;
      // Both framed pictures used to share a slot in the previous catalog.
      else if (slot === "wall-left" && (id === "heart-frame" || id === "paw-poster")) {
        slots[PET_DECORATION_SLOTS[id]] = id;
      }
    }
  }
  return { revision, slots };
}

export const SHARED_DRAWING_COLORS = [
  "#111827",
  "#ffffff",
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#facc15",
  "#ec4899",
  "#8b5cf6",
] as const;
export const SHARED_DRAWING_MIN_SIZE = 0.003;
export const SHARED_DRAWING_MAX_SIZE = 0.05;
export const SHARED_DRAWING_DEFAULT_SIZE = 0.014;
export const SHARED_DRAWING_MAX_STROKES = 1_000;
export const SHARED_DRAWING_MAX_POINTS_PER_STROKE = 500;
export const SHARED_DRAWING_MAX_TOTAL_POINTS = 100_000;

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "persistent-duo-lobby.json");
const SAVE_DEBOUNCE_MS = 800;

function emptyDrawingBoard(): SharedDrawingBoard {
  return { revision: 0, strokes: [], redoStrokes: [], updatedAt: Date.now() };
}

function cloneStroke(stroke: SharedDrawingStroke): SharedDrawingStroke {
  return { ...stroke, points: stroke.points.map((point) => ({ ...point })) };
}

function cloneDrawingBoard(board: SharedDrawingBoard): SharedDrawingBoardSnapshot {
  return {
    revision: board.revision,
    strokes: board.strokes.map(cloneStroke),
    canUndo: board.strokes.length > 0,
    canRedo: board.redoStrokes.length > 0,
    updatedAt: board.updatedAt,
  };
}

function isDrawingColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function isDrawingSize(value: unknown): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && value >= SHARED_DRAWING_MIN_SIZE
    && value <= SHARED_DRAWING_MAX_SIZE;
}

function isDrawingShape(value: unknown): value is SharedDrawingShape {
  return value === "line"
    || value === "square"
    || value === "rectangle"
    || value === "circle"
    || value === "triangle"
    || value === "star"
    || value === "diamond"
    || value === "arrow";
}

/** Valida e normaliza um traço vindo do navegador antes de persistir. */
export function normalizeSharedDrawingStroke(value: unknown): SharedDrawingStroke | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<SharedDrawingStroke>;
  if (typeof input.id !== "string" || !/^[A-Za-z0-9_-]{8,80}$/.test(input.id)) return null;
  if (input.tool !== "brush" && input.tool !== "eraser" && input.tool !== "fill" && input.tool !== "shape") return null;
  if (!isDrawingColor(input.color) || !isDrawingSize(input.size) || !Array.isArray(input.points)) return null;
  if (input.points.length < 1 || input.points.length > SHARED_DRAWING_MAX_POINTS_PER_STROKE) return null;
  if (input.tool === "fill" && input.points.length !== 1) return null;
  if (input.tool === "shape" && (input.points.length !== 2 || !isDrawingShape(input.shape))) return null;

  const points: SharedDrawingPoint[] = [];
  for (const valuePoint of input.points) {
    if (!valuePoint || typeof valuePoint !== "object") return null;
    const point = valuePoint as Partial<SharedDrawingPoint>;
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
    const x = Number(point.x);
    const y = Number(point.y);
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    points.push({ x: Math.round(x * 100_000) / 100_000, y: Math.round(y * 100_000) / 100_000 });
  }

  const normalized: SharedDrawingStroke = {
    id: input.id,
    tool: input.tool,
    color: input.color.toLowerCase(),
    size: Math.round(input.size * 1_000) / 1_000,
    points,
  };
  if (input.tool === "shape") normalized.shape = input.shape;
  return normalized;
}

function sanitizeDrawingBoard(value: unknown): SharedDrawingBoard {
  const empty = emptyDrawingBoard();
  if (!value || typeof value !== "object") return empty;
  const input = value as Partial<SharedDrawingBoard>;
  const strokes: SharedDrawingStroke[] = [];
  const redoStrokes: SharedDrawingStroke[] = [];
  let pointCount = 0;
  for (const rawStroke of Array.isArray(input.strokes) ? input.strokes : []) {
    if (strokes.length >= SHARED_DRAWING_MAX_STROKES) break;
    const stroke = normalizeSharedDrawingStroke(rawStroke);
    if (!stroke || pointCount + stroke.points.length > SHARED_DRAWING_MAX_TOTAL_POINTS) continue;
    strokes.push(stroke);
    pointCount += stroke.points.length;
  }
  for (const rawStroke of Array.isArray(input.redoStrokes) ? input.redoStrokes : []) {
    if (strokes.length + redoStrokes.length >= SHARED_DRAWING_MAX_STROKES) break;
    const stroke = normalizeSharedDrawingStroke(rawStroke);
    if (!stroke || pointCount + stroke.points.length > SHARED_DRAWING_MAX_TOTAL_POINTS) continue;
    redoStrokes.push(stroke);
    pointCount += stroke.points.length;
  }
  return {
    revision: Number.isSafeInteger(input.revision) && Number(input.revision) >= 0 ? Number(input.revision) : 0,
    strokes,
    redoStrokes,
    updatedAt: Number.isFinite(input.updatedAt) ? Number(input.updatedAt) : empty.updatedAt,
  };
}

export function normalizePersistentDuoDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  return Array.from(normalized).slice(0, PERSISTENT_DUO_DISPLAY_NAME_MAX_LENGTH).join("");
}

export class PersistentDuoStore {
  private data: PersistentDuoStoredData = {
    displayName: PERSISTENT_DUO_DEFAULT_DISPLAY_NAME,
    drawing: emptyDrawingBoard(),
    petRooms: { nix: newPetRoomState(true), max: newPetRoomState(true) },
    petRoomsDev: { nix: newPetRoomState(), max: newPetRoomState() },
  };
  private loadPromise: Promise<void> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savingNow = false;
  private saveAgainAfter = false;

  constructor(private readonly shouldPersist = true) {}

  ready(): Promise<void> {
    if (!this.loadPromise) this.loadPromise = this.load();
    return this.loadPromise;
  }

  getLobby(): PersistentDuoLobbyData {
    return { displayName: this.data.displayName };
  }

  getDrawingBoard(): SharedDrawingBoardSnapshot {
    return cloneDrawingBoard(this.data.drawing);
  }

  getPetRoom(petId: PetRoomId, environment: "real" | "dev" = "real"): PetRoomSnapshot {
    const state = environment === "dev" ? this.data.petRoomsDev[petId] : this.data.petRooms[petId];
    return { petId, environment, revision: state.revision, slots: { ...state.slots } };
  }

  togglePetDecoration(petId: PetRoomId, decorationId: unknown, environment: "real" | "dev" = "real"): PetRoomSnapshot | null {
    if (typeof decorationId !== "string") return null;
    const slot = PET_DECORATION_SLOTS[decorationId];
    if (!slot) return null;
    const state = environment === "dev" ? this.data.petRoomsDev[petId] : this.data.petRooms[petId];
    if (state.slots[slot] === decorationId) delete state.slots[slot];
    else state.slots[slot] = decorationId;
    state.revision++;
    this.scheduleSave();
    return this.getPetRoom(petId, environment);
  }

  resetPetRoom(petId: PetRoomId, environment: "real" | "dev"): PetRoomSnapshot {
    const rooms = environment === "dev" ? this.data.petRoomsDev : this.data.petRooms;
    rooms[petId] = newPetRoomState();
    rooms[petId].revision += 1;
    this.scheduleSave();
    return this.getPetRoom(petId, environment);
  }

  removePetDecoration(decorationId: string, environment: "real" | "dev"): void {
    const rooms = environment === "dev" ? this.data.petRoomsDev : this.data.petRooms;
    for (const petId of ["nix", "max"] as const) {
      const state = rooms[petId];
      let changed = false;
      for (const slot of Object.keys(state.slots)) {
        if (state.slots[slot] === decorationId) {
          delete state.slots[slot];
          changed = true;
        }
      }
      if (changed) state.revision += 1;
    }
    this.scheduleSave();
  }

  resetPetEnvironment(environment: "real" | "dev"): Record<PetRoomId, PetRoomSnapshot> {
    const rooms = environment === "dev" ? this.data.petRoomsDev : this.data.petRooms;
    rooms.nix = newPetRoomState();
    rooms.max = newPetRoomState();
    rooms.nix.revision += 1;
    rooms.max.revision += 1;
    this.scheduleSave();
    return { nix: this.getPetRoom("nix", environment), max: this.getPetRoom("max", environment) };
  }

  setDisplayName(value: unknown): string | null {
    const displayName = normalizePersistentDuoDisplayName(value);
    if (!displayName) return null;
    this.data.displayName = displayName;
    this.scheduleSave();
    return displayName;
  }

  addDrawingStroke(value: unknown): { stroke?: SharedDrawingStroke; error?: string } {
    const stroke = normalizeSharedDrawingStroke(value);
    if (!stroke) return { error: "Traço inválido." };
    if (this.data.drawing.strokes.some((item) => item.id === stroke.id)) return { error: "Este traço já foi salvo." };
    if (this.data.drawing.strokes.length >= SHARED_DRAWING_MAX_STROKES) {
      return { error: "O quadro atingiu o limite de traços. Apague tudo para começar um desenho novo." };
    }
    const totalPoints = this.data.drawing.strokes.reduce((sum, item) => sum + item.points.length, 0);
    if (totalPoints + stroke.points.length > SHARED_DRAWING_MAX_TOTAL_POINTS) {
      return { error: "O quadro atingiu o limite de detalhes. Apague tudo para começar um desenho novo." };
    }
    this.data.drawing.strokes.push(stroke);
    this.data.drawing.redoStrokes = [];
    this.data.drawing.revision += 1;
    this.data.drawing.updatedAt = Date.now();
    this.scheduleSave();
    return { stroke: cloneStroke(stroke) };
  }

  undoDrawingStroke(): { board?: SharedDrawingBoardSnapshot; error?: string } {
    const stroke = this.data.drawing.strokes.pop();
    if (!stroke) return { error: "Não há traços para desfazer." };
    this.data.drawing.redoStrokes.push(stroke);
    this.data.drawing.revision += 1;
    this.data.drawing.updatedAt = Date.now();
    this.scheduleSave();
    return { board: this.getDrawingBoard() };
  }

  redoDrawingStroke(): { board?: SharedDrawingBoardSnapshot; error?: string } {
    const stroke = this.data.drawing.redoStrokes.pop();
    if (!stroke) return { error: "Não há traços para refazer." };
    this.data.drawing.strokes.push(stroke);
    this.data.drawing.revision += 1;
    this.data.drawing.updatedAt = Date.now();
    this.scheduleSave();
    return { board: this.getDrawingBoard() };
  }

  clearDrawingBoard(): Pick<SharedDrawingBoard, "revision" | "updatedAt"> {
    this.data.drawing = {
      revision: this.data.drawing.revision + 1,
      strokes: [],
      redoStrokes: [],
      updatedAt: Date.now(),
    };
    this.scheduleSave();
    return { revision: this.data.drawing.revision, updatedAt: this.data.drawing.updatedAt };
  }

  private async load() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const raw = await fs.readFile(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Partial<PersistentDuoStoredData>;
      const displayName = normalizePersistentDuoDisplayName(parsed.displayName);
      if (displayName) this.data.displayName = displayName;
      this.data.drawing = sanitizeDrawingBoard(parsed.drawing);
      this.data.petRooms = {
        nix: sanitizePetRoomState(parsed.petRooms?.nix, true),
        max: sanitizePetRoomState(parsed.petRooms?.max, true),
      };
      this.data.petRoomsDev = {
        nix: sanitizePetRoomState(parsed.petRoomsDev?.nix, false),
        max: sanitizePetRoomState(parsed.petRoomsDev?.max, false),
      };
    } catch {
      // Primeira execução ou arquivo inválido: usa o nome padrão.
    }
  }

  private scheduleSave() {
    if (!this.shouldPersist) return;
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
      // O quadro pode acumular muitos pontos; JSON compacto evita inflar o
      // volume persistente sem mudar a estrutura ou a precisão do desenho.
      await fs.writeFile(tmpFile, JSON.stringify(this.data), "utf-8");
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
