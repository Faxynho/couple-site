import { ALL_GAME_IDS, GameId } from "../types";

export interface SoloResumePayload {
  version: 1;
  ownerId: "andre" | "flavia";
  gameId: GameId;
  gameName: string;
  roomCode: string;
  playerId: string;
  playerName: string;
  savedAt: number;
  state: unknown;
}

export function isSoloResumePayload(value: unknown): value is SoloResumePayload {
  if (!value || typeof value !== "object") return false;
  const save = value as Partial<SoloResumePayload>;
  if (save.version !== 1 || (save.ownerId !== "andre" && save.ownerId !== "flavia")) return false;
  if (!save.gameId || !ALL_GAME_IDS.includes(save.gameId)) return false;
  if (typeof save.playerId !== "string" || !save.playerId.trim() || save.playerId.length > 200) return false;
  if (typeof save.playerName !== "string" || save.playerName.length > 100) return false;
  if (typeof save.savedAt !== "number" || !Number.isFinite(save.savedAt) || save.savedAt <= 0) return false;
  if (!save.state || typeof save.state !== "object" || Array.isArray(save.state)) return false;
  try {
    return JSON.stringify(save.state).length <= 5_000_000;
  } catch {
    return false;
  }
}

export function isFinishedSoloState(gameId: GameId, state: unknown): boolean {
  if (!state || typeof state !== "object") return true;
  const value = state as Record<string, unknown>;
  if (gameId === "puzzle") return value.solved === true;
  if (gameId === "airhockey" || gameId === "rpg" || gameId === "casino") return value.phase === "finished";
  if (gameId === "chess") return value.result !== null && value.result !== undefined;
  return value.finished === true;
}

/**
 * O tempo longe do app não conta como tempo jogado. Todo campo de timestamp
 * absoluto é deslocado pelo intervalo entre o autosave e a restauração; durações
 * como timeMs e timeUsedMs permanecem intactas.
 */
export function rebaseSoloState<T>(state: T, savedAt: number, now = Date.now()): T {
  const clone = structuredClone(state);
  const delta = Math.max(0, now - savedAt);
  const seen = new WeakSet<object>();

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object" || seen.has(value as object)) return;
    seen.add(value as object);
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (typeof entry === "number" && entry > 100_000_000_000 && (key.endsWith("At") || key.endsWith("Until"))) {
        (value as Record<string, unknown>)[key] = entry + delta;
      } else {
        visit(entry);
      }
    }
  };

  visit(clone);
  return clone;
}
