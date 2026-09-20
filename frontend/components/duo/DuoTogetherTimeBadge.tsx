"use client";

import { useEffect, useState } from "react";
import { Clock3, Heart, Sparkles } from "lucide-react";
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
    <div className="mx-auto flex w-fit max-w-[88vw] items-center justify-center" aria-label={"Tempo de jogo juntos: " + value}>
      <div className="relative flex items-center">
        <Heart
          size={15}
          fill="currentColor"
          className="absolute -left-4 top-1/2 -translate-y-1/2 -rotate-12 text-[#ff78ad] drop-shadow-[0_0_8px_rgba(255,88,157,0.9)]"
          aria-hidden="true"
        />
        <Sparkles
          size={12}
          className="absolute -left-7 -top-1 text-[#ffc0da] drop-shadow-[0_0_7px_rgba(255,151,198,0.8)]"
          aria-hidden="true"
        />

        <div
          className="relative flex min-h-[3.2rem] items-center gap-3 overflow-hidden rounded-full border border-[#ff9cc5]/45 px-4 py-2 shadow-[0_10px_28px_rgba(15,5,24,0.38),0_0_20px_rgba(255,81,151,0.18)]"
          style={{
            background:
              "linear-gradient(135deg, rgba(43,19,52,0.91), rgba(91,34,78,0.82) 52%, rgba(54,25,72,0.9))",
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(255,255,255,0.16),transparent_35%)]" />
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ff9fc6]/40 bg-[#ff5f9f]/15 shadow-[inset_0_0_10px_rgba(255,127,179,0.13),0_0_12px_rgba(255,86,153,0.2)]">
            <Clock3 size={16} className="text-[#ffc2d9]" strokeWidth={2.2} aria-hidden="true" />
          </div>

          <div className="relative min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-[9px] font-bold uppercase tracking-[0.18em] text-[#ffb8d4]">
                Tempo juntos
              </span>
              <span className="h-px w-5 bg-gradient-to-r from-[#ff8bbb]/70 to-transparent" aria-hidden="true" />
            </div>
            <p className="mt-0.5 whitespace-nowrap font-display text-base font-extrabold leading-none text-white drop-shadow-[0_1px_5px_rgba(0,0,0,0.7)]">
              {value}
            </p>
          </div>
        </div>

        <Heart
          size={15}
          fill="currentColor"
          className="absolute -right-4 top-1/2 -translate-y-1/2 rotate-12 text-[#ff78ad] drop-shadow-[0_0_8px_rgba(255,88,157,0.9)]"
          aria-hidden="true"
        />
        <Sparkles
          size={11}
          className="absolute -right-7 -bottom-0.5 text-[#ffc0da] drop-shadow-[0_0_7px_rgba(255,151,198,0.8)]"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
