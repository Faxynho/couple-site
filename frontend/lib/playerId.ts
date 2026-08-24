"use client";

const STORAGE_KEY = "couple-site:playerId";

/**
 * Identidade ESTÁVEL do jogador neste navegador — gerada uma única vez e
 * guardada no localStorage. Diferente do `socket.id`, que muda toda vez que
 * o WebSocket cai e reconecta (wifi instável, celular indo para segundo
 * plano, troca de rede), esse id nunca muda sozinho. É o que o servidor usa
 * para saber "essa é a mesma pessoa voltando" em vez de tratar cada
 * reconexão como um estranho novo entrando na sala.
 */
export function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
