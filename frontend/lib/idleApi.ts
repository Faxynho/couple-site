import { AccountId } from "./accountSession";
import { IdleModeId, IdleSnapshot } from "./idleTypes";

const API_BASE = (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000").replace(/\/+$/, "");

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || "Não foi possível falar com o servidor.");
  return body as T;
}

export async function fetchIdleSnapshot(accountId: AccountId): Promise<IdleSnapshot> {
  const response = await fetch(`${API_BASE}/api/idle?accountId=${accountId}`, { cache: "no-store" });
  return parse<IdleSnapshot>(response);
}

export async function enterIdleMode(accountId: AccountId, mode: IdleModeId): Promise<IdleSnapshot> {
  const response = await fetch(`${API_BASE}/api/idle/enter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by: accountId, mode }),
  });
  return parse<IdleSnapshot>(response);
}

export async function idleItemAction(accountId: AccountId, mode: IdleModeId, itemId: string, action: "buy" | "upgrade"): Promise<IdleSnapshot> {
  const response = await fetch(`${API_BASE}/api/idle/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by: accountId, mode, itemId, action }),
  });
  return parse<IdleSnapshot>(response);
}

export async function idleClick(accountId: AccountId, mode: IdleModeId, itemId: string): Promise<{ reward: number; snapshot: IdleSnapshot }> {
  const response = await fetch(`${API_BASE}/api/idle/click`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by: accountId, mode, itemId }),
  });
  return parse<{ reward: number; snapshot: IdleSnapshot }>(response);
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
