"use client";

import { motion } from "framer-motion";

export default function LoadingScreen({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-3.5 w-3.5 rounded-full bg-rose"
            animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
      <p className="font-display text-ink-soft">{label}</p>
    </div>
  );
}
