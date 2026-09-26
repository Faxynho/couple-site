"use client";

import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import IdleHeader from "@/components/idle/IdleHeader";
import styles from "@/components/idle/IdleGame.module.css";
import { useIdleGame } from "@/hooks/useIdleGame";

export default function IdleChoicePage() {
  const router = useRouter();
  const { snapshot, error, loading } = useIdleGame();

  if (loading) return <main className={styles.page}><div className={styles.loading}>Preparando o cantinho…</div></main>;

  return (
    <main className={styles.page}>
      <IdleHeader
        title={snapshot?.areaName ?? "Nosso Cantinho"}
        subtitle="Escolha para onde vocês querem ir hoje"
        coins={snapshot?.globalCoins ?? 0}
        onBack={() => router.push("/sala/PERSISTENT_DUO")}
      />
      <div className={styles.selection}>
        <div className={styles.choiceGrid}>
          <button type="button" className={styles.choiceCard} onClick={() => router.push("/cantinho/farm")}>
            <Image src="/idle/backgrounds/farm.webp" alt="" fill priority sizes="(max-width: 699px) 100vw, 50vw" />
            <span className={styles.choiceCopy}>
              <h2>Fazendinha ♥</h2>
              <p>Nosso cantinho produtivo</p>
              <span className={styles.enterButton}>Entrar <ChevronRight size={19} /></span>
            </span>
          </button>
          <button type="button" className={styles.choiceCard} onClick={() => router.push("/cantinho/kitty")}>
            <Image src="/idle/backgrounds/kitty-room.webp" alt="" fill priority sizes="(max-width: 699px) 100vw, 50vw" />
            <span className={styles.choiceCopy}>
              <h2>Mundo da Hello Kitty ♥</h2>
              <p>Um cantinho super fofo</p>
              <span className={styles.enterButton}>Entrar <ChevronRight size={19} /></span>
            </span>
          </button>
        </div>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </main>
  );
}
