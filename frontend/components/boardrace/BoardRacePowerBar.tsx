"use client";

import { BOARD_RACE_POWER_INFO, BoardRacePowerId, BoardRacePlayerState } from "@/lib/boardRaceTypes";
import styles from "./BoardRaceVisual.module.css";

interface Props {
  player: BoardRacePlayerState;
  enabled: boolean;
  onUse: (powerId: BoardRacePowerId) => void;
}

export default function BoardRacePowerBar({ player, enabled, onUse }: Props) {
  return (
    <section className={styles.powerPanel}>
      <div className={styles.powerHeader}>
        <p className={styles.panelEyebrow}>Poderes · {player.powers.length}/2</p>
        {player.shieldActive && <span className={styles.shieldBadge}>🛡️ Escudo ativo</span>}
      </div>
      <div className={styles.powerGrid}>
        {player.powers.length === 0 && <p className={styles.emptyPower}>Encontre um Tesouro para ganhar poderes.</p>}
        {player.powers.map((powerId, index) => {
          const power = BOARD_RACE_POWER_INFO[powerId];
          return (
            <button
              key={`${powerId}-${index}`}
              type="button"
              disabled={!enabled}
              onClick={() => onUse(powerId)}
              title={`${power.category}: ${power.description}`}
              className={styles.powerButton}
            >
              <span className={styles.powerIcon}>{power.emoji}</span>
              <span className={styles.powerCopy}><strong>{power.name}</strong><span>{power.category}</span></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
