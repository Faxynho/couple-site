"use client";

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
    <div
      className="mx-auto -mt-8 flex w-full items-center justify-center"
      aria-label={"Tempo de jogo juntos: " + value}
    >
      <div
        className="relative flex aspect-[3.5/1] w-[140%] max-w-none items-center justify-center bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/tempo-juntos-lobby.webp')" }}
        role="img"
        aria-label="Tempo juntos"
      >
        <span className="absolute left-1/2 top-[54%] max-w-[65%] -translate-x-1/2 -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap text-center font-display text-[clamp(0.95rem,4.5vw,1.3rem)] font-extrabold leading-none tracking-wide text-white [text-shadow:0_1px_2px_rgba(80,35,48,.98),0_0_6px_rgba(80,35,48,.9)]">
          {value}
        </span>
      </div>
    </div>
  );
}
