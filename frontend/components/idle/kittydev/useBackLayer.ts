"use client";

import { useEffect, useRef } from "react";
import { pushBackLayer } from "@/lib/backLayer";

/** Fecha a camada (tela, álbum, celebração) com o botão voltar do celular em vez de sair do jogo. */
export function useBackLayer(onBack: () => void) {
  const ref = useRef(onBack);
  ref.current = onBack;
  useEffect(() => pushBackLayer(() => ref.current()), []);
}
