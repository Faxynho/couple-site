"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Image as ImageIcon, X } from "lucide-react";

interface ReferencePanelProps {
  imageSrc: string;
  visible: boolean;
  onToggle: () => void;
}

export default function ReferencePanel({ imageSrc, visible, onToggle }: ReferencePanelProps) {
  return (
    <>
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={onToggle}
        className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2.5 text-sm font-medium text-ink shadow-soft backdrop-blur-md transition-colors hover:bg-white"
      >
        <ImageIcon size={16} />
        {visible ? "Esconder referência" : "Mostrar referência"}
      </motion.button>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="glass-panel absolute bottom-16 right-0 w-48 overflow-hidden rounded-xl2 p-2 sm:w-64"
          >
            <div className="flex items-center justify-between px-1 pb-1.5">
              <span className="text-xs font-medium text-ink-soft">Referência</span>
              <button onClick={onToggle} className="text-ink-soft hover:text-ink" aria-label="Fechar referência">
                <X size={14} />
              </button>
            </div>
            <img src={imageSrc} alt="Imagem de referência" className="w-full rounded-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
