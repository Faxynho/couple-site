import { AccountId } from "./accountSession";
import { GameEnvironment, IdleEventType, IdleModeId, IdleSnapshot } from "./idleTypes";

const API_BASE = (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000").replace(/\/+$/, "");

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || "Não foi possível falar com o servidor.");
  return body as T;
}

export async function fetchIdleSnapshot(accountId: AccountId, environment: GameEnvironment = "real"): Promise<IdleSnapshot> {
  const response = await fetch(`${API_BASE}/api/idle?accountId=${accountId}&environment=${environment}`, { cache: "no-store" });
  return parse<IdleSnapshot>(response);
}

export async function enterIdleMode(accountId: AccountId, mode: IdleModeId, environment: GameEnvironment = "real"): Promise<IdleSnapshot> {
  const response = await fetch(`${API_BASE}/api/idle/enter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by: accountId, mode, environment }),
  });
  return parse<IdleSnapshot>(response);
}

export async function idleItemAction(accountId: AccountId, mode: IdleModeId, itemId: string, action: "buy" | "upgrade", environment: GameEnvironment = "real"): Promise<IdleSnapshot> {
  const response = await fetch(`${API_BASE}/api/idle/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by: accountId, mode, itemId, action, environment }),
  });
  return parse<IdleSnapshot>(response);
}

export async function idleRelicUpgrade(accountId: AccountId, relicId: string, environment: GameEnvironment = "real"): Promise<IdleSnapshot> {
  return parse<IdleSnapshot>(await fetch(`${API_BASE}/api/idle/relic/upgrade`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by: accountId, relicId, environment }),
  }));
}

export async function idleUpgradeBatch(accountId: AccountId, mode: IdleModeId, itemId: string, count: number | "max", environment: GameEnvironment = "real"): Promise<{ ok: boolean; applied: number; requested: number; totalCost: number; error?: string; snapshot: IdleSnapshot }> {
  const response = await fetch(`${API_BASE}/api/idle/upgrade-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by: accountId, mode, itemId, count, environment }),
  });
  return parse<{ ok: boolean; applied: number; requested: number; totalCost: number; error?: string; snapshot: IdleSnapshot }>(response);
}

export async function idleClick(accountId: AccountId, mode: IdleModeId, itemId: string, environment: GameEnvironment = "real", source: "home" | "upgrades" = "home"): Promise<{ reward: number; multiplier: number; milestone: number; bonus: number; snapshot: IdleSnapshot }> {
  const response = await fetch(`${API_BASE}/api/idle/click`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by: accountId, mode, itemId, environment, source }),
  });
  return parse<{ reward: number; multiplier: number; milestone: number; bonus: number; snapshot: IdleSnapshot }>(response);
}

export async function recordIdleActivity(accountId: AccountId, mode: IdleModeId, elapsedMs: number, environment: GameEnvironment): Promise<IdleSnapshot> {
  return parse<IdleSnapshot>(await fetch(`${API_BASE}/api/idle/activity`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by: accountId, mode, elapsedMs, environment }),
  }));
}

export async function collectIdleEvent(accountId: AccountId, mode: IdleModeId, eventId: string, environment: GameEnvironment) {
  return parse<{ ok: true; reward: number; eventType: IdleEventType; snapshot: IdleSnapshot }>(await fetch(`${API_BASE}/api/idle/event/collect`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by: accountId, mode, eventId, environment }),
  }));
}

export async function idleDevAction(payload: Record<string, unknown>): Promise<IdleSnapshot> {
  const body = await parse<{ ok: true; snapshot: IdleSnapshot }>(await fetch(`${API_BASE}/api/idle/dev/action`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, by: "andre" }),
  }));
  return body.snapshot;
}

export async function addIdleTestFunds(target: "global" | IdleModeId, amount: number, by: AccountId): Promise<IdleSnapshot> {
  const response = await fetch(`${API_BASE}/api/idle/dev/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by, target, amount }),
  });
  const body = await parse<{ ok: true; snapshot: IdleSnapshot }>(response);
  return body.snapshot;
}

export async function resetIdle(target: "global" | IdleModeId, by: AccountId): Promise<IdleSnapshot> {
  const response = await fetch(`${API_BASE}/api/idle/reset/${target}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by }),
  });
  const body = await parse<{ ok: true; snapshot: IdleSnapshot }>(response);
  return body.snapshot;
}

// ---------------------------------------------------------------------------
// Mecânicas experimentais do Mundo da Hello Kitty (somente ambiente DEV / conta André)
// ---------------------------------------------------------------------------
async function kittyDevPost(path: string, payload: Record<string, unknown>): Promise<IdleSnapshot> {
  return parse<IdleSnapshot>(await fetch(`${API_BASE}/api/idle/kitty-dev/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, by: "andre" }),
  }));
}

export const kittyDevBuyConstellation = (characterId: string) => kittyDevPost("constellation", { characterId });
export const kittyDevBuyItem = (characterId: string, kind: "click" | "stone") => kittyDevPost("item", { characterId, kind });
export const kittyDevAwaken = (characterId: string) => kittyDevPost("awaken", { characterId });
export const kittyDevSetWorld = (world: number | null) => kittyDevPost("world", { world });
export const kittyDevSetSkin = (characterId: string, awake: boolean) => kittyDevPost("skin", { characterId, awake });
