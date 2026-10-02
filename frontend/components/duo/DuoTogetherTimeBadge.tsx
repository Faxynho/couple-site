"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { fetchAccountsOverview } from "@/lib/accountApi";
import { formatDuration } from "@/lib/accountFormat";

export default function DuoTogetherTimeBadge() {
  const [timeMs, setTimeMs] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const overview = await fetchAccountsOverview();
        if (active) setTimeMs(overview.duoShared.timeMs);
      } catch {
        if (active) setTimeMs(null);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const value = timeMs === null ? "—" : formatDuration(timeMs);

  return (
    <div className="mx-auto w-[min(92vw,640px)]" aria-label={"Tempo de jogo juntos: " + value}>
      <div className="relative overflow-visible">
        <Image
          src="/images/tempo-juntos-lobby.webp"
          alt="Tempo juntos"
          width={1910}
          height={700}
          priority
          draggable={false}
          className="block h-auto w-full select-none"
          sizes="(max-width: 768px) 92vw, 640px"
        />
        <div className="pointer-events-none absolute left-1/2 top-[59%] flex w-[52%] -translate-x-1/2 -translate-y-1/2 items-center justify-center px-2 text-center">
          <span className="max-w-full whitespace-nowrap font-display text-[clamp(0.8rem,4.3vw,1.65rem)] font-extrabold leading-none tracking-[0.04em] text-white drop-shadow-[0_2px_5px_rgba(52,6,34,0.95)]">
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}
