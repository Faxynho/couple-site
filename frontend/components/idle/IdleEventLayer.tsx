"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { collectIdleEvent } from "@/lib/idleApi";
import { AccountId } from "@/lib/accountSession";
import { GameEnvironment, IdleModeId, IdleModeSnapshot, IdleSnapshot } from "@/lib/idleTypes";
import { playSoundEffect } from "@/lib/sound";
import styles from "./IdleGame.module.css";

const LABELS = {
  money: "Tesouro surpresa!",
  production2: "PRODUÇÃO x2!",
  click2: "CLICK x2!",
  click3: "CLICK x3!",
  click5: "CLICK x5!",
  click10: "CLICK x10!",
} as const;

function seconds(expiresAt: number, now: number) {
  return Math.max(0, Math.ceil((expiresAt - now) / 1_000));
}

export default function IdleEventLayer({ accountId, environment, mode, data, onSnapshot, eventsEnabled = true }: {
  accountId: AccountId;
  environment: GameEnvironment;
  mode: IdleModeId;
  data: IdleModeSnapshot;
  onSnapshot: (snapshot: IdleSnapshot) => void;
  eventsEnabled?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [collecting, setCollecting] = useState(false);
  const [impact, setImpact] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  const event = data.activeEvent;
  const productionLeft = data.productionBoost ? seconds(data.productionBoost.expiresAt, now) : 0;
  const clickLeft = data.clickBoost ? seconds(data.clickBoost.expiresAt, now) : 0;
  const collect = async () => {
    if (!event || collecting) return;
    setCollecting(true);
    try {
      const result = await collectIdleEvent(accountId, mode, event.id, environment);
      playSoundEffect(result.eventType === "money" ? "idleAchievement" : "idleUnlock");
      setImpact(result.eventType === "money" ? `+${Math.round(result.reward).toLocaleString("pt-BR")}` : LABELS[result.eventType]);
      onSnapshot(result.snapshot);
      window.setTimeout(() => setImpact(null), 1_500);
    } catch {
      setImpact("Evento expirou");
      window.setTimeout(() => setImpact(null), 1_200);
    } finally {
      setCollecting(false);
    }
  };
  return (
    <>
      {(productionLeft > 0 || clickLeft > 0) && (
        <div className={styles.boostHud}>
          {productionLeft > 0 && <span className={styles.productionBoostBadge}>PRODUÇÃO x2 <strong>{productionLeft}s</strong></span>}
          {clickLeft > 0 && <span className={styles.clickBoostBadge}>CLICK x{data.clickBoost?.multiplier} <strong>{clickLeft}s</strong></span>}
        </div>
      )}
      {eventsEnabled && event && event.expiresAt > now && (
        <button type="button" className={styles.randomEvent} data-event={event.type} onClick={() => void collect()} disabled={collecting} aria-label={`Coletar ${LABELS[event.type]}`}>
          <span className={styles.eventTrail} />
          <Image src={`/idle/events/${event.type}.webp`} alt="" width={180} height={180} priority />
          <strong>{LABELS[event.type]}</strong>
          <small>{seconds(event.expiresAt, now)}s</small>
        </button>
      )}
      {impact && <div className={styles.eventImpact}>{impact}</div>}
    </>
  );
}
