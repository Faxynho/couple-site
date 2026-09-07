"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, CircleHelp, Shield, X } from "lucide-react";
import { useState } from "react";
import { BOARD_RACE_POWER_INFO } from "@/lib/boardRaceTypes";
import styles from "./BoardRaceVisual.module.css";

const SPACE_GUIDE = [
  { emoji: "🌷", name: "Casa normal", text: "Sem efeito: siga curtindo a corrida." },
  { emoji: "⬆️", name: "Avançar", text: "Avance de 1 a 3 casas. O evento do destino fica para a sua próxima vez." },
  { emoji: "⬇️", name: "Recuar", text: "Volte de 1 a 3 casas. O evento do destino fica para a sua próxima vez." },
  { emoji: "🔒", name: "Prisão", text: "Você perde a próxima jogada. Não acumula." },
  { emoji: "❓", name: "Quiz", text: "Na sua próxima vez, acerte a pergunta para liberar o dado." },
  { emoji: "🎮", name: "Minijogo", text: "Os dois entram no jogo real do site. Quem vence ganha turno extra." },
  { emoji: "✨", name: "Surpresa", text: "Um evento positivo ou negativo muda a sua sorte." },
  { emoji: "🎁", name: "Tesouro", text: "Receba um poder, se ainda tiver espaço para guardar." },
];

const POWER_GUIDE = [
  { title: "Movimento", powers: ["boost"] as const },
  { title: "Ataque", powers: ["snare"] as const },
  { title: "Defesa", powers: ["shield"] as const },
];

export default function BoardRaceTutorial() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.tutorialTrigger} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <BookOpen size={14} aria-hidden="true" />
        Guia da trilha
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.tutorialOverlay}
            role="dialog"
            aria-modal="true"
            aria-label="Guia da Trilha da Sorte"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
          >
            <motion.section
              className={styles.tutorialCard}
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 320, damping: 27 }}
            >
              <header className={styles.tutorialHeader}>
                <div>
                  <p>Consulte quando quiser</p>
                  <h2>Guia da Trilha</h2>
                </div>
                <button type="button" aria-label="Fechar guia" onClick={() => setOpen(false)}><X size={17} /></button>
              </header>
              <p className={styles.tutorialIntro}>Consulte rapidamente o que acontece em cada casa e poder. A chegada não exige resultado exato.</p>

              <section className={styles.tutorialSection} aria-labelledby="space-guide-title">
                <h3 id="space-guide-title"><CircleHelp size={15} /> Casas da trilha</h3>
                <div className={styles.tutorialGrid}>
                  {SPACE_GUIDE.map((item) => (
                    <article key={item.name} className={styles.tutorialItem}>
                      <span className={styles.tutorialEmoji} aria-hidden="true">{item.emoji}</span>
                      <div><strong>{item.name}</strong><span>{item.text}</span></div>
                    </article>
                  ))}
                </div>
              </section>

              <section className={styles.tutorialSection} aria-labelledby="power-guide-title">
                <h3 id="power-guide-title"><Shield size={15} /> Superpoderes</h3>
                <div className={styles.tutorialPowerGroups}>
                  {POWER_GUIDE.map((group) => (
                    <div key={group.title} className={styles.tutorialPowerGroup}>
                      <p>{group.title}</p>
                      {group.powers.map((powerId) => {
                        const power = BOARD_RACE_POWER_INFO[powerId];
                        return (
                          <article key={powerId} className={styles.tutorialItem}>
                            <span className={styles.tutorialEmoji} aria-hidden="true">{power.emoji}</span>
                            <div><strong>{power.name}</strong><span>{power.description}</span></div>
                          </article>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <p className={styles.tutorialFootnote}>Você guarda no máximo 2 poderes. O Escudo protege apenas do próximo efeito negativo; ele não bloqueia Quiz ou Minijogo.</p>
              </section>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
