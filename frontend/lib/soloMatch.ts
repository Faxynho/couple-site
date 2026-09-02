"use client";

import { AccountId, getActiveAccount } from "@/lib/accountSession";
import { GAMES } from "@/lib/games";
import { getSocket } from "@/lib/socket";
import { GameId, RoomSnapshot } from "@/lib/types";

export const SOLO_MATCH_STORAGE_KEY = "couple-site:solo-active-matches:v1";
export const SOLO_MATCH_CHANGED_EVENT = "couple-site:solo-match-changed";

export interface SoloMatchSave {
  version: 1;
  ownerId: AccountId;
  gameId: GameId;
  gameName: string;
  roomCode: string;
  playerId: string;
  playerName: string;
  savedAt: number;
  state: unknown;
}

interface SoloMatchStore {
  version: 1;
  profiles: Partial<Record<AccountId, SoloMatchSave>>;
}

export interface SoloStatePayload {
  ownerId: AccountId;
  room: RoomSnapshot;
  playerId: string;
  playerName: string;
  state: unknown;
  savedAt: number;
}

export interface ResumeSoloMatchResult {
  ok: boolean;
  room?: RoomSnapshot;
  error?: string;
}

function emptyStore(): SoloMatchStore {
  return { version: 1, profiles: {} };
}

function isGameId(value: unknown): value is GameId {
  return GAMES.some((game) => game.id === value);
}

function isSave(value: unknown, ownerId: AccountId): value is SoloMatchSave {
  if (!value || typeof value !== "object") return false;
  const save = value as Partial<SoloMatchSave>;
  return save.version === 1 && save.ownerId === ownerId && isGameId(save.gameId) &&
    typeof save.gameName === "string" && typeof save.roomCode === "string" &&
    typeof save.playerId === "string" && typeof save.playerName === "string" &&
    typeof save.savedAt === "number" && save.state !== null && typeof save.state === "object";
}

function readStore(): SoloMatchStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SOLO_MATCH_STORAGE_KEY) ?? "null") as Partial<SoloMatchStore> | null;
    if (!parsed || parsed.version !== 1 || !parsed.profiles || typeof parsed.profiles !== "object") return emptyStore();
    const profiles: SoloMatchStore["profiles"] = {};
    if (isSave(parsed.profiles.andre, "andre")) profiles.andre = parsed.profiles.andre;
    if (isSave(parsed.profiles.flavia, "flavia")) profiles.flavia = parsed.profiles.flavia;
    return { version: 1, profiles };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: SoloMatchStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOLO_MATCH_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(SOLO_MATCH_CHANGED_EVENT));
}

export function getSoloMatch(ownerId: AccountId): SoloMatchSave | null {
  return readStore().profiles[ownerId] ?? null;
}

export function getActiveProfileSoloMatch(): SoloMatchSave | null {
  const active = getActiveAccount();
  return active?.type === "account" ? getSoloMatch(active.id) : null;
}

export function saveSoloState(payload: SoloStatePayload): SoloMatchSave | null {
  if (payload.room.roomMode !== "solo" || !payload.room.gameId || !isGameId(payload.room.gameId)) return null;

  if (payload.room.status === "finished") {
    // Uma sala antiga cancelada ainda pode terminar no servidor. Ela nunca
    // pode apagar o save da partida nova que a substituiu.
    if (getSoloMatch(payload.ownerId)?.roomCode === payload.room.code) clearSoloMatch(payload.ownerId);
    return null;
  }

  const active = getActiveAccount();
  if (active?.type !== "account" || active.id !== payload.ownerId) return null;

  const game = GAMES.find((entry) => entry.id === payload.room.gameId)!;
  const save: SoloMatchSave = {
    version: 1,
    ownerId: payload.ownerId,
    gameId: payload.room.gameId,
    gameName: game.name,
    roomCode: payload.room.code,
    playerId: payload.playerId,
    playerName: payload.playerName,
    savedAt: payload.savedAt,
    state: payload.state,
  };
  const store = readStore();
  const current = store.profiles[payload.ownerId];
  // A troca de partida precisa passar pelo modal de conflito, que limpa o
  // save anterior explicitamente. Eventos atrasados nunca sobrescrevem.
  if (current && current.roomCode !== save.roomCode) return null;
  store.profiles[payload.ownerId] = save;
  writeStore(store);
  return save;
}

/** Atualiza o snapshot do Air Hockey Solo, cuja simulação roda localmente. */
export function updateActiveSoloState(gameId: GameId, state: unknown): void {
  const active = getActiveAccount();
  if (active?.type !== "account") return;
  const store = readStore();
  const current = store.profiles[active.id];
  if (!current || current.gameId !== gameId) return;
  store.profiles[active.id] = { ...current, state, savedAt: Date.now() };
  writeStore(store);
}

export function clearSoloMatch(ownerId: AccountId): void {
  const store = readStore();
  if (!store.profiles[ownerId]) return;
  delete store.profiles[ownerId];
  writeStore(store);
}

/** Caminho único de restauração usado tanto no retorno ao app quanto no
 * conflito ao tentar iniciar outra partida. */
export function resumeSoloMatch(save: SoloMatchSave): Promise<ResumeSoloMatchResult> {
  return new Promise((resolve) => {
    getSocket().emit("solo:resume", save, (response: ResumeSoloMatchResult) => {
      if (response.ok && response.room?.gameId) {
        // A sala restaurada recebe outro código. O ACK chega antes do novo
        // snapshot, então removemos o envelope antigo para permitir que o
        // snapshot da sala restaurada se torne o único save ativo.
        clearSoloMatch(save.ownerId);
      }
      resolve(response);
    });
  });
}

export function subscribeToSoloMatchChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SOLO_MATCH_CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SOLO_MATCH_CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
