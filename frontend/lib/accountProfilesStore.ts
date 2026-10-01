import { fetchAccounts } from "@/lib/accountApi";
import { subscribeToActiveAccountChange } from "@/lib/accountSession";
import type { AccountId, PublicAccountProfile } from "@/lib/accountTypes";

/**
 * Cache único dos perfis públicos (nome, foto, borda) das duas contas fixas.
 *
 * Antes, cada tela que mostrava uma foto buscava `/api/accounts` por conta
 * própria. Agora todas compartilham este cache: `useAccountPhotos` lê as fotos
 * daqui e o `AccountAvatar` lê a borda — por isso trocar a borda no perfil
 * aparece imediatamente em todos os avatares abertos (lobby, jogos, salas),
 * sem precisar alterar cada tela.
 *
 * Renova sozinho quando a conta ativa muda e quando a aba volta a ter foco
 * (é assim que uma borda trocada pelo par aparece para você).
 */

export type AccountProfilesMap = Partial<Record<AccountId, PublicAccountProfile>>;

const EMPTY: AccountProfilesMap = Object.freeze({}) as AccountProfilesMap;
/** Evita martelar o servidor se a aba ganhar/perder foco várias vezes. */
const FOCUS_REFRESH_MIN_INTERVAL_MS = 15_000;

let snapshot: AccountProfilesMap = EMPTY;
let loadedOnce = false;
let inflight: Promise<void> | null = null;
let lastRefreshAt = 0;
let listenersInstalled = false;
const subscribers = new Set<() => void>();

function emit() {
  subscribers.forEach((notify) => notify());
}

function sameProfile(a: PublicAccountProfile | undefined, b: PublicAccountProfile | undefined): boolean {
  if (!a || !b) return a === b;
  return a.id === b.id && a.name === b.name && a.photo === b.photo && (a.border ?? null) === (b.border ?? null);
}

function sameProfiles(a: AccountProfilesMap, b: AccountProfilesMap): boolean {
  return sameProfile(a.andre, b.andre) && sameProfile(a.flavia, b.flavia);
}

/** Busca os perfis no servidor e atualiza o cache. Falhas (servidor fora do ar,
 *  por exemplo) são silenciosas: fica o que já havia, e os avatares caem nas
 *  iniciais sem borda — nunca quebra a tela. */
export function refreshAccountProfiles(): Promise<void> {
  if (inflight) return inflight;
  lastRefreshAt = Date.now();
  inflight = Promise.resolve()
    .then(() => fetchAccounts())
    .then((accounts) => {
      const next: AccountProfilesMap = {};
      for (const account of accounts) next[account.id] = account;
      loadedOnce = true;
      if (!sameProfiles(snapshot, next)) {
        snapshot = next;
        emit();
      }
    })
    .catch(() => {
      // mantém o cache atual
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function installRefreshListeners() {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  subscribeToActiveAccountChange(() => void refreshAccountProfiles());
  const refreshIfStale = () => {
    if (document.visibilityState === "hidden") return;
    if (Date.now() - lastRefreshAt < FOCUS_REFRESH_MIN_INTERVAL_MS) return;
    void refreshAccountProfiles();
  };
  window.addEventListener("focus", refreshIfStale);
  document.addEventListener("visibilitychange", refreshIfStale);
}

/** Garante que o cache foi carregado ao menos uma vez (idempotente e barato
 *  de chamar de qualquer componente). */
export function ensureAccountProfilesLoaded() {
  installRefreshListeners();
  if (!loadedOnce && !inflight) void refreshAccountProfiles();
}

export function subscribeAccountProfiles(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function getAccountProfilesSnapshot(): AccountProfilesMap {
  return snapshot;
}

export function getServerAccountProfilesSnapshot(): AccountProfilesMap {
  return EMPTY;
}

/** Aplica no cache um perfil que acabou de ser salvo pelo próprio usuário, para
 *  a mudança aparecer em todos os avatares antes mesmo da próxima renovação. */
export function applyAccountProfileUpdate(profile: PublicAccountProfile) {
  const next = { ...snapshot, [profile.id]: profile };
  if (sameProfiles(snapshot, next)) return;
  snapshot = next;
  emit();
}

/** Só para testes: volta o cache ao estado inicial. */
export function resetAccountProfilesStoreForTests() {
  snapshot = EMPTY;
  loadedOnce = false;
  inflight = null;
  lastRefreshAt = 0;
}
