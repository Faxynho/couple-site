"use client";

import Image from "next/image";
import { ChevronRight, CircleDollarSign, FlaskConical, MousePointerClick, Sparkles, Sprout, Trophy, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import IdleHeader from "@/components/idle/IdleHeader";
import styles from "@/components/idle/IdleGame.module.css";
import { useIdleGame } from "@/hooks/useIdleGame";

export default function IdleChoicePage() {
  const router = useRouter();
  const { snapshot, error, loading, accountId } = useIdleGame();
  const [tutorialOpen, setTutorialOpen] = useState(false);
  if (loading) return <main className={styles.page}><div className={styles.loading}>Preparando o cantinho…</div></main>;
  return (
    <main className={styles.page}>
      <IdleHeader title={snapshot?.areaName ?? "Fazendinhas"} subtitle="Escolha para onde vocês querem ir hoje" coins={snapshot?.globalCoins ?? 0} onBack={() => router.push("/sala/PERSISTENT_DUO")} />
      <div className={styles.selection}>
        <div className={styles.choiceGrid}>
          <ChoiceCard href="/cantinho/farm" image="/idle/backgrounds/farm.webp" title="Fazendinha ♥" subtitle="Nosso cantinho produtivo" onChoose={router.push} />
          <ChoiceCard href="/cantinho/kitty" image="/idle/backgrounds/kitty-room.webp" title="Mundo da Hello Kitty ♥" subtitle="Um cantinho super fofo" onChoose={router.push} />
        </div>
        {accountId === "flavia" && <button type="button" className={styles.tutorialButton} onClick={() => setTutorialOpen(true)}><Sparkles size={18} /><span><strong>Como jogar?</strong><small>Um guia rapidinho</small></span><ChevronRight size={18} /></button>}
        {accountId === "andre" && <button type="button" className={styles.developerButton} onClick={() => router.push("/cantinho/dev")}><FlaskConical size={18} /><span><strong>Modo Desenvolvedor</strong><small>Ambiente totalmente separado</small></span><ChevronRight size={18} /></button>}
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {tutorialOpen && accountId === "flavia" && <Tutorial onClose={() => setTutorialOpen(false)} />}
    </main>
  );
}

function ChoiceCard({ href, image, title, subtitle, onChoose }: { href: string; image: string; title: string; subtitle: string; onChoose: (href: string) => void }) {
  return <button type="button" className={styles.choiceCard} onClick={() => onChoose(href)}><Image src={image} alt="" fill priority sizes="(max-width: 699px) 100vw, 50vw" /><span className={styles.choiceCopy}><h2>{title}</h2><p>{subtitle}</p><span className={styles.enterButton}>Entrar <ChevronRight size={19} /></span></span></button>;
}

function Tutorial({ onClose }: { onClose: () => void }) {
  const steps = [
    { icon: MousePointerClick, title: "Toque para ganhar", text: "Toque nos personagens e construções para ganhar dinheiro." },
    { icon: Sparkles, title: "Compre novos", text: "Use o dinheiro do mundo para desbloquear novos personagens e construções." },
    { icon: Sprout, title: "Melhore", text: "Suba os níveis para aumentar a produção automática e o ganho por clique." },
    { icon: Trophy, title: "Conquistas e eventos", text: "Complete conquistas e pegue eventos especiais para ganhar recompensas e bônus." },
    { icon: CircleDollarSign, title: "Moedas globais", text: "Minigames e conquistas dão moedas globais, usadas nas decorações dos pets." },
  ];
  return <div className={styles.tutorialOverlay} role="dialog" aria-modal="true" aria-label="Como jogar"><section className={styles.tutorialPanel}><button type="button" className={styles.developerClose} onClick={onClose} aria-label="Fechar"><X size={20} /></button><span className={styles.tutorialEyebrow}>Guia rapidinho</span><h2>Como jogar?</h2><div className={styles.tutorialSteps}>{steps.map(({ icon: Icon, title, text }, index) => <article key={title}><span><Icon size={20} /></span><div><small>0{index + 1}</small><h3>{title}</h3><p>{text}</p></div></article>)}</div><button type="button" className={styles.tutorialDone} onClick={onClose}>Entendi 💗</button></section></div>;
}
