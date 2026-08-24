"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import RPGCard from "./RPGCard";
import { RPGCard as RPGCardData } from "@/lib/rpgTypes";

interface RPGHandProps {
  hand: RPGCardData[];
  chosenInstanceId: string | null;
  disabled: boolean;
  /** Muda a cada nova mão (ex.: número da rodada) — dispara o embaralhar de novo. */
  dealKey: number;
  onSelect: (instanceId: string) => void;
}

/** As 3 cartas chegam "viradas", giram por um instante — "qual carta vai
 *  aparecer?" — e só depois mostram raridade e ataque, uma de cada vez. */
export default function RPGHand({ hand, chosenInstanceId, disabled, dealKey, onSelect }: RPGHandProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
    if (hand.length === 0) return;
    const t = setTimeout(() => setRevealed(true), 650);
    return () => clearTimeout(t);
  }, [dealKey, hand.length]);

  if (hand.length === 0) return null;

  return (
    <div className="grid w-full max-w-[min(94vw,560px)] grid-cols-3 gap-2.5 sm:gap-3">
      {!revealed
        ? hand.map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, rotateY: [0, 180, 360] }}
              transition={{
                opacity: { duration: 0.2 },
                y: { duration: 0.2 },
                rotateY: { duration: 0.65, repeat: Infinity, ease: "linear", delay: i * 0.08 },
              }}
              className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-white/50 ring-1 ring-white/70"
            >
              <span className="text-2xl opacity-70">🂠</span>
            </motion.div>
          ))
        : hand.map((card, i) => (
            <RPGCard
              key={card.instanceId}
              card={card}
              delay={i * 0.12}
              selected={chosenInstanceId === card.instanceId}
              faded={Boolean(chosenInstanceId) && chosenInstanceId !== card.instanceId}
              disabled={disabled || Boolean(chosenInstanceId)}
              onClick={() => onSelect(card.instanceId)}
            />
          ))}
    </div>
  );
}
