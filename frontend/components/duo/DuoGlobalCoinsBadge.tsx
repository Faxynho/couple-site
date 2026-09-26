"use client";

import Image from "next/image";
import { useIdleGame } from "@/hooks/useIdleGame";
import { formatIdleNumber } from "@/lib/formatIdleNumber";

export default function DuoGlobalCoinsBadge() {
  const { snapshot } = useIdleGame();
  const coins = Math.floor(snapshot?.globalCoins ?? 0);
  return (
    <div className="mx-auto mt-2 flex w-fit max-w-[88vw] items-center gap-2 rounded-full border border-[#ffd670]/45 bg-[linear-gradient(135deg,rgba(58,31,48,.9),rgba(112,52,79,.86))] py-1.5 pl-1.5 pr-4 shadow-[0_8px_24px_rgba(19,7,20,.32),0_0_17px_rgba(255,198,73,.12)] backdrop-blur-md" aria-label={`${coins} moedas globais compartilhadas`}>
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fff4cb]/10">
        <Image src="/idle/icons/global-coin.webp" alt="" width={34} height={34} priority />
      </span>
      <span className="text-left">
        <span className="block font-display text-[8px] font-bold uppercase tracking-[.16em] text-[#ffdca0]">Moeda global</span>
        <strong className="block font-display text-base font-extrabold leading-none text-white drop-shadow-[0_1px_4px_rgba(0,0,0,.65)]">{formatIdleNumber(coins)}</strong>
      </span>
    </div>
  );
}
