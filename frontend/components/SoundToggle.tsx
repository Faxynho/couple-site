"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useSoundEnabled } from "@/hooks/useSoundEnabled";

export default function SoundToggle() {
  const { enabled, toggle } = useSoundEnabled();
  return (
    <motion.button
      type="button"
      onClick={toggle}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.9 }}
      aria-label={enabled ? "Desativar sons" : "Ativar sons"}
      title={enabled ? "Sons ligados" : "Sons desligados"}
      className="glass-panel fixed right-[4.5rem] top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full text-ink shadow-soft"
    >
      <AnimatePresence mode="wait" initial={false}>
        {enabled ? <motion.span key="on" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}><Volume2 size={18} /></motion.span> : <motion.span key="off" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}><VolumeX size={18} /></motion.span>}
      </AnimatePresence>
    </motion.button>
  );
}
