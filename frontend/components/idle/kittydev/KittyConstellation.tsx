"use client";

import Image from "next/image";
import { CSSProperties, ReactNode, memo, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, Crown, LayoutGrid, LockKeyhole, Sparkles, X } from "lucide-react";
import { kittyDevBuyConstellation } from "@/lib/idleApi";
import { IdleItemSnapshot, IdleModeSnapshot, IdleSnapshot, KittyDevCharacterSnapshot, KittyDevSnapshot } from "@/lib/idleTypes";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import { pushBackLayer } from "@/lib/backLayer";
import { playSoundEffect } from "@/lib/sound";
import { GoldSparkle } from "./KittyDevIcons";
import { constellationShape, linkLevel, starPolygon } from "./constellationShapes";
import { STONE_ICON, charactersOfWorld, spriteFor } from "./kittyDevHelpers";
import styles from "./KittyDev.module.css";

const PARTICLES = Array.from({ length: 16 }, (_, index) => ({ angle: index * 22.5 + (index % 2 ? 6 : 0), distance: 26 + (index % 4) * 9, size: .5 + (index % 3) * .28, delay: (index % 5) * .02 }));
const FIREWORKS = [[18, 26], [80, 22], [50, 12], [22, 64], [82, 60]] as const;
const CONFETTI = Array.from({ length: 14 }, (_, index) => ({ x: (index * 37) % 100, delay: (index % 11) * .22, duration: 2.6 + (index % 5) * .35, size: .5 + (index % 4) * .18 }));

function Particles({ x, y }: { x: number; y: number }) {
  return <span className={styles.cstBurstWrap} style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true">
    <i className={styles.cstShock} />
    {PARTICLES.map((particle, index) => <GoldSparkle key={index} className={styles.cstParticle} style={{ "--a": `${particle.angle}deg`, "--r": `${particle.distance}px`, "--s": `${particle.size}rem`, "--d": `${particle.delay}s` } as CSSProperties} />)}
  </span>;
}

/** Fecha a camada com o botão voltar do celular (em vez de sair do jogo). */
function useBackLayer(onBack: () => void) {
  const ref = useRef(onBack);
  ref.current = onBack;
  useEffect(() => pushBackLayer(() => ref.current()), []);
}

/** Fundo do espaço: só camadas estáticas ou animadas por transform/opacity (nada de blur/filtros, que travam no celular). */
const CstBackdrop = memo(function CstBackdrop() {
  return <>
    <span className={styles.cstNebula} aria-hidden="true" />
    <span className={styles.cstAurora} aria-hidden="true" />
    <span className={styles.cstStarsFar} aria-hidden="true" />
    <span className={styles.cstStarsNear} aria-hidden="true" />
    <span className={styles.shootingStar} style={{ "--delay": "2s", "--top": "14%" } as CSSProperties} aria-hidden="true" />
  </>;
});

/** Linhas da constelação. SVG estático: só a linha recém-ligada anima (uma única vez); nada de filtros nem brilho animado. */
const ConstellationLines = memo(function ConstellationLines({ index, stars, mini = false, fresh }: { index: number; stars: number; mini?: boolean; fresh?: number }) {
  const shape = constellationShape(index);
  return <>
    {!mini && shape.links.map(([first, second]) => {
      const [a, b] = first < second ? [first, second] : [second, first];
      const level = linkLevel([a, b]);
      if (level > stars) return null;
      const [x1, y1] = shape.nodes[a - 1]; const [x2, y2] = shape.nodes[b - 1];
      // brilho amarelo do traço = a mesma linha, mais larga e translúcida (sem filtro)
      return <line key={`halo-${a}-${b}`} className={`${styles.cstLineHalo} ${fresh === level ? styles.cstLineHaloIn : ""}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
    })}
    {shape.links.map(([first, second]) => {
      // a luz sempre corre da estrela mais antiga para a mais nova
      const [a, b] = first < second ? [first, second] : [second, first];
      const level = linkLevel([a, b]);
      const [x1, y1] = shape.nodes[a - 1]; const [x2, y2] = shape.nodes[b - 1];
      if (level > stars) return <line key={`${a}-${b}`} className={`${styles.cstLine} ${mini ? styles.cstLineMini : ""}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
      return <line key={`${a}-${b}`} className={`${styles.cstLineSolid} ${mini ? styles.cstLineSolidMini : ""} ${fresh === level ? styles.cstLineDraw : ""}`} pathLength={100} x1={x1} y1={y1} x2={x2} y2={y2} />;
    })}
  </>;
});

/** Estrelas desenhadas no SVG (sem animação): miniaturas do álbum e celebração. */
const StaticStars = memo(function StaticStars({ index, stars, mini = false }: { index: number; stars: number; mini?: boolean }) {
  const shape = constellationShape(index);
  return <>{shape.nodes.map(([x, y], i) => {
    const on = i + 1 <= stars;
    return <polygon key={i} className={`${styles.cstNodeStar} ${on ? styles.cstNodeLit : styles.cstNodeDim} ${mini ? styles.cstNodeMini : ""}`} points={starPolygon(x, y, mini ? 8 : 6.4)} strokeLinejoin="round" />;
  })}</>;
});

const STAR_POINTS = starPolygon(0, 0, 8);
const STAR_SHINE = starPolygon(0, -.4, 4);

/**
 * Estrelas da tela principal como elementos HTML sobre o desenho: assim o brilho, o pulso e os anéis animam só
 * com transform/opacity na GPU (animar elementos dentro de SVG repinta o desenho inteiro a cada quadro e engasga no celular).
 */
function LiveStars({ index, stars, nextLevel, purchased, shownLevel, fresh, onPick }: { index: number; stars: number; nextLevel: number | null; purchased: boolean; shownLevel: number; fresh?: number; onPick: (level: number) => void }) {
  const shape = constellationShape(index);
  return <>{shape.nodes.map(([x, y], i) => {
    const level = i + 1;
    const on = level <= stars;
    const next = level === nextLevel && purchased;
    const selected = shownLevel === level;
    return <button key={level} type="button" className={`${styles.cstStarBtn} ${selected ? styles.cstStarBtnSel : ""}`} style={{ left: `${x}%`, top: `${y}%`, "--i": i } as CSSProperties} aria-pressed={selected}
      aria-label={`Estrela ${level}: ${on ? "acesa" : next ? "próxima" : "apagada"}`} onClick={() => onPick(level)}>
      {on && <span className={styles.cstStarGlow} aria-hidden="true" />}
      {next && <><i className={styles.cstNextRing} aria-hidden="true" /><i className={`${styles.cstNextRing} ${styles.cstNextRingB}`} aria-hidden="true" /></>}
      {selected && <i className={styles.cstSelRing} aria-hidden="true" />}
      <svg className={`${styles.cstStarSvg} ${on ? styles.cstStarOn : styles.cstStarOff} ${on && fresh === level ? styles.cstStarPop : ""}`} viewBox="-9 -9 18 18" aria-hidden="true">
        <polygon className={styles.cstStarBody} points={STAR_POINTS} strokeLinejoin="round" />
        {on && <polygon className={styles.cstStarShine} points={STAR_SHINE} />}
      </svg>
    </button>;
  })}</>;
}

function Album({ items, kd, current, onClose, onPick }: { items: IdleItemSnapshot[]; kd: KittyDevSnapshot; current: string; onClose: () => void; onPick: (id: string) => void }) {
  useBackLayer(onClose);
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
        if (!info) return null;
        const complete = info.stars >= 5;
        return <button key={item.definition.id} type="button" className={`${styles.albumCard} ${complete ? styles.albumCardDone : ""} ${item.purchased ? "" : styles.albumCardLocked} ${item.definition.id === current ? styles.albumCardCurrent : ""}`} onClick={() => onPick(item.definition.id)} aria-label={`${item.definition.name}: ${info.stars} de 5 estrelas`}>
          <span className={styles.albumArt}>
            <span className={styles.albumChar}><Image src={spriteFor(item, kd).src} alt="" fill sizes="96px" /></span>
            <svg className={styles.albumSvg} viewBox="0 0 100 100" aria-hidden="true"><ConstellationLines index={info.index} stars={item.purchased ? info.stars : 0} mini /><StaticStars index={info.index} stars={item.purchased ? info.stars : 0} mini /></svg>
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
  useBackLayer(onClose);
  // o pai recria onClose a cada atualização do jogo (500 ms): guardar numa ref evita reiniciar o tempo da celebração
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const timer = window.setTimeout(() => closeRef.current(), 5_600);
    return () => window.clearTimeout(timer);
  }, []);
  return <div className={styles.complete} role="dialog" aria-label={`Constelação de ${item.definition.name} completa`} onClick={onClose}>
    <span className={styles.completeRays} aria-hidden="true" />
    <span className={styles.completeShade} aria-hidden="true" />
    {FIREWORKS.map(([x, y], index) => <span key={index} className={styles.firework} style={{ left: `${x}%`, top: `${y}%`, "--delay": `${.25 + index * .38}s`, "--hue": index % 3 } as CSSProperties} aria-hidden="true">
      {Array.from({ length: 8 }, (_, spark) => <i key={spark} style={{ "--a": `${spark * 45}deg` } as CSSProperties} />)}
    </span>)}
    <span className={styles.confetti} aria-hidden="true">{CONFETTI.map((piece, index) => <GoldSparkle key={index} style={{ left: `${piece.x}%`, "--delay": `${piece.delay}s`, "--dur": `${piece.duration}s`, "--s": `${piece.size}rem` } as CSSProperties} />)}</span>
    <div className={styles.completeBody}>
      <div className={styles.completeArt}>
        <span className={styles.completeChar}><Image src={spriteFor(item, kd).src} alt="" fill sizes="60vw" /></span>
        <svg viewBox="0 0 100 100" aria-hidden="true"><ConstellationLines index={info.index} stars={5} /><StaticStars index={info.index} stars={5} /></svg>
      </div>
      <p className={styles.completeTitle}>Constelação completa!</p>
      <p className={styles.completeName}>{item.definition.name}</p>
      {info.awakening && !info.awakening.awakened && <p className={styles.completeHint}><Sparkles size={14} aria-hidden="true" /> Despertar liberado</p>}
    </div>
  </div>;
}

/** Tela de constelações: um desenho de 5 estrelas por personagem, evoluído com Pedras Estelares. Mostra um mundo por vez; o álbum leva a qualquer personagem de qualquer mundo. */
export default function KittyConstellation({ data, world, worldName, onClose, onSnapshot }: {
  data: IdleModeSnapshot; world: number; worldName: string; onClose: () => void; onSnapshot: (snapshot: IdleSnapshot) => void;
}) {
  const kd = data.kittyDev!;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useBackLayer(onClose);
  const [selectedId, setSelectedId] = useState<string>(() => {
    const first = charactersOfWorld(data.items, world);
    return (first.find((item) => item.purchased) ?? first[0] ?? data.items[0])?.definition.id ?? "";
  });
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

  const item = data.items.find((entry) => entry.definition.id === selectedId) ?? data.items[0];
  const info = item ? kd.characters[item.definition.id] : undefined;
  // O mundo exibido é o do personagem escolhido (pelo álbum dá para ir a qualquer mundo).
  const currentWorld = item?.definition.scene ?? world;
  const roster = useMemo(() => charactersOfWorld(data.items, currentWorld), [data.items, currentWorld]);
  const currentWorldName = data.scenes.find((scene) => scene.id === currentWorld)?.name ?? worldName;

  const closeButton = <button type="button" className={styles.roundBtn} onClick={onClose} aria-label="Voltar para o mundo"><ArrowLeft size={24} strokeWidth={3.4} /></button>;
  const wrap = (children: ReactNode) => mounted ? createPortal(children, document.body) : null;

  if (!item || !info) return wrap(<div className={styles.cst}><div className={styles.cstTop}>{closeButton}</div><p className={styles.cstEmpty}>Nenhum personagem neste mundo ainda.</p></div>);

  const shape = constellationShape(info.index);
  const nextLevel = info.stars < 5 ? info.stars + 1 : null;
  const shownLevel = pickedLevel ?? nextLevel ?? 5;
  const requirement = nextLevel ? info.starRequirements[nextLevel - 1] : 0;
  const levelOk = item.level >= requirement;
  const enoughStones = info.nextStarCost !== null && kd.stones >= info.nextStarCost;
  const canBuy = Boolean(item.purchased && nextLevel && enoughStones && levelOk && !busy);
  const sprite = spriteFor(item, kd);
  const later = (callback: () => void, ms: number) => timers.current.push(window.setTimeout(callback, ms));
  const select = (id: string) => { setSelectedId(id); setPickedLevel(null); setError(null); setBurst(null); setFloating(null); };

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

  const chip = !item.purchased ? "Desbloqueie o personagem" : info.starBonuses[shownLevel - 1];
  const chipDone = shownLevel <= info.stars;

  return wrap(<div className={`${styles.kd} ${styles.cst}`} role="dialog" aria-label={`Constelações de ${currentWorldName}`}>
    <CstBackdrop />
    {flash > 0 && <span key={flash} className={styles.cstFlash} aria-hidden="true" />}
    <div className={styles.cstTop}>
      {closeButton}
      <div className={styles.cstTitle}><h2>{currentWorldName}</h2></div>
      <div className={styles.stonePill} aria-label={`${kd.stones} Pedras Estelares`}><Image src={STONE_ICON} alt="" width={64} height={64} /><span>{formatIdleNumber(kd.stones)}</span></div>
    </div>
    <div className={styles.cstTabs} role="tablist" aria-label="Personagens do mundo">
      {roster.map((entry) => {
        const entryInfo = kd.characters[entry.definition.id];
        if (!entryInfo) return null;
        const on = entry.definition.id === item.definition.id;
        return <button key={entry.definition.id} type="button" role="tab" aria-selected={on} aria-label={`${entry.definition.name}: ${entryInfo.stars} de 5 estrelas`}
          className={`${styles.cstTab} ${on ? styles.cstTabOn : ""} ${entry.purchased ? "" : styles.cstTabLocked} ${entryInfo.stars >= 5 ? styles.cstTabDone : ""}`} onClick={() => select(entry.definition.id)}>
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
        <svg className={styles.cstCanvas} viewBox="0 0 100 100" aria-hidden="true"><ConstellationLines index={info.index} stars={info.stars} fresh={fresh?.level} /></svg>
        <div className={styles.cstStars} role="group" aria-label={`Constelação ${shape.name} de ${item.definition.name}`}>
          <LiveStars index={info.index} stars={info.stars} nextLevel={nextLevel} purchased={item.purchased} shownLevel={shownLevel} fresh={fresh?.level} onPick={setPickedLevel} />
        </div>
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
    {album && <Album items={data.items} kd={kd} current={item.definition.id} onClose={() => setAlbum(false)} onPick={(id) => { if (data.items.some((entry) => entry.definition.id === id)) { select(id); setAlbum(false); } }} />}
    {complete && <CompleteCelebration item={data.items.find((entry) => entry.definition.id === complete) ?? item} info={kd.characters[complete] ?? info} kd={kd} onClose={() => setComplete(null)} />}
  </div>);
}
