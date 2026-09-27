"use client";

import Image from "next/image";
import { CSSProperties, useEffect, useState } from "react";
import { collectIdleEvent } from "@/lib/idleApi";
import { AccountId } from "@/lib/accountSession";
import { GameEnvironment, IdleEventType, IdleModeId, IdleModeSnapshot, IdleSnapshot } from "@/lib/idleTypes";
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

function hashEvent(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: number, step: number) {
  let value = (seed + Math.imul(step + 1, 0x9e3779b1)) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 0xffffffff;
}

function eventMotion(id: string, type: IdleEventType): CSSProperties {
  const seed = hashEvent(`${id}:${type}`);
  const xInset = type === "click10" ? 29 : type === "click5" ? 26 : 24;
  const xRange = 100 - xInset * 2;
  const yMin = 29;
  const yRange = 43;
  const point = (step: number) => ({
    x: xInset + seededUnit(seed, step * 2) * xRange,
    y: yMin + seededUnit(seed, step * 2 + 1) * yRange,
  });
  const start = point(0);
  const one = point(1);
  const two = point(2);
  const three = point(3);
  return {
    "--event-x": `${start.x.toFixed(2)}vw`,
    "--event-y": `${start.y.toFixed(2)}dvh`,
    "--event-dx1": `${(one.x - start.x).toFixed(2)}vw`,
    "--event-dy1": `${(one.y - start.y).toFixed(2)}dvh`,
    "--event-dx2": `${(two.x - start.x).toFixed(2)}vw`,
    "--event-dy2": `${(two.y - start.y).toFixed(2)}dvh`,
    "--event-dx3": `${(three.x - start.x).toFixed(2)}vw`,
    "--event-dy3": `${(three.y - start.y).toFixed(2)}dvh`,
    "--event-wander": `${(15 + seededUnit(seed, 9) * 7).toFixed(2)}s`,
  } as CSSProperties;
}

type ImpactState = { label: string; type?: IdleEventType };

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
  const [impact, setImpact] = useState<ImpactState | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  const event = data.activeEvent;
  const productionLeft = data.productionBoost ? seconds(data.productionBoost.expiresAt, now) : 0;
  const clickSources = data.clickBoost?.sources?.length ? data.clickBoost.sources : data.clickBoost ? [data.clickBoost] : [];
  const activeClickSources = clickSources.filter((source) => source.expiresAt > now);
  const clickRushMultiplier = activeClickSources.length
    ? activeClickSources.reduce((sum, source) => sum + source.multiplier, 0)
    : 1;
  const clickVisualMultiplier = activeClickSources.length
    ? Math.max(...activeClickSources.map((source) => source.multiplier))
    : 1;
  const clickLeft = activeClickSources.length
    ? seconds(Math.min(...activeClickSources.map((source) => source.expiresAt)), now)
    : 0;
  const motionStyle = event ? eventMotion(event.id, event.type) : undefined;
  const collect = async () => {
    if (!event || collecting) return;
    setCollecting(true);
    try {
      const result = await collectIdleEvent(accountId, mode, event.id, environment);
      playSoundEffect(result.eventType === "money" ? "idleAchievement" : "idleUnlock");
      if (result.eventType === "money") {
        setImpact({ label: `+${Math.round(result.reward).toLocaleString("pt-BR")}`, type: result.eventType });
      } else if (result.eventType === "production2") {
        setImpact({ label: LABELS[result.eventType], type: result.eventType });
      } else {
        const clickBoost = result.snapshot.modes[mode].clickBoost;
        const sources = clickBoost?.sources?.filter((source) => source.expiresAt > Date.now()) ?? [];
        const total = sources.length ? sources.reduce((sum, source) => sum + source.multiplier, 0) : clickBoost?.multiplier ?? 1;
        const visual = sources.length ? Math.max(...sources.map((source) => source.multiplier)) : clickBoost?.visualMultiplier ?? Number(result.eventType.replace("click", ""));
        setImpact({ label: `CLICK x${total}!`, type: `click${visual}` as IdleEventType });
      }
      onSnapshot(result.snapshot);
      window.setTimeout(() => setImpact(null), 1_500);
    } catch {
      setImpact({ label: "Evento expirou" });
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
          {clickLeft > 0 && <span className={styles.clickBoostBadge} data-multiplier={clickVisualMultiplier}>CLICK x{clickRushMultiplier} <strong>{clickLeft}s</strong></span>}
        </div>
      )}
      {eventsEnabled && clickVisualMultiplier === 10 && <div className={styles.click10GlobalFx} aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>}
      {eventsEnabled && clickLeft > 0 && (
        <div className={styles.clickRushFx} data-multiplier={clickVisualMultiplier} aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
        </div>
      )}
      {eventsEnabled && event && event.expiresAt > now && (
        <button key={event.id} type="button" className={styles.randomEvent} data-event={event.type} style={motionStyle} onClick={() => void collect()} disabled={collecting} aria-label={`Coletar ${LABELS[event.type]}`}>
          <span className={styles.eventTrail} />
          <Image src={`/idle/events/${event.type}.webp`} alt="" width={180} height={180} priority />
          <small>{seconds(event.expiresAt, now)}s</small>
        </button>
      )}
      {impact && <div className={styles.eventImpact} data-event={impact.type}>{impact.label}</div>}
    </>
  );
}
