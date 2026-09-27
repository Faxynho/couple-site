import { AccountId } from "./accountSession";
import { GameEnvironment, IdleSnapshot } from "./idleTypes";
import { PetId, PetRoomSnapshot } from "@/pets/petRoomDecorations";

const API_BASE = (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000").replace(/\/+$/, "");
async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || "Não foi possível falar com o servidor.");
  return body as T;
}

export interface PetEconomySnapshot {
  room: PetRoomSnapshot;
  globalCoins: number;
  purchasedDecorations: string[];
  prices: Record<string, number>;
}

export async function fetchPetEconomy(accountId: AccountId, petId: PetId, environment: GameEnvironment) {
  return parse<PetEconomySnapshot>(await fetch(`${API_BASE}/api/pets?accountId=${accountId}&petId=${petId}&environment=${environment}`, { cache: "no-store" }));
}

export async function purchasePetDecoration(accountId: AccountId, decorationId: string, environment: GameEnvironment) {
  return parse<{ ok: true; alreadyOwned: boolean; snapshot: IdleSnapshot }>(await fetch(`${API_BASE}/api/pets/purchase`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by: accountId, decorationId, environment }),
  }));
}

export async function petDevAction(payload: Record<string, unknown>) {
  return parse<{ ok: true; snapshot?: IdleSnapshot; room?: PetRoomSnapshot }>(await fetch(`${API_BASE}/api/pets/dev/action`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, by: "andre" }),
  }));
}

export async function resetRealPetRooms() {
  return parse<{ ok: true }>(await fetch(`${API_BASE}/api/pets/admin/reset-real`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by: "andre", confirmation: "RESETAR QUARTOS DOS PETS" }),
  }));
}
