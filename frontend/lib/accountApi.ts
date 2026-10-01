import { AccountId } from "@/lib/accountSession";
import { AccountProfile, AccountsOverview, ProfileBorderState, PublicAccountProfile } from "@/lib/accountTypes";

// Remove uma barra "/" no final por engano (ex.: NEXT_PUBLIC_SOCKET_URL=http://localhost:4000/)
// — sem isso, toda chamada aqui embaixo viraria "http://localhost:4000//api/accounts" (barra dupla).
const API_BASE = (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000").replace(/\/+$/, "");

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || "Não foi possível falar com o servidor.");
  }
  return res.json();
}

export async function fetchAccounts(): Promise<PublicAccountProfile[]> {
  const res = await fetch(`${API_BASE}/api/accounts`, { cache: "no-store" });
  const data = await parseOrThrow<{ accounts: PublicAccountProfile[] }>(res);
  return data.accounts;
}

export async function fetchAccountsOverview(): Promise<AccountsOverview> {
  const res = await fetch(`${API_BASE}/api/accounts/overview`, { cache: "no-store" });
  return parseOrThrow<AccountsOverview>(res);
}

export async function updateAccountProfile(
  id: AccountId,
  patch: { name?: string; photo?: string | null; border?: string | null }
): Promise<AccountProfile> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await parseOrThrow<{ profile: AccountProfile }>(res);
  return data.profile;
}

/** Borda equipada, bordas possuídas, preços e saldo de moedas globais. */
export async function fetchBorderState(id: AccountId): Promise<ProfileBorderState> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}/borders`, { cache: "no-store" });
  return parseOrThrow<ProfileBorderState>(res);
}

export class BorderPurchaseError extends Error {
  /** Estado atual devolvido pelo servidor (saldo correto) quando a compra falha. */
  state: Partial<ProfileBorderState> | null;
  constructor(message: string, state: Partial<ProfileBorderState> | null) {
    super(message);
    this.name = "BorderPurchaseError";
    this.state = state;
  }
}

/** Compra uma borda com as moedas globais. Comprar não equipa: a borda só
 *  aparece depois de salvar o perfil escolhendo-a. */
export async function purchaseBorder(id: AccountId, borderId: string): Promise<ProfileBorderState & { alreadyOwned: boolean }> {
  const res = await fetch(`${API_BASE}/api/accounts/${id}/borders/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by: id, borderId }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new BorderPurchaseError(body?.error || "Não foi possível comprar agora.", body);
  }
  return body as ProfileBorderState & { alreadyOwned: boolean };
}

/** As quatro categorias resetáveis na aba Configurações — cada uma some
 *  separada das outras, pra corrigir só a parte que bugou. `by` é a conta
 *  ativa de quem está pedindo (o backend só aceita "andre", ver accountsRoutes.ts). */
async function resetRequest(path: string, by: AccountId): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ by }),
  });
  await parseOrThrow<{ ok: true }>(res);
}

export function resetSoloStats(id: AccountId, by: AccountId): Promise<void> {
  return resetRequest(`/api/accounts/${id}/solo-stats`, by);
}

export function resetDuoSharedStats(by: AccountId): Promise<void> {
  return resetRequest(`/api/accounts/duo-shared-stats`, by);
}

export function resetDuoParticipation(id: AccountId, by: AccountId): Promise<void> {
  return resetRequest(`/api/accounts/${id}/duo-stats`, by);
}

export function resetRecords(id: AccountId, mode: "solo" | "duo", by: AccountId): Promise<void> {
  return resetRequest(`/api/accounts/${id}/records/${mode}`, by);
}

export function resetTogetherRecords(by: AccountId): Promise<void> {
  return resetRequest(`/api/accounts/records/together`, by);
}

/** Redimensiona e comprime a imagem escolhida para um quadrado de até
 *  256x256 em JPEG antes de mandar pro servidor — um avatar não precisa da
 *  resolução original da foto, e isso mantém `accounts.json` pequeno. */
export function resizeImageToDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const size = Math.min(maxSize, side);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível processar a imagem."));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
