"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import RPGCard from "./RPGCard";
import { RPGCard as RPGCardData } from "@/lib/rpgTypes";

interface RPGHandProps {
  hand: RPGCardData[];
  chosenInstanceId: string | null;
  disabled: boolean;
  dealKey: number;
  onSelect: (instanceId: string) => void;
  rerollCharges?: number;
  onReroll?: () => void;
}

export default function RPGHand({
  hand,
  chosenInstanceId,
  disabled,
  dealKey,
  onSelect,
  rerollCharges = 0,
  onReroll,
}: RPGHandProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
    if (hand.length === 0) return;
    const t = setTimeout(() => setRevealed(true), 650);
    return () => clearTimeout(t);
  }, [dealKey, hand.length]);

  if (hand.length === 0) return null;

  const canReroll =
    rerollCharges > 0 &&
    !disabled &&
    !chosenInstanceId &&
    Boolean(onReroll);

  return (
    <div className="flex w-full max-w-[min(94vw,560px)] flex-col items-center gap-3">
      <div className="grid w-full grid-cols-3 gap-2.5 sm:gap-3">
        {!revealed
          ? hand.map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, rotateY: [0, 180, 360] }}
                transition={{
                  opacity: { duration: 0.2 },
                  y: { duration: 0.2 },
                  rotateY: {
                    duration: 0.65,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.08,
                  },
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
                faded={
                  Boolean(chosenInstanceId) &&
                  chosenInstanceId !== card.instanceId
                }
                disabled={
                  disabled ||
                  Boolean(chosenInstanceId)
                }
                onClick={() => onSelect(card.instanceId)}
              />
            ))}
      </div>

      {rerollCharges > 0 && (
        <motion.button
          type="button"
          whileHover={
            canReroll
              ? { scale: 1.03 }
              : undefined
          }
          whileTap={
            canReroll
              ? { scale: 0.96 }
              : undefined
          }
          disabled={!canReroll}
          onClick={onReroll}
          className="
            flex
            items-center
            gap-2
            rounded-full
            border
            border-white/80
            bg-white/65
            px-4
            py-2
            text-xs
            font-bold
            text-ink
            shadow-sm
            backdrop-blur-sm
            transition
            hover:bg-white
            disabled:cursor-not-allowed
            disabled:opacity-45
          "
        >
          <span className="text-base">🎲</span>
          Rolar novamente
          <span className="rounded-full bg-ink/10 px-1.5 py-0.5 tabular-nums">
            {rerollCharges}
          </span>
        </motion.button>
      )}
    </div>
  );
}
