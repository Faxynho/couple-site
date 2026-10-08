"use client";

import Image from "next/image";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Crown, LayoutGrid, LockKeyhole, Sparkles, X } from "lucide-react";
import { kittyDevBuyConstellation } from "@/lib/idleApi";
import { IdleItemSnapshot, IdleModeSnapshot, IdleSnapshot, KittyDevCharacterSnapshot, KittyDevSnapshot } from "@/lib/idleTypes";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import { playSoundEffect } from "@/lib/sound";
import { GoldSparkle } from "./KittyDevIcons";
import { constellationShape, linkLevel, starPolygon } from "./constellationShapes";
import { STONE_ICON, charactersOfWorld, spriteFor } from "./kittyDevHelpers";
import styles from "./KittyDev.module.css";

const PARTICLES = Array.from({ length: 16 }, (_, index) => ({ angle: index * 22.5 + (index % 2 ? 6 : 0), distance: 26 + (index % 4) * 9, size: .5 + (index % 3) * .28, delay: (index % 5) * .02 }));
const FIREWORKS = [[18, 26], [78, 20], [50, 12], [24, 62], [82, 58], [50, 74], [12, 44], [90, 40]] as const;
const CONFETTI = Array.from({ length: 22 }, (_, index) => ({ x: (index * 37) % 100, delay: (index % 11) * .22, duration: 2.6 + (index % 5) * .35, size: .5 + (index % 4) * .18 }));

function Particles({ x, y }: { x: number; y: number }) {
  return <span className={styles.cstBurstWrap} style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true">
    <i className={styles.cstShock} />
    {PARTICLES.map((particle, index) => <GoldSparkle key={index} className={styles.cstParticle} style={{ "--a": `${particle.angle}deg`, "--r": `${particle.distance}px`, "--s": `${particle.size}rem`, "--d": `${particle.delay}s` } as CSSProperties} />)}
  </span>;
}

/** Brilhinhos que sobem pela tela (vaga-lumes do espaço). */
const ORBS = Array.from({ length: 14 }, (_, index) => ({ x: (index * 53 + 11) % 100, size: .35 + (index % 4) * .18, duration: 9 + (index % 5) * 2.3, delay: -(index * 1.7) }));

/** Desenho de uma constelação (usado na tela principal em tamanho grande e no álbum/celebração em miniatura). */
function ConstellationArt({ index, stars, mini = false, fresh }: { index: number; stars: number; mini?: boolean; fresh?: number }) {
  const shape = constellationShape(index);
  return <>
    {!mini && shape.nodes.map(([x, y], i) => i < stars && <circle key={`glow-${i}`} className={styles.cstNodeGlow} cx={x} cy={y} r="6.2" style={{ "--i": i } as CSSProperties} />)}
    {shape.links.map(([first, second]) => {
      // a luz sempre corre da estrela mais antiga para a mais nova
      const [a, b] = first < second ? [first, second] : [second, first];
      const level = linkLevel([a, b]);
      const on = level <= stars;
      const [x1, y1] = shape.nodes[a - 1]; const [x2, y2] = shape.nodes[b - 1];
      if (!on) return <line key={`${a}-${b}`} className={`${styles.cstLine} ${mini ? styles.cstLineMini : ""}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
      const drawing = fresh === level;
      return <g key={`${a}-${b}`}>
        <line className={`${styles.cstLineSolid} ${mini ? styles.cstLineSolidMini : ""} ${drawing ? styles.cstLineDraw : ""}`} pathLength={100} x1={x1} y1={y1} x2={x2} y2={y2} />
        {!mini && <line className={`${styles.cstLineFlow} ${drawing ? styles.cstLineFlowLate : ""}`} pathLength={100} x1={x1} y1={y1} x2={x2} y2={y2} />}
      </g>;
    })}
    {shape.nodes.map(([x, y], i) => {
      const level = i + 1;
      const on = level <= stars;
      return <polygon key={level} className={`${styles.cstNodeStar} ${on ? styles.cstNodeLit : styles.cstNodeDim} ${on && fresh === level ? styles.cstNodePop : ""} ${mini ? styles.cstNodeMini : ""}`} points={starPolygon(x, y, mini ? 8 : 6.4)} strokeLinejoin="round" style={{ "--i": i } as CSSProperties} />;
    })}
    {!mini && shape.nodes.map(([x, y], i) => i < stars && <circle key={`tw-${i}`} className={styles.cstTwinkleDot} cx={x + 5.2} cy={y - 5.2} r=".7" style={{ "--i": i } as CSSProperties} />)}
  </>;
}

function Album({ items, kd, current, onClose, onPick }: { items: IdleItemSnapshot[]; kd: KittyDevSnapshot; current: string; onClose: () => void; onPick: (id: string) => void }) {
  const done = items.filter((item) => (kd.characters[item.definition.id]?.stars ?? 0) >= 5).length;
  return <div className={styles.album} role="dialog" aria-label="Todas as constelações">
    <div className={styles.albumTop}>
      <button type="button" className={styles.roundBtn} onClick={onClose} aria-label="Fechar álbum"><X size={22} strokeWidth={3.2} /></button>
      <div className={styles.cstTitle}><small>Álbum</small><h2>Constelações</h2></div>
      <span className={styles.albumCount}><Crown size={14} aria-hidden="true" />{done}/{items.length}</span>
    </div>
    <div className={styles.albumGrid}>
      {items.map((item) => {
        const info = kd.characters[item.definition.id];
        const complete = info.stars >= 5;
        return <button key={item.definition.id} type="button" className={`${styles.albumCard} ${complete ? styles.albumCardDone : ""} ${item.purchased ? "" : styles.albumCardLocked} ${item.definition.id === current ? styles.albumCardCurrent : ""}`} onClick={() => onPick(item.definition.id)} aria-label={`${item.definition.name}: ${info.stars} de 5 estrelas`}>
          <span className={styles.albumArt}>
            <span className={styles.albumChar}><Image src={spriteFor(item, kd).src} alt="" fill sizes="96px" /></span>
            <svg className={styles.albumSvg} viewBox="0 0 100 100" aria-hidden="true"><ConstellationArt index={info.index} stars={item.purchased ? info.stars : 0} mini /></svg>
            {!item.purchased && <LockKeyhole className={styles.albumLock} size={20} aria-hidden="true" />}
            {complete && <Crown className={styles.albumCrown} size={16} aria-hidden="true" />}
          </span>
          <span className={styles.albumName}>{item.definition.name}</span>
        </button>;
      })}
    </div>
  </div>;
}

function CompleteCelebration({ item, info, kd, onClose }: { item: IdleItemSnapshot; info: KittyDevCharacterSnapshot; kd: KittyDevSnapshot; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 5_600);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return <div className={styles.complete} role="dialog" aria-label={`Constelação de ${item.definition.name} completa`} onClick={onClose}>
    <span className={styles.completeRays} aria-hidden="true" />
    {FIREWORKS.map(([x, y], index) => <span key={index} className={styles.firework} style={{ left: `${x}%`, top: `${y}%`, "--delay": `${.25 + index * .38}s`, "--hue": index % 3 } as CSSProperties} aria-hidden="true">
      {Array.from({ length: 12 }, (_, spark) => <i key={spark} style={{ "--a": `${spark * 30}deg` } as CSSProperties} />)}
    </span>)}
    <span className={styles.confetti} aria-hidden="true">{CONFETTI.map((piece, index) => <GoldSparkle key={index} style={{ left: `${piece.x}%`, "--delay": `${piece.delay}s`, "--dur": `${piece.duration}s`, "--s": `${piece.size}rem` } as CSSProperties} />)}</span>
    <div className={styles.completeBody}>
      <div className={styles.completeArt}>
        <span className={styles.completeChar}><Image src={spriteFor(item, kd).src} alt="" fill sizes="60vw" /></span>
        <svg viewBox="0 0 100 100" aria-hidden="true"><ConstellationArt index={info.index} stars={5} /></svg>
      </div>
      <p className={styles.completeTitle}>Constelação completa!</p>
      <p className={styles.completeName}>{item.definition.name}</p>
      {info.awakening && !info.awakening.awakened && <p className={styles.completeHint}><Sparkles size={14} aria-hidden="true" /> Despertar liberado</p>}
    </div>
  </div>;
}

/** Tela de constelações do mundo: um desenho de 5 estrelas por personagem, evoluído com Pedras Estelares. */
export default function KittyConstellation({ data, world, worldName, onClose, onSnapshot }: {
  data: IdleModeSnapshot; world: number; worldName: string; onClose: () => void; onSnapshot: (snapshot: IdleSnapshot) => void;
}) {
  const kd = data.kittyDev!;
  const roster = useMemo(() => charactersOfWorld(data.items, world), [data.items, world]);
  const [selectedId, setSelectedId] = useState<string>(() => (roster.find((item) => item.purchased) ?? roster[0])?.definition.id ?? "");
  const [pickedLevel, setPickedLevel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ key: number; level: number } | null>(null);
  const [fresh, setFresh] = useState<{ key: number; level: number } | null>(null);
  const [flash, setFlash] = useState(0);
  const [floating, setFloating] = useState<{ key: number; text: string; x: number; y: number } | null>(null);
  const [complete, setComplete] = useState<string | null>(null);
  const [album, setAlbum] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const item = roster.find((entry) => entry.definition.id === selectedId) ?? roster[0];
  const info = item ? kd.characters[item.definition.id] : undefined;

  if (!item || !info) return <div className={styles.cst}><div className={styles.cstTop}><button type="button" className={styles.roundBtn} onClick={onClose} aria-label="Voltar"><ArrowLeft size={24} strokeWidth={3.4} /></button></div><p className={styles.cstEmpty}>Nenhum personagem neste mundo ainda.</p></div>;

  const shape = constellationShape(info.index);
  const nextLevel = info.stars < 5 ? info.stars + 1 : null;
  const shownLevel = pickedLevel ?? nextLevel ?? 5;
  const requirement = nextLevel ? info.starRequirements[nextLevel - 1] : 0;
  const levelOk = item.level >= requirement;
  const enoughStones = info.nextStarCost !== null && kd.stones >= info.nextStarCost;
  const canBuy = Boolean(item.purchased && nextLevel && enoughStones && levelOk && !busy);
  const sprite = spriteFor(item, kd);
  const later = (callback: () => void, ms: number) => timers.current.push(window.setTimeout(callback, ms));

  const buy = async () => {
    if (!canBuy || !nextLevel) return;
    setBusy(true); setError(null);
    try {
      const bonus = info.starBonuses[nextLevel - 1];
      onSnapshot(await kittyDevBuyConstellation(item.definition.id));
      const key = Date.now();
      const [x, y] = shape.nodes[nextLevel - 1];
      setBurst({ key, level: nextLevel }); setFresh({ key, level: nextLevel }); setFlash(key); setPickedLevel(null);
      setFloating({ key, text: bonus, x, y });
      later(() => setBurst(null), 1_100);
      later(() => setFloating(null), 1_700);
      if (nextLevel === 5) {
        playSoundEffect("idleAwaken");
        later(() => setComplete(item.definition.id), 950);
      } else playSoundEffect("idleStar");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível evoluir agora.");
    } finally { setBusy(false); }
  };

  const chip = (() => {
    if (!item.purchased) return "Desbloqueie o personagem";
    return info.starBonuses[shownLevel - 1];
  })();
  const chipDone = shownLevel <= info.stars;

  return <div className={styles.cst} role="dialog" aria-label={`Constelações de ${worldName}`}>
    <span className={styles.cstNebula} aria-hidden="true" />
    <span className={`${styles.cstAurora}`} aria-hidden="true" />
    <span className={`${styles.cstAurora} ${styles.cstAuroraB}`} aria-hidden="true" />
    <span className={styles.cstStarsFar} aria-hidden="true" />
    <span className={styles.cstStarsNear} aria-hidden="true" />
    <span className={styles.cstTwinkle} aria-hidden="true" />
    {ORBS.map((orb, index) => <i key={index} className={styles.cstOrb} style={{ left: `${orb.x}%`, "--s": `${orb.size}rem`, "--d": `${orb.duration}s`, "--dl": `${orb.delay}s` } as CSSProperties} aria-hidden="true" />)}
    {[0, 1, 2, 3].map((index) => <span key={index} className={styles.shootingStar} style={{ "--delay": `${index * 2.6 + 1}s`, "--top": `${8 + index * 15}%` } as CSSProperties} aria-hidden="true" />)}
    {flash > 0 && <span key={flash} className={styles.cstFlash} aria-hidden="true" />}
    <div className={styles.cstTop}>
      <button type="button" className={styles.roundBtn} onClick={onClose} aria-label="Voltar para o mundo"><ArrowLeft size={24} strokeWidth={3.4} /></button>
      <div className={styles.cstTitle}><h2>{worldName}</h2></div>
      <div className={styles.stonePill} aria-label={`${kd.stones} Pedras Estelares`}><Image src={STONE_ICON} alt="" width={64} height={64} /><span>{formatIdleNumber(kd.stones)}</span></div>
    </div>
    <div className={styles.cstTabs} role="tablist" aria-label="Personagens do mundo">
      {roster.map((entry) => {
        const entryInfo = kd.characters[entry.definition.id];
        const on = entry.definition.id === item.definition.id;
        return <button key={entry.definition.id} type="button" role="tab" aria-selected={on} aria-label={`${entry.definition.name}: ${entryInfo.stars} de 5 estrelas`}
          className={`${styles.cstTab} ${on ? styles.cstTabOn : ""} ${entry.purchased ? "" : styles.cstTabLocked} ${entryInfo.stars >= 5 ? styles.cstTabDone : ""}`} onClick={() => { setSelectedId(entry.definition.id); setPickedLevel(null); setError(null); }}>
          <span className={styles.cstTabArt}><Image src={spriteFor(entry, kd).src} alt="" fill sizes="64px" /></span>
          {!entry.purchased && <LockKeyhole className={styles.cstTabLockIcon} size={18} aria-hidden="true" />}
          <span className={styles.cstTabDots} aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i key={index} data-on={index < entryInfo.stars ? "yes" : "no"} />)}</span>
        </button>;
      })}
    </div>
    <div className={styles.cstStage}>
      <div key={item.definition.id} className={styles.cstArena}>
        <span className={styles.cstHalo} aria-hidden="true" />
        <span className={styles.cstRing} aria-hidden="true" />
        <span className={`${styles.cstRing} ${styles.cstRingB}`} aria-hidden="true" />
        <span className={`${styles.cstChar} ${item.purchased ? "" : styles.cstCharLocked}`}><Image src={sprite.src} alt={item.definition.name} fill sizes="70vw" priority /></span>
        <svg className={styles.cstCanvas} viewBox="0 0 100 100" role="group" aria-label={`Constelação ${shape.name} de ${item.definition.name}`}>
          <ConstellationArt index={info.index} stars={info.stars} fresh={fresh?.level} />
          {shape.nodes.map(([x, y], i) => {
            const level = i + 1;
            const next = level === nextLevel && item.purchased;
            return <g key={level} role="button" tabIndex={0} aria-label={`Estrela ${level}: ${level <= info.stars ? "acesa" : next ? "próxima" : "apagada"}`} className={`${styles.cstNode} ${shownLevel === level ? styles.cstNodeSel : ""}`}
              onClick={() => setPickedLevel(level)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setPickedLevel(level); } }}>
              <circle cx={x} cy={y} r="10" fill="transparent" />
              {next && <>
                <circle className={styles.cstNextRing} cx={x} cy={y} r="8" /><circle className={`${styles.cstNextRing} ${styles.cstNextRingB}`} cx={x} cy={y} r="8" />
                <g className={styles.cstOrbit} style={{ transformOrigin: `${x}px ${y}px` }}><circle cx={x + 9.5} cy={y} r="1.1" /><circle cx={x - 9.5} cy={y} r=".7" /></g>
              </>}
              {shownLevel === level && <circle className={styles.cstSelRing} cx={x} cy={y} r="9" />}
            </g>;
          })}
        </svg>
        {burst && <Particles key={`burst-${burst.key}`} x={shape.nodes[burst.level - 1][0]} y={shape.nodes[burst.level - 1][1]} />}
        {floating && <span key={`float-${floating.key}`} className={styles.cstFloat} style={{ left: `${floating.x}%`, top: `${floating.y}%` }} aria-hidden="true">{floating.text}</span>}
      </div>
    </div>
    <div className={styles.cstBottom}>
      <p className={`${styles.cstChip} ${chipDone ? styles.cstChipDone : ""}`}>{chipDone ? <Check size={14} strokeWidth={3.6} aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}<span>{chip}</span></p>
      {nextLevel
        ? <button type="button" className={`${styles.cstBuy} ${canBuy ? styles.cstBuyReady : ""}`} disabled={!canBuy} onClick={() => void buy()}>
            {!item.purchased ? <><LockKeyhole size={18} aria-hidden="true" /><span>Bloqueado</span></>
              : !levelOk ? <><LockKeyhole size={18} aria-hidden="true" /><span>Requer nível {requirement}</span></>
              : <><span>Evoluir</span><Image src={STONE_ICON} alt="" width={64} height={64} /><span>{info.nextStarCost}</span></>}
          </button>
        : <p className={styles.cstDone}><Crown size={18} aria-hidden="true" />Completa!</p>}
      {error && <p role="alert" className={styles.cstError}>{error}</p>}
      <button type="button" className={styles.albumBtn} onClick={() => setAlbum(true)} aria-label="Ver todas as constelações"><LayoutGrid size={18} aria-hidden="true" /><span>Ver todas</span></button>
    </div>
    {album && <Album items={data.items} kd={kd} current={item.definition.id} onClose={() => setAlbum(false)} onPick={(id) => { if (roster.some((entry) => entry.definition.id === id)) { setSelectedId(id); setPickedLevel(null); setAlbum(false); } }} />}
    {complete && <CompleteCelebration item={roster.find((entry) => entry.definition.id === complete) ?? item} info={kd.characters[complete] ?? info} kd={kd} onClose={() => setComplete(null)} />}
  </div>;
}
