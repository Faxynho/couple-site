"use client";

import Image from "next/image";

export default function IdleLobbyEntry({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative mx-auto mb-0 block w-[min(92%,32rem)] overflow-hidden p-0 transition-transform active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff72aa]/80 focus-visible:ring-offset-2"
      aria-label="Entrar nas Fazendinhas"
    >
      <Image
        src="/images/botao-farms.webp"
        alt="Fazendinhas — Fazendinha e Mundo da Hello Kitty"
        width={1536}
        height={512}
        sizes="(max-width: 640px) 92vw, 32rem"
        className="block h-auto w-full select-none transition-transform duration-150 group-hover:scale-[1.01]"
        draggable={false}
      />
    </button>
  );
}
