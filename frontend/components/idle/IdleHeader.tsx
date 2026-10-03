"use client";

import { ArrowLeft } from "lucide-react";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import styles from "./IdleGame.module.css";

export default function IdleHeader({ title, subtitle, coins, onBack }: {
  title: string;
  subtitle: string;
  coins: number;
  onBack: () => void;
}) {
  return (
    <header className={styles.header}>
      <button type="button" className={styles.backButton} onClick={onBack} aria-label="Voltar">
        <ArrowLeft size={23} strokeWidth={3} />
      </button>
      <div className={styles.heading}>
        <h1>{title} <span aria-hidden="true">♥</span></h1>
        <p>{subtitle}</p>
      </div>
      <div className={styles.coinPill} aria-label={`${Math.floor(coins)} moedas globais`}>
        <span className={styles.coin}>✦</span>
        {formatIdleNumber(Math.floor(coins))}
      </div>
    </header>
  );
}
