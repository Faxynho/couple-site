"use client";

import Image from "next/image";
import { useIdleGame } from "@/hooks/useIdleGame";
import { formatIdleNumber } from "@/lib/formatIdleNumber";

export default function DuoGlobalCoinsBadge() {
  const { snapshot } = useIdleGame();
  const coins = Math.floor(snapshot?.globalCoins ?? 0);
  return (
    <div className="mx-auto mt-2 flex w-fit max-w-[90vw] items-center gap-2 rounded-2xl border border-[#ffe6a1]/80 bg-[linear-gradient(145deg,rgba(255,226,154,.98)_0%,rgba(191,112,91,.98)_18%,rgba(91,43,67,.98)_58%,rgba(49,29,58,.98)_100%)] py-2 pl-2 pr-5 shadow-[0_5px_0_rgba(40,19,39,.72),0_9px_22px_rgba(19,7,20,.42),inset_0_1px_0_rgba(255,255,255,.45),0_0_18px_rgba(255,194,92,.24)] ring-1 ring-[#fff0c2]/35" aria-label={`${coins} moedas globais compartilhadas`}>
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#fff0c2]/70 bg-[linear-gradient(145deg,rgba(255,246,210,.32),rgba(255,190,91,.12))] shadow-[inset_0_1px_4px_rgba(255,255,255,.32),0_2px_7px_rgba(20,8,24,.3)]">
        <Image src="/idle/icons/global-coin.webp" alt="" width={38} height={38} priority />
      </span>
      <strong className="font-display text-lg font-extrabold leading-none text-[#fff5d6] drop-shadow-[0_2px_3px_rgba(25,8,25,.9)]">{formatIdleNumber(coins)}</strong>
    </div>
  );
}
