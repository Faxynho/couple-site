"use client";

const STORAGE_KEY = "couple-site:duoRoomCode";

/**
 * Guarda o código da sala Duo ativa neste navegador — permite que a home e a
 * tela de criar/entrar ofereçam "voltar para sua sala" mesmo depois de fechar
 * a aba e reabrir o site (sem isso, só a URL /sala/[code] ou /game/[id]/[code]
 * "lembrava" da sala, e só enquanto ela continuasse aberta).
 */
export function setStoredRoomCode(code: string | null) {
  if (typeof window === "undefined") return;
  if (code) window.localStorage.setItem(STORAGE_KEY, code);
  else window.localStorage.removeItem(STORAGE_KEY);
}

export function getStoredRoomCode(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function clearStoredRoomCode() {
  setStoredRoomCode(null);
}
