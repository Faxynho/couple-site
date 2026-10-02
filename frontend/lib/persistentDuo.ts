import { AccountId } from "@/lib/accountSession";
import { PersistentDuoPresence } from "@/lib/types";

export const PERSISTENT_DUO_ROOM_CODE = "PERSISTENT_DUO";
export const PERSISTENT_DUO_ACCOUNT_IDS: readonly AccountId[] = ["andre", "flavia"];

export const PERSISTENT_DUO_DEFAULT_NAMES: Record<AccountId, string> = {
  andre: "André",
  flavia: "Flávia",
};
export const PERSISTENT_DUO_DEFAULT_DISPLAY_NAME = "Lobby de André e Flávia";
export const PERSISTENT_DUO_DISPLAY_NAME_MAX_LENGTH = 40;

const PERSISTENT_DUO_MINIGAMES_RETURN_KEY = "persistent-duo:return-to-minigames";

export function rememberPersistentDuoMinigamesReturn(code: string): void {
  if (typeof window === "undefined" || !isPersistentDuoRoomCode(code)) return;
  try {
    window.sessionStorage.setItem(PERSISTENT_DUO_MINIGAMES_RETURN_KEY, code.toUpperCase());
  } catch {
    // A navegação continua funcionando mesmo se o storage estiver indisponível.
  }
}

export function consumePersistentDuoMinigamesReturn(code: string): boolean {
  if (typeof window === "undefined" || !isPersistentDuoRoomCode(code)) return false;
  try {
    const storedCode = window.sessionStorage.getItem(PERSISTENT_DUO_MINIGAMES_RETURN_KEY);
    if (storedCode !== code.toUpperCase()) return false;
    window.sessionStorage.removeItem(PERSISTENT_DUO_MINIGAMES_RETURN_KEY);
    return true;
  } catch {
    return false;
  }
}

export function normalizePersistentDuoDisplayName(value: string): string {
  return Array.from(value.trim().replace(/\s+/g, " "))
    .slice(0, PERSISTENT_DUO_DISPLAY_NAME_MAX_LENGTH)
    .join("");
}

export function isPersistentDuoRoomCode(code: string): boolean {
  return code.toUpperCase() === PERSISTENT_DUO_ROOM_CODE;
}

/** `true` quando a URL atual é a do lobby persistente (/sala/PERSISTENT_DUO).
 *  Nessa tela o HUD próprio do lobby (cards dos jogadores no topo) substitui o
 *  botão flutuante da conta e os botões de tema e som. */
export function isPersistentDuoPath(pathname: string | null | undefined): boolean {
  const match = pathname?.match(/^\/sala\/([^/]+)\/?$/);
  if (!match) return false;
  try {
    return isPersistentDuoRoomCode(decodeURIComponent(match[1]));
  } catch {
    return false;
  }
}

export function getPersistentDuoAvailabilityMessage(
  presence: Record<AccountId, PersistentDuoPresence>,
  selfId: AccountId
): string | null {
  if (PERSISTENT_DUO_ACCOUNT_IDS.every((id) => presence[id] === "lobby")) return null;

  const otherId: AccountId = selfId === "andre" ? "flavia" : "andre";
  const otherName = PERSISTENT_DUO_DEFAULT_NAMES[otherId];
  if (presence[otherId] === "offline") return `Aguardando ${otherName} entrar.`;
  if (presence[otherId] === "world") {
    return `${otherName} está no Nosso Mundo. Os dois precisam estar disponíveis no lobby para iniciar um minijogo.`;
  }
  if (presence[otherId] === "minigame") {
    return `${otherName} está em um minijogo. Os dois precisam voltar ao lobby para escolher outro.`;
  }
  return "Os dois precisam estar disponíveis no lobby para iniciar um minijogo.";
}
