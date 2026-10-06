"use client";

import Image from "next/image";
import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Crown, LockKeyhole, Shirt, Sparkles, X } from "lucide-react";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import { kittyDevAwaken, kittyDevBuyItem, kittyDevSetSkin } from "@/lib/idleApi";
import { IdleItemSnapshot, IdleSnapshot, KittyDevCharacterSnapshot, KittyDevItemSnapshot } from "@/lib/idleTypes";
import { playSoundEffect } from "@/lib/sound";
import { GoldSparkle, OrnateCorner, ShinyStar } from "./KittyDevIcons";
import { AWAKE_AURA, CLICK_ICON, STAR_SLOT_OF_LEVEL, STONE_ICON } from "./kittyDevHelpers";
import styles from "./KittyDev.module.css";

/** Auras e brilhos que ficam atrás/ao redor do personagem despertado. */
export function AwakeEffects() {
  const sparks: Array<[number, number, number, number, number]> = [[8, 18, .9, 2.4, 0], [86, 14, .75, 2.8, -.8], [14, 62, .7, 3, -1.4], [90, 58, 1, 2.2, -.4], [48, 4, .8, 2.6, -1.9], [30, 88, .65, 3.1, -.9], [74, 84, .8, 2.5, -1.6]];
  return <>
    <span className={styles.aura} aria-hidden="true" style={{ backgroundImage: `url(${AWAKE_AURA})` }} />
    <span className={styles.awakeSparks} aria-hidden="true">{sparks.map(([x, y, s, d, dl], index) => <i key={index} style={{ "--x": x, "--y": y, "--s": `${s}rem`, "--d": `${d}s`, "--dl": `${dl}s` } as CSSProperties}><GoldSparkle width="100%" height="100%" /></i>)}</span>
  </>;
}

/** Moldura ornamentada dourada (cantos desenhados + duas linhas), igual à da imagem de referência. */
export function OrnateCorners({ compact = false }: { compact?: boolean }) {
  return <span className={`${styles.ornateCorners} ${compact ? styles.ornateCornersCompact : ""}`} aria-hidden="true">
    {[0, 90, 180, 270].map((rotate) => <OrnateCorner key={rotate} rotate={rotate} className={`${styles.ornateCorner} ${styles[`ornateCorner${rotate}` as keyof typeof styles]}`} />)}
    <GoldSparkle className={`${styles.ornateGem} ${styles.ornateGemTop}`} />
  </span>;
}

/** Os pop-ups saem do painel (que tem backdrop-filter e prenderia o position: fixed) e vão para o body. */
function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

/** Arco de estrelas do personagem: sem fundo, ordem esquerda→direita→esquerda→direita→meio (a última, maior). */
export function KittyStarArc({ stars }: { stars: number }) {
  return <div className={styles.starArc} role="img" aria-label={`${stars} de 5 estrelas`}>
    {STAR_SLOT_OF_LEVEL.map((slot, levelIndex) => {
      const lit = levelIndex < stars;
      return <span key={levelIndex} className={`${styles.arcStar} ${lit ? styles.arcStarLit : ""}`} data-slot={slot} data-level={levelIndex + 1} style={{ "--delay": `${levelIndex * .35}s` } as CSSProperties}>
        <ShinyStar lit={lit} id={`arc${levelIndex}`} />
      </span>;
    })}
  </div>;
}

function ItemSprite({ kind }: { kind: "click" | "stone" }) {
  return <Image src={kind === "click" ? CLICK_ICON : STONE_ICON} alt="" width={96} height={96} />;
}

function effectLine(kind: "click" | "stone", item: KittyDevItemSnapshot, info: KittyDevCharacterSnapshot) {
  const format = (value: number) => (Math.round(value * 100) / 100).toString();
  if (kind === "click") return { now: `×${format(item.multiplier)}`, next: item.nextMultiplier ? `×${format(item.nextMultiplier)}` : null, caption: "por clique" };
  return { now: `+${format(info.stoneYield * item.multiplier)}`, next: item.nextMultiplier ? `+${format(info.stoneYield * item.nextMultiplier)}` : null, caption: "a cada 10 níveis" };
}

function ItemSheet({ kind, item, info, balance, onClose, onSnapshot }: {
  kind: "click" | "stone"; item: KittyDevItemSnapshot; info: KittyDevCharacterSnapshot; balance: number; onClose: () => void; onSnapshot: (snapshot: IdleSnapshot) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const owned = item.level > 0;
  const maxed = item.nextCost === null;
  const effect = effectLine(kind, item, info);
  const afford = !maxed && item.nextCost !== null && balance >= item.nextCost;
  const buy = async () => {
    if (!afford || busy) return;
    setBusy(true); setError(null);
    try {
      onSnapshot(await kittyDevBuyItem(info.id, kind));
      playSoundEffect(owned ? "idleUpgrade" : "idleUnlock");
      setPulse((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível comprar agora.");
    } finally { setBusy(false); }
  };
  return <Portal><div className={styles.sheetOverlay} role="dialog" aria-label={item.name} onClick={onClose}>
    <div className={`${styles.sheet} ${styles.itemSheet}`} data-kind={kind} onClick={(event) => event.stopPropagation()}>
      <button type="button" className={styles.sheetClose} onClick={onClose} aria-label="Fechar"><X size={16} strokeWidth={3} /></button>
      <div className={styles.itemHero}>
        <span className={styles.itemRays} aria-hidden="true" />
        <span key={pulse} className={`${styles.itemHeroArt} ${owned ? "" : styles.itemHeroArtLocked} ${pulse ? styles.itemHeroPop : ""}`}><ItemSprite kind={kind} /></span>
        {!owned && <span className={styles.itemHeroLock}><LockKeyhole size={20} strokeWidth={3} aria-hidden="true" /></span>}
        <GoldSparkle className={`${styles.itemSpark} ${styles.itemSparkA}`} /><GoldSparkle className={`${styles.itemSpark} ${styles.itemSparkB}`} />
      </div>
      <h3 className={styles.itemTitle}>{item.name}</h3>
      <div className={styles.pips} aria-label={`Nível ${item.level} de ${item.maxLevel}`}>{Array.from({ length: item.maxLevel }, (_, index) => <i key={index} data-on={index < item.level ? "yes" : "no"} />)}</div>
      <div className={styles.itemEffect} aria-label={maxed ? `${effect.now} ${effect.caption}` : `${owned ? effect.now : "bloqueado"} para ${effect.next} ${effect.caption}`}>
        {kind === "stone" && <Image src={STONE_ICON} alt="" width={40} height={40} className={styles.itemEffectIcon} />}
        <b className={owned ? "" : styles.itemEffectOff}>{owned ? effect.now : "—"}</b>
        {effect.next && <><span aria-hidden="true">➜</span><strong>{effect.next}</strong></>}
        <small>{effect.caption}</small>
      </div>
      <button type="button" className={styles.buyBtn} disabled={!afford || busy} onClick={() => void buy()}>
        {maxed ? <><Crown size={18} aria-hidden="true" /><span>Máximo</span></> : <>
          <span>{owned ? "Melhorar" : "Comprar"}</span>
          <Image src="/idle/icons/game-money.webp" alt="" width={48} height={48} /><span>{formatIdleNumber(item.nextCost!)}</span>
        </>}
      </button>
      {error && <p role="alert" className={styles.sheetError}>{error}</p>}
    </div>
  </div></Portal>;
}

/** Itens do personagem: só os ícones, empilhados à esquerda abaixo do título. Bloqueados até serem comprados. */
export function KittyItemRail({ info, balance, onSnapshot }: { info: KittyDevCharacterSnapshot; balance: number; onSnapshot: (snapshot: IdleSnapshot) => void }) {
  const [sheet, setSheet] = useState<"click" | "stone" | null>(null);
  return <>
    <div className={styles.itemRail}>
      {(["click", "stone"] as const).map((kind) => {
        const data = kind === "click" ? info.clickItem : info.stoneItem;
        const locked = data.level === 0;
        const canBuy = data.nextCost !== null && balance >= data.nextCost;
        return <button key={kind} type="button" className={`${styles.railBtn} ${locked ? styles.railBtnLocked : ""} ${canBuy ? styles.railBtnReady : ""}`} onClick={() => setSheet(kind)}
          aria-label={`${data.name}: ${locked ? "bloqueado" : `nível ${data.level}`}`}>
          <span className={styles.railArt}><ItemSprite kind={kind} /></span>
          {locked && <span className={styles.railLock}><LockKeyhole size={11} strokeWidth={3} aria-hidden="true" /></span>}
        </button>;
      })}
    </div>
    {sheet && <ItemSheet kind={sheet} item={sheet === "click" ? info.clickItem : info.stoneItem} info={info} balance={balance} onClose={() => setSheet(null)} onSnapshot={onSnapshot} />}
  </>;
}

/** Botão pequeno (só ícone) que alterna entre a skin normal e a despertada. Só aparece depois de despertar. */
export function KittySkinToggle({ info, onSnapshot }: { info: KittyDevCharacterSnapshot; onSnapshot: (snapshot: IdleSnapshot) => void }) {
  const [busy, setBusy] = useState(false);
  const awakening = info.awakening;
  if (!awakening?.awakened) return null;
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      onSnapshot(await kittyDevSetSkin(info.id, !awakening.skinAwake));
      playSoundEffect("idlePop");
    } catch { /* o botão simplesmente não troca */ } finally { setBusy(false); }
  };
  return <button type="button" className={`${styles.skinToggle} ${awakening.skinAwake ? styles.skinToggleOn : ""}`} onClick={() => void toggle()} aria-pressed={awakening.skinAwake}
    aria-label={awakening.skinAwake ? "Usar a skin normal" : "Usar a skin despertada"} title={awakening.skinAwake ? "Skin normal" : "Skin despertada"}>
    <Shirt size={20} strokeWidth={2.6} aria-hidden="true" />
  </button>;
}

/** Pedras ganhas ao completar 10 níveis: sprite + quantidade saindo do botão Melhorar, com destaque maior que o clique. */
export function StoneGainBurst({ amount }: { amount: number }) {
  return <span className={styles.stoneGain} role="status" aria-label={`+${amount} Pedras Estelares`}>
    <span className={styles.stoneGainGlow} aria-hidden="true" />
    <Image src={STONE_ICON} alt="" width={96} height={96} />
    <b>+{formatIdleNumber(amount)}</b>
    {[0, 1, 2, 3, 4, 5].map((index) => <GoldSparkle key={index} className={styles.stoneGainSpark} style={{ "--a": `${index * 60}deg`, "--d": `${index * .04}s` } as CSSProperties} />)}
  </span>;
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

/** Botão de despertar (dentro do painel do personagem) e a celebração. */
export default function KittyDevExtras({ item, info, balance, onSnapshot }: {
  item: IdleItemSnapshot; info: KittyDevCharacterSnapshot; balance: number; onSnapshot: (snapshot: IdleSnapshot) => void;
}) {
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
    {canAwaken && awakening && <button type="button" className={styles.awakenBtn} disabled={busy || balance < awakening.cost} onClick={() => void awaken()}>
      <Sparkles size={18} aria-hidden="true" /><span>Despertar</span>
      <span className={styles.awakenCost}><Image src="/idle/icons/game-money.webp" alt="" width={48} height={48} />{formatIdleNumber(awakening.cost)}</span>
    </button>}
    {info.stars >= 5 && !awakening && <span className={styles.awakenSoon}>Constelação completa · despertar em breve</span>}
    {error && <span className={styles.awakenSoon} role="alert" style={{ color: "#c0306a" }}>{error}</span>}
    {celebrate && awakening?.awakened && <AwakenCelebration info={info} name={item.definition.name} onClose={() => setCelebrate(false)} />}
  </>;
}
