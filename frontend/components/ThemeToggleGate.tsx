"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import SoundToggle from "./SoundToggle";
import { isPersistentDuoPath } from "@/lib/persistentDuo";

/**
 * Os controles de tema e som ficam fora das telas de jogo (/game/...), que
 * já usam o espaço superior para os próprios controles flutuantes — sobretudo
 * no celular — e fora do lobby persistente (onde vivem na aba Configurações).
 * As preferências continuam globais durante a partida.
 */
export default function ThemeToggleGate() {
  const pathname = usePathname();
  const isGameScreen = pathname?.startsWith("/game/") || pathname === "/mundo" || pathname?.startsWith("/pets") || pathname?.startsWith("/cantinho");
  // No lobby persistente o tema claro/escuro e o som ficam na aba Configurações
  // do perfil (o topo da tela é ocupado pelos cards dos dois jogadores).
  const hide = isGameScreen || isPersistentDuoPath(pathname);
  return (
    <>
      {!hide && <ThemeToggle />}
      {!hide && <SoundToggle />}
    </>
  );
}
