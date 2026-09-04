"use client";

import { AnimatePresence, motion } from "framer-motion";
import Confetti from "@/components/Confetti";
import Button from "@/components/Button";
import { Crown, Flag } from "lucide-react";
import styles from "./BoardRaceVisual.module.css";

interface Props {
  visible: boolean;
  won: boolean;
  winnerName: string;
  durationLabel: string;
  canRestart: boolean;
  onRestart: () => void;
  onBack: () => void;
  onClose: () => void;
}

export default function BoardRaceResultModal({ visible, won, winnerName, durationLabel, canRestart, onRestart, onBack, onClose }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className={styles.resultBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          {won && <Confetti />}
          <motion.div className={styles.resultCard} initial={{ opacity: 0, scale: 0.88, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }} onClick={(event) => event.stopPropagation()}>
            <div className={styles.resultEmblem}>{won ? <Crown size={38} fill="currentColor" /> : <Flag size={38} fill="currentColor" />}</div>
            <h2>{won ? "Você venceu a corrida!" : `${winnerName} venceu`}</h2>
            <p>Chegada alcançada em {durationLabel}.</p>
            <div className={styles.resultActions}>
              <Button onClick={onClose}>Ver tabuleiro</Button>
              {canRestart && <Button variant="secondary" onClick={onRestart}>Jogar de novo</Button>}
              <Button variant="ghost" onClick={onBack}>Voltar para os jogos</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
