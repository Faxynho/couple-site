"use client";

import { BarChart3, FlaskConical, Home, Sprout, Trophy } from "lucide-react";
import styles from "./IdleGame.module.css";

export type IdleTab = "home" | "upgrades" | "achievements" | "statistics" | "dev";

const TABS: Array<{ id: IdleTab; label: string; icon: typeof Home }> = [
  { id: "home", label: "Inicial", icon: Home },
  { id: "upgrades", label: "Melhorias", icon: Sprout },
  { id: "achievements", label: "Conquistas", icon: Trophy },
  { id: "statistics", label: "Estatísticas", icon: BarChart3 },
];

export default function IdleBottomNav({ active, onChange, dev = false }: { active: IdleTab; onChange: (tab: IdleTab) => void; dev?: boolean }) {
  const tabs = dev ? [...TABS, { id: "dev" as const, label: "DEV", icon: FlaskConical }] : TABS;
  return (
    <nav className={styles.bottomNav} aria-label="Navegação do jogo idle">
      {tabs.map((tab) => {
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
