"use client";

import { motion } from "framer-motion";
import { hsvToHex } from "@/lib/colorTypes";
import type { LiveColorPreview } from "@/hooks/useColorGame";

interface SeerLiveViewProps {
  hex: string;
  round: number;
  totalRounds: number;
  guesserName: string;
  livePreview: LiveColorPreview | null;
}

export default function SeerLiveView({ hex, round, totalRounds, guesserName, livePreview }: SeerLiveViewProps) {
  const previewHex = livePreview ? hsvToHex(livePreview.h, livePreview.s, livePreview.v) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex w-full max-w-md flex-col items-center gap-4"
    >
      <div className="flex w-full items-center justify-between px-1">
        <p className="text-xs uppercase tracking-wide text-ink-soft">
          Rodada {round + 1} de {totalRounds}
        </p>
        <p className="text-xs font-medium text-ink-soft">👁️ Você está vendo a cor</p>
      </div>

      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl3 shadow-glow sm:aspect-square" style={{ background: hex }}>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/30 to-transparent px-5 py-4 text-center">
          <p className="text-sm font-medium text-white drop-shadow">
            Descreva essa cor para {guesserName} — nome, tom, se é clara ou escura, viva ou apagada.
          </p>
        </div>
      </div>

      <div className="glass-panel flex w-full flex-col items-center gap-2 rounded-xl3 p-5 text-center">
        <p className="text-xs uppercase tracking-wide text-ink-soft">O que {guesserName} está ajustando</p>
        <motion.div
          animate={{ background: previewHex ?? "#e5e5e5" }}
          transition={{ duration: 0.15 }}
          className="h-20 w-20 rounded-full border-4 border-white shadow-soft"
        />
        <p className="text-xs text-ink-soft">
          {previewHex ? "Acompanhe em tempo real e guie até chegar perto!" : `Aguardando ${guesserName} começar a mexer nos sliders...`}
        </p>
      </div>
    </motion.div>
  );
}
