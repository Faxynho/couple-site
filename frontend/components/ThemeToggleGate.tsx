"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import SoundToggle from "./SoundToggle";

/**
 * Os controles de tema e som ficam fora das telas de jogo (/game/...), que
 * já usam o espaço superior para os próprios controles flutuantes — sobretudo
 * no celular. As preferências continuam globais durante a partida.
 */
export default function ThemeToggleGate() {
  const pathname = usePathname();
  const isGameScreen = pathname?.startsWith("/game/");
  return (
    <>
      {!isGameScreen && <ThemeToggle />}
      {!isGameScreen && <SoundToggle />}
    </>
  );
}
