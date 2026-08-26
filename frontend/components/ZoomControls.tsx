"use client";

import { Plus, Minus, Scan } from "lucide-react";
import { motion } from "framer-motion";

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCentralize: () => void;
}

export default function ZoomControls({ onZoomIn, onZoomOut, onCentralize }: ZoomControlsProps) {
  const buttonClass =
    "flex h-10 w-10 items-center justify-center rounded-full bg-surface/80 text-ink shadow-soft backdrop-blur-md transition-colors hover:bg-surface";

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button whileTap={{ scale: 0.9 }} onClick={onZoomIn} className={buttonClass} aria-label="Aproximar">
        <Plus size={18} />
      </motion.button>
      <motion.button whileTap={{ scale: 0.9 }} onClick={onZoomOut} className={buttonClass} aria-label="Afastar">
        <Minus size={18} />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onCentralize}
        className={buttonClass}
        aria-label="Centralizar quebra-cabeça"
        title="Centralizar quebra-cabeça"
      >
        <Scan size={18} />
      </motion.button>
    </div>
  );
}
