"use client";

import { motion } from "framer-motion";
import { MemoryPublicSlot } from "@/lib/memoryTypes";

interface MemoryCardProps {
  slot: MemoryPublicSlot;
  revealed: boolean;
  matched: boolean;
  wrong: boolean;
  disabled: boolean;
  onFlip: () => void;
  celebrating: boolean;
  celebrationIndex: number;
}

export default function MemoryCard({ slot, revealed, matched, wrong, disabled, onFlip, celebrating, celebrationIndex }: MemoryCardProps) {
  if (slot.empty) {
    // Espaço de respiro deliberado das grades ímpares — não imita uma carta.
    return <div aria-hidden="true" className="aspect-square rounded-xl2 bg-surface/15" />;
  }

  const visible = revealed || matched;
  return (
    <motion.button
      type="button"
      onClick={onFlip}
      disabled={disabled || visible}
      whileTap={!disabled && !visible ? { scale: 0.96 } : undefined}
      animate={celebrating && matched ? { scale: [1, 1.06, 1], filter: ["drop-shadow(0 0 0 rgba(255,255,255,0))", "drop-shadow(0 0 12px rgba(244, 151, 177, .65))", "drop-shadow(0 0 3px rgba(244, 151, 177, .25))"] } : undefined}
      transition={celebrating && matched ? { duration: 0.48, delay: celebrationIndex * 0.025, ease: "easeOut" } : undefined}
      aria-label={visible ? "Carta revelada" : "Virar carta"}
      className="group aspect-square [perspective:900px] disabled:cursor-default"
    >
      <motion.span
        animate={{ rotateY: visible ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 250, damping: 22 }}
        className="relative block h-full w-full [transform-style:preserve-3d]"
      >
        <span className="glass-panel absolute inset-0 flex items-center justify-center rounded-xl2 border-2 border-surface/70 bg-gradient-to-br from-rose/35 via-lilac/30 to-skymist/35 shadow-soft [backface-visibility:hidden] transition-colors group-hover:border-rose/60">
          <span className="h-1/3 w-1/3 rounded-full border-[3px] border-ink/25" />
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl2 border-2 bg-surface/90 p-[12%] shadow-soft [backface-visibility:hidden] [transform:rotateY(180deg)] ${
            matched ? "border-sage/90 shadow-glow" : wrong ? "border-rose/80" : "border-surface/80"
          }`}
        >
          {slot.imageSrc && <img src={slot.imageSrc} alt="Ícone da carta" draggable={false} className="h-full w-full object-contain" />}
        </span>
      </motion.span>
    </motion.button>
  );
}
