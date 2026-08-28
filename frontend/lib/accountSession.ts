export type AccountId = "andre" | "flavia";

/** "Quem está jogando neste navegador agora" — escolhido uma vez na tela
 *  inicial (antes de Duo/Solo) e lembrado entre visitas. Não é autenticação:
 *  é só um rótulo, qualquer um pode trocar a qualquer momento pelo botão de
 *  conta. Um Visitante nunca tem estatísticas/recordes guardados. */
export type ActiveAccount = { type: "account"; id: AccountId } | { type: "visitor" };

const STORAGE_KEY = "couple-site:active-account";
const CHANGE_EVENT = "couple-site:account-changed";

export function getActiveAccount(): ActiveAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.type === "visitor") return { type: "visitor" };
    if (parsed?.type === "account" && (parsed.id === "andre" || parsed.id === "flavia")) {
      return { type: "account", id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}

export function setActiveAccount(account: ActiveAccount) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Usado pelo botão "Trocar" dentro do painel de conta — volta para a tela
 *  de seleção sem apagar nome/foto salvos no servidor. */
export function clearActiveAccount() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Permite que o botão/painel de conta (montado uma vez em layout.tsx, fora
 *  da árvore da página) reaja quando a conta ativa muda em outro lugar — ex.:
 *  a tela de seleção acabou de escolher uma conta, ou "Trocar de conta" foi
 *  clicado dentro do próprio painel. Também sincroniza entre abas abertas. */
export function subscribeToActiveAccountChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Atalho usado pelo `useRoom` para anexar a conta ativa (se houver) em todo
 *  `room:create`/`room:join`, sem cada tela precisar saber disso. */
export function getActiveAccountId(): AccountId | undefined {
  const active = getActiveAccount();
  return active?.type === "account" ? active.id : undefined;
}
