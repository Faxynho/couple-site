"use client";

import { ArrowLeft } from "lucide-react";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import styles from "./IdleGame.module.css";

export default function IdleHeader({ title, subtitle, coins, resourceType = "global", onBack }: {
  title: string;
  subtitle: string;
  coins: number;
  resourceType?: "global" | "money";
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
      <div className={styles.coinPill} aria-label={resourceType === "money" ? `${Math.floor(coins)} dinheiro interno` : `${Math.floor(coins)} moedas globais`}>
        <span className={`${styles.coin} ${resourceType === "money" ? styles.moneyResource : ""}`}>✦</span>
        {formatIdleNumber(Math.floor(coins))}
      </div>
    </header>
  );
}
