"use client";

import Image from "next/image";
import { ChevronRight, FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import IdleHeader from "@/components/idle/IdleHeader";
import styles from "@/components/idle/IdleGame.module.css";
import { useIdleGame } from "@/hooks/useIdleGame";

export default function IdleDevChoicePage() {
  const router = useRouter();
  const { snapshot, accountId, loading, error } = useIdleGame(undefined, "dev");
  if (loading) return <main className={styles.page}><div className={styles.loading}>Abrindo ambiente DEV…</div></main>;
  if (accountId !== "andre") return <main className={styles.page}><div className={styles.loading}>Acesso exclusivo da conta André.</div></main>;
  return <main className={styles.page + " " + styles.devEnvironment}>
    <IdleHeader title="Ambiente de Desenvolvimento" subtitle="Saves isolados do jogo real" coins={snapshot?.globalCoins ?? 0} onBack={() => router.push("/cantinho")} />
    <span className={styles.devBadge}>MODO DEV</span>
    <div className={styles.selection}><div className={styles.choiceGrid}>
      {[
        { id: "farm", title: "Fazendinha DEV", image: "/idle/backgrounds/farm.webp" },
        { id: "kitty", title: "Hello Kitty DEV", image: "/idle/backgrounds/kitty-room.webp" },
      ].map((item) => <button key={item.id} type="button" className={styles.choiceCard} onClick={() => router.push(`/cantinho/dev/${item.id}`)}><Image src={item.image} alt="" fill priority sizes="100vw" /><span className={styles.choiceCopy}><h2>{item.title}</h2><p>Progresso e economia de teste</p><span className={styles.enterButton}><FlaskConical size={17} /> Entrar <ChevronRight size={19} /></span></span></button>)}
    </div></div>
    {error && <p className={styles.error}>{error}</p>}
  </main>;
}
