"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import styles from "./BoardRaceVisual.module.css";

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

interface Props {
  value: number | null;
  total: number | null;
  serial: number;
  canRoll: boolean;
  onRoll: () => void;
}

export default function BoardRaceDie({ value, total, serial, canRoll, onRoll }: Props) {
  const activePips = value ? PIPS[value] : [];

  return (
    <div className={styles.dieControl}>
      <motion.button
        key={serial}
        type="button"
        aria-label={canRoll ? "Jogar dado" : value ? `Dado: ${value}` : "Dado aguardando"}
        disabled={!canRoll}
        onClick={onRoll}
        className={`${styles.die} ${canRoll ? styles.dieReady : ""}`}
        initial={serial > 0 ? { rotate: -18, scale: 0.76, y: -12 } : false}
        animate={{ rotate: 0, scale: 1, y: 0 }}
        whileHover={canRoll ? { y: -5, rotate: -4 } : undefined}
        whileTap={canRoll ? { scale: 0.9, rotate: 8 } : undefined}
        transition={{ type: "spring", stiffness: 420, damping: 18 }}
      >
        <span className={styles.dieFace}>
          {value === null ? (
            <Heart className={styles.dieHeart} aria-hidden="true" />
          ) : (
            Array.from({ length: 9 }, (_, index) => (
              <span key={index} className={`${styles.pipSlot} ${activePips.includes(index) ? styles.pip : ""}`} />
            ))
          )}
        </span>
      </motion.button>
      <div className={styles.dieCaption}>
        <strong>{canRoll ? "Jogue o dado" : value ? `Saiu ${value}` : "Aguardando"}</strong>
        {value !== null && total !== null && total !== value && <span>Movimento final: {total}</span>}
      </div>
    </div>
  );
}
