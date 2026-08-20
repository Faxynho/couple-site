"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface ColorMemorizeViewProps {
  hex: string;
  round: number;
  totalRounds: number;
  durationMs: number;
  onDone: () => void;
}

export default function ColorMemorizeView({ hex, round, totalRounds, durationMs, onDone }: ColorMemorizeViewProps) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    setSecondsLeft(Math.ceil(durationMs / 1000));
    const tick = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    const finish = setTimeout(() => onDoneRef.current(), durationMs);
    return () => {
      clearInterval(tick);
      clearTimeout(finish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs, round]);

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
        <p className="text-xs font-medium text-ink-soft">Memorizem essa cor</p>
      </div>

      <motion.div
        key={hex}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-xl3 shadow-glow sm:aspect-square"
        style={{ background: hex }}
      >
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/25 to-transparent px-5 py-4">
          <span className="font-display text-2xl font-semibold tabular-nums text-white drop-shadow">
            {secondsLeft}s
          </span>
          <span className="text-xs font-medium text-white/90 drop-shadow">Guarde bem essa cor na memória</span>
        </div>
      </motion.div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/60">
        <motion.div
          key={`${hex}-bar`}
          className="h-full rounded-full bg-rose"
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: durationMs / 1000, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}
