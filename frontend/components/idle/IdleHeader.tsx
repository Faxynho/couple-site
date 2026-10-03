"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import styles from "./IdleGame.module.css";

export default function IdleHeader({ title, subtitle, coins, onBack, badge, balance }: {
  title: string;
  subtitle: string;
  coins: number;
  onBack: () => void;
  /** Substitui o subtítulo (ex.: selo de nível do personagem). */
  badge?: ReactNode;
  /** Quando informado, o canto direito mostra o dinheiro interno (com sprite) no lugar das moedas globais. */
  balance?: number;
}) {
  return (
    <header className={styles.header}>
      <button type="button" className={styles.backButton} onClick={onBack} aria-label="Voltar">
        <ArrowLeft size={23} strokeWidth={3} />
      </button>
      <div className={styles.heading}>
        <h1>{title} <span aria-hidden="true">♥</span></h1>
        {badge ? <div className={styles.headingBadge}>{badge}</div> : <p>{subtitle}</p>}
      </div>
      {balance === undefined ? (
        <div className={styles.coinPill} aria-label={`${Math.floor(coins)} moedas globais`}>
          <span className={styles.coin}>✦</span>
          {formatIdleNumber(Math.floor(coins))}
        </div>
      ) : (
        <div className={`${styles.coinPill} ${styles.moneyPill}`} aria-label={`${formatIdleNumber(balance)} de dinheiro interno`}>
          <Image className={styles.moneyPillIcon} src="/idle/icons/game-money.webp" alt="" width={48} height={48} />
          <span>{formatIdleNumber(balance)}</span>
        </div>
      )}
    </header>
  );
}
