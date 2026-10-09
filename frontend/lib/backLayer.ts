"use client";

/**
 * Pilha de "camadas" fechadas pelo botão voltar do celular/navegador (ex.: tela de constelações, álbum).
 *
 * Cada camada aberta empurra uma entrada no histórico; quando o usuário aperta voltar, a camada do topo é
 * fechada em vez de a página sair do jogo. Se a camada for fechada pela interface (botão da tela), a entrada
 * do histórico é removida em silêncio, sem disparar o fechamento de outras camadas.
 */
type Layer = { onBack: () => void };

const stack: Layer[] = [];
let listening = false;
/** Quantos popstate foram causados por nós (history.go) e devem ser ignorados. */
let ignoredPops = 0;
let pendingRelease = 0;
let releaseScheduled = false;

function onPopState() {
  if (ignoredPops > 0) { ignoredPops -= 1; return; }
  const layer = stack.pop();
  layer?.onBack();
}

function flushRelease() {
  releaseScheduled = false;
  const count = pendingRelease;
  pendingRelease = 0;
  if (count <= 0 || typeof window === "undefined") return;
  // uma única travessia de histórico, mesmo que várias camadas tenham sido fechadas juntas
  ignoredPops += 1;
  window.history.go(-count);
}

/** Abre uma camada. Devolve a função que a libera quando ela é fechada pela interface. */
export function pushBackLayer(onBack: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (!listening) { window.addEventListener("popstate", onPopState); listening = true; }
  const layer: Layer = { onBack };
  stack.push(layer);
  try {
    window.history.pushState({ ...(window.history.state ?? {}), backLayer: stack.length }, "");
  } catch {
    stack.pop();
    return () => undefined;
  }
  return () => {
    const index = stack.indexOf(layer);
    if (index < 0) return; // já foi fechada pelo botão voltar
    stack.splice(index, 1);
    pendingRelease += 1;
    if (!releaseScheduled) { releaseScheduled = true; queueMicrotask(flushRelease); }
  };
}

/** Só para testes. */
export function __resetBackLayers() {
  stack.length = 0;
  ignoredPops = 0;
  pendingRelease = 0;
  releaseScheduled = false;
}
