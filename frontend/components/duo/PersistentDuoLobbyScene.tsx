"use client";

import Image from "next/image";

interface PersistentDuoLobbySceneProps {
  onWorldClick: () => void;
  onMinigamesClick: () => void;
}

/**
 * The hotspots use percentages relative to Lobby_background.png itself.
 * Because the image keeps its intrinsic aspect ratio, the hit areas stay
 * aligned on different phone widths instead of depending on fixed pixels.
 */
export default function PersistentDuoLobbyScene({
  onWorldClick,
  onMinigamesClick,
}: PersistentDuoLobbySceneProps) {
  return (
    <section
      className="relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-black/10 shadow-[0_22px_55px_-28px_rgba(54,12,67,0.75)]"
      aria-label="Áreas do lobby"
    >
      <Image
        src="/images/Lobby_background.png"
        alt="Lobby compartilhado com entrada para Nosso Mundo e máquina de Minijogos"
        width={941}
        height={1672}
        priority
        sizes="(max-width: 448px) calc(100vw - 24px), 424px"
        className="block h-auto w-full select-none"
        draggable={false}
      />

      <button
        type="button"
        onClick={onWorldClick}
        aria-label="Entrar no Nosso Mundo"
        title="Entrar no Nosso Mundo"
        className="absolute z-10 rounded-[18%] bg-transparent outline-none [-webkit-tap-highlight-color:transparent] focus-visible:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        style={{
          left: "8.5%",
          top: "18%",
          width: "38.5%",
          height: "38.5%",
        }}
      >
        <span className="sr-only">Entrar no Nosso Mundo</span>
      </button>

      <button
        type="button"
        onClick={onMinigamesClick}
        aria-label="Abrir Minijogos"
        title="Abrir Minijogos"
        className="absolute z-10 rounded-[16%] bg-transparent outline-none [-webkit-tap-highlight-color:transparent] focus-visible:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        style={{
          left: "58%",
          top: "22.5%",
          width: "37.5%",
          height: "34%",
        }}
      >
        <span className="sr-only">Abrir Minijogos</span>
      </button>
    </section>
  );
}
