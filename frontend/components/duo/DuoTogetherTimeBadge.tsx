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
      className="mx-auto flex w-fit max-w-[92vw] items-center justify-center"
      aria-label={"Tempo de jogo juntos: " + value}
    >
      <div
        className="relative flex h-[4.4rem] w-[13.5rem] max-w-[92vw] items-end justify-center bg-contain bg-center bg-no-repeat pb-[0.48rem]"
        style={{ backgroundImage: "url('/images/tempo-juntos-lobby.webp')" }}
        role="img"
        aria-label="Tempo juntos"
      >
        <span className="max-w-[78%] overflow-hidden text-ellipsis whitespace-nowrap text-center font-display text-[clamp(0.78rem,3.5vw,1.05rem)] font-extrabold leading-none tracking-wide text-white [text-shadow:0_1px_2px_rgba(80,35,48,.95),0_0_5px_rgba(80,35,48,.75)]">
          {value}
        </span>
      </div>
    </div>
  );
}
