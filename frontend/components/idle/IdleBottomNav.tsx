"use client";

import { Home, Sprout, Trophy } from "lucide-react";
import styles from "./IdleGame.module.css";

export type IdleTab = "home" | "upgrades" | "achievements";

const TABS: Array<{ id: IdleTab; label: string; icon: typeof Home }> = [
  { id: "home", label: "Inicial", icon: Home },
  { id: "upgrades", label: "Melhorias", icon: Sprout },
  { id: "achievements", label: "Conquistas", icon: Trophy },
];

export default function IdleBottomNav({ active, onChange }: { active: IdleTab; onChange: (tab: IdleTab) => void }) {
  return (
    <nav className={styles.bottomNav} aria-label="Navegação do jogo idle">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            className={`${styles.navButton} ${active === tab.id ? styles.navButtonActive : ""}`}
            onClick={() => onChange(tab.id)}
            aria-current={active === tab.id ? "page" : undefined}
          >
            <Icon size={21} fill={active === tab.id ? "currentColor" : "none"} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
