"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

/**
 * O botão de tema fica fixo no canto superior direito em todo o site —
 * MENOS dentro das telas de jogo (/game/...), que já usam esse mesmo canto
 * (às vezes o canto inteiro, ex.: os controles de zoom do Puzzle) para os
 * próprios controles flutuantes. O tema em si continua valendo normalmente
 * dentro do jogo (a classe "dark" é global, aplicada no <html>) — só o
 * botão para trocar fica reservado para as telas de menu/sala, onde sempre
 * há espaço livre e nenhum outro elemento fixo no mesmo canto.
 */
export default function ThemeToggleGate() {
  const pathname = usePathname();
  const isGameScreen = pathname?.startsWith("/game/");
  if (isGameScreen) return null;
  return <ThemeToggle />;
}
