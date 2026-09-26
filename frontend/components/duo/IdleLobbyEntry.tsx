"use client";

import { ChevronRight, Coins, Sprout, Sparkles } from "lucide-react";

export default function IdleLobbyEntry({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative mx-auto mb-3 flex min-h-[4.6rem] w-[min(92%,25rem)] items-center gap-3 overflow-hidden rounded-[1.5rem] border border-white/65 bg-gradient-to-r from-[#fff5e7]/95 via-[#ffe5ed]/95 to-[#f8d8ee]/95 px-4 text-left shadow-[0_10px_28px_rgba(37,12,31,.28),inset_0_1px_0_white] backdrop-blur-md transition-transform active:scale-[.98]"
      aria-label="Entrar no Nosso Cantinho"
    >
      <span className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#ff83af]/20 blur-xl" />
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-gradient-to-br from-[#91cc70] to-[#58a94f] text-white shadow-[0_5px_12px_rgba(56,120,51,.25)]">
        <Sprout size={24} />
        <Sparkles size={12} className="absolute -right-1 -top-1 text-[#ff669a]" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-display text-[1.02rem] font-extrabold text-[#683344]">
          Nosso Cantinho <span className="text-[#f25d91]">♥</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[.68rem] font-semibold text-[#946773]">
          <Coins size={13} className="text-[#e69a20]" /> Fazendinha e Mundo da Hello Kitty
        </span>
      </span>
      <ChevronRight size={20} className="relative shrink-0 text-[#e95486] transition-transform group-active:translate-x-1" />
    </button>
  );
}
