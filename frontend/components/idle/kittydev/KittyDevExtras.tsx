"use client";

import Image from "next/image";
import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Crown, LockKeyhole, Sparkles, Star, X } from "lucide-react";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import { kittyDevAwaken, kittyDevBuyItem } from "@/lib/idleApi";
import { IdleItemSnapshot, IdleSnapshot, KittyDevCharacterSnapshot, KittyDevItemSnapshot } from "@/lib/idleTypes";
import { playSoundEffect } from "@/lib/sound";
import { ClickItemIcon, GoldSparkle } from "./KittyDevIcons";
import { AWAKE_AURA, STONE_ICON } from "./kittyDevHelpers";
import styles from "./KittyDev.module.css";

/** Auras e brilhos que ficam atrás/ao redor do personagem despertado. */
export function AwakeEffects() {
  const sparks: Array<[number, number, number, number, number]> = [[8, 18, .9, 2.4, 0], [86, 14, .75, 2.8, -.8], [14, 62, .7, 3, -1.4], [90, 58, 1, 2.2, -.4], [48, 4, .8, 2.6, -1.9], [30, 88, .65, 3.1, -.9], [74, 84, .8, 2.5, -1.6]];
  return <>
    <span className={styles.aura} aria-hidden="true" style={{ backgroundImage: `url(${AWAKE_AURA})` }} />
    <span className={styles.awakeSparks} aria-hidden="true">{sparks.map(([x, y, s, d, dl], index) => <i key={index} style={{ "--x": x, "--y": y, "--s": `${s}rem`, "--d": `${d}s`, "--dl": `${dl}s` } as CSSProperties}><GoldSparkle width="100%" height="100%" /></i>)}</span>
  </>;
}

/** Cantos dourados ornamentados do painel desperto. */
export function AwakePanelCorners() {
  return <>{[0, 1, 2].map((index) => <GoldSparkle key={index} className={styles.awakePanelCorner} aria-hidden="true" />)}</>;
}

function ItemArt({ kind, locked }: { kind: "click" | "stone"; locked: boolean }) {
  return <span className={styles.itemArt}>
    {kind === "click" ? <ClickItemIcon /> : <Image src={STONE_ICON} alt="" width={64} height={64} />}
    {locked && <span className={styles.itemLock}><LockKeyhole size={9} strokeWidth={3} aria-hidden="true" /></span>}
  </span>;
}

function effectText(kind: "click" | "stone", item: KittyDevItemSnapshot, info: KittyDevCharacterSnapshot) {
  if (kind === "click") return { now: `x${item.multiplier.toFixed(2)} no clique`, next: item.nextMultiplier ? `x${item.nextMultiplier.toFixed(2)}` : null };
  const base = info.stoneYield;
  return { now: `${(base * item.multiplier).toFixed(2).replace(/\.?0+$/, "")} pedras por marco`, next: item.nextMultiplier ? `${(base * item.nextMultiplier).toFixed(2).replace(/\.?0+$/, "")}` : null };
}

/** Os pop-ups saem do painel (que tem backdrop-filter e prenderia o position: fixed) e vão para o body. */
function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

function ItemSheet({ kind, item, info, balance, onClose, onSnapshot }: {
  kind: "click" | "stone"; item: KittyDevItemSnapshot; info: KittyDevCharacterSnapshot; balance: number; onClose: () => void; onSnapshot: (snapshot: IdleSnapshot) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owned = item.level > 0;
  const maxed = item.nextCost === null;
  const effect = effectText(kind, item, info);
  const canBuy = !maxed && !busy && item.nextCost !== null && balance >= item.nextCost;
  const buy = async () => {
    if (!canBuy) return;
    setBusy(true); setError(null);
    try {
      onSnapshot(await kittyDevBuyItem(info.id, kind));
      playSoundEffect(owned ? "idleUpgrade" : "idleUnlock");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível comprar agora.");
    } finally { setBusy(false); }
  };
  return <Portal><div className={styles.sheetOverlay} role="dialog" aria-label={item.name} onClick={onClose}>
    <div className={styles.sheet} onClick={(event) => event.stopPropagation()}>
      <button type="button" className={styles.sheetClose} onClick={onClose} aria-label="Fechar"><X size={16} strokeWidth={3} /></button>
      <div className={`${styles.sheetArt} ${owned ? "" : styles.sheetArtLocked}`}>{kind === "click" ? <ClickItemIcon /> : <Image src={STONE_ICON} alt="" width={160} height={160} />}</div>
      <h3>{item.name}</h3>
      <p>{kind === "click" ? "Item exclusivo: aumenta o valor de cada clique deste personagem." : "Item exclusivo: aumenta as Pedras Estelares que este personagem rende a cada 10 níveis."}</p>
      <div className={styles.pips} aria-label={`Nível ${item.level} de ${item.maxLevel}`}>{Array.from({ length: item.maxLevel }, (_, index) => <i key={index} data-on={index < item.level ? "yes" : "no"} />)}</div>
      <div className={styles.effectRow}>
        <span>{owned ? "Atual" : "Bloqueado"}</span><b>{owned ? effect.now : "—"}</b>
        {effect.next && <><span>→</span><em>{kind === "click" ? `x${effect.next.replace("x", "")}` : `${effect.next} por marco`}</em></>}
      </div>
      <button type="button" className={styles.buyBtn} disabled={!canBuy} onClick={() => void buy()}>
        {maxed ? "Nível máximo" : <>
          <span>{owned ? "Melhorar" : "Comprar"}</span>
          <Image src="/idle/icons/game-money.webp" alt="" width={48} height={48} /><span>{formatIdleNumber(item.nextCost!)}</span>
        </>}
      </button>
      {error && <p role="alert" style={{ color: "#c0306a", marginTop: ".5rem" }}>{error}</p>}
    </div>
  </div></Portal>;
}

function AwakenCelebration({ info, name, onClose }: { info: KittyDevCharacterSnapshot; name: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4_800);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return <Portal><div className={styles.sheetOverlay} role="dialog" aria-label={`${name} despertou`} onClick={onClose} style={{ alignItems: "center", background: "radial-gradient(circle at 50% 42%,rgba(255,214,120,.55),rgba(60,10,50,.78))" }}>
    <div style={{ position: "relative", width: "min(86vw,22rem)", textAlign: "center", color: "#fff" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "1" }}>
        <AwakeEffects />
        <Image className={styles.awakeImg} src={info.awakening!.asset} alt={name} fill sizes="86vw" style={{ objectFit: "contain" }} />
      </div>
      <p style={{ marginTop: ".4rem", color: "#ffe9a8", fontFamily: "var(--font-display),sans-serif", fontSize: "1.55rem", fontWeight: 950, textShadow: "0 0 14px rgba(255,214,110,.9)" }}>{name} despertou!</p>
      <p style={{ marginTop: ".15rem", fontSize: ".9rem", fontWeight: 850 }}>Produção x{info.awakening!.multiplier}</p>
      <small style={{ display: "block", marginTop: ".7rem", opacity: .8 }}>Toque para continuar</small>
    </div>
  </div></Portal>;
}

/** Linha de estrelas, itens exclusivos e despertar dentro do painel do personagem (aba Melhorias). */
export default function KittyDevExtras({ item, info, balance, onSnapshot }: {
  item: IdleItemSnapshot; info: KittyDevCharacterSnapshot; balance: number; onSnapshot: (snapshot: IdleSnapshot) => void;
}) {
  const [sheet, setSheet] = useState<"click" | "stone" | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const awakening = info.awakening;
  const canAwaken = Boolean(awakening && awakening.unlocked && !awakening.awakened);

  const awaken = async () => {
    if (!awakening || busy) return;
    setBusy(true); setError(null);
    try {
      onSnapshot(await kittyDevAwaken(info.id));
      playSoundEffect("idleAwaken");
      setCelebrate(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível despertar agora.");
    } finally { setBusy(false); }
  };

  return <>
    <div className={styles.extras}>
      <div className={styles.starRow} role="img" aria-label={`${info.stars} de 5 estrelas`}>
        {Array.from({ length: 5 }, (_, index) => <Star key={index} className={index < info.stars ? styles.starOn : styles.starOff} fill="currentColor" strokeWidth={0} aria-hidden="true" />)}
      </div>
      {(["click", "stone"] as const).map((kind) => {
        const data = kind === "click" ? info.clickItem : info.stoneItem;
        const locked = data.level === 0;
        return <button key={kind} type="button" className={`${styles.itemChip} ${locked ? styles.itemChipLocked : ""}`} onClick={() => setSheet(kind)} aria-label={`${data.name}: ${locked ? "bloqueado" : `nível ${data.level}`}`}>
          <ItemArt kind={kind} locked={locked} />
          <span className={styles.itemText}><b>{data.name}</b><small>{locked ? "Bloqueado" : `Nv. ${data.level}/${data.maxLevel}`}</small></span>
        </button>;
      })}
    </div>
    {canAwaken && awakening && <button type="button" className={styles.awakenBtn} disabled={busy || balance < awakening.cost} onClick={() => void awaken()}>
      <Sparkles size={18} aria-hidden="true" /><span>Despertar</span>
      <span className={styles.awakenCost}><Image src="/idle/icons/game-money.webp" alt="" width={48} height={48} />{formatIdleNumber(awakening.cost)}</span>
    </button>}
    {awakening?.awakened && <span className={styles.awakenSoon} style={{ color: "#a8741a" }}><Crown size={12} style={{ display: "inline", verticalAlign: "-1px" }} aria-hidden="true" /> Despertada · produção x{awakening.multiplier}</span>}
    {info.stars >= 5 && !awakening && <span className={styles.awakenSoon}>Constelação completa · despertar em breve</span>}
    {error && <span className={styles.awakenSoon} role="alert" style={{ color: "#c0306a" }}>{error}</span>}
    {sheet && <ItemSheet kind={sheet} item={sheet === "click" ? info.clickItem : info.stoneItem} info={info} balance={balance} onClose={() => setSheet(null)} onSnapshot={onSnapshot} />}
    {celebrate && awakening?.awakened && <AwakenCelebration info={info} name={item.definition.name} onClose={() => setCelebrate(false)} />}
  </>;
}
