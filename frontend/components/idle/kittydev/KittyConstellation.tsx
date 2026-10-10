"use client";

import Image from "next/image";
import { CSSProperties, ReactNode, memo, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Crown, Info, LayoutGrid, LockKeyhole, Sparkles, X } from "lucide-react";
import { kittyDevBuyConstellation } from "@/lib/idleApi";
import { IdleItemSnapshot, IdleModeSnapshot, IdleSnapshot, KittyDevCharacterSnapshot, KittyDevSnapshot } from "@/lib/idleTypes";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import { playSoundEffect } from "@/lib/sound";
import { GoldSparkle } from "./KittyDevIcons";
import { CompleteCelebration, FX, FxImage, vibrate } from "./KittyCelebrations";
import { constellationShape, linkLevel, placeNode, placedNodes, starPolygon } from "./constellationShapes";
import { STONE_ICON, charactersOfWorld, spriteFor } from "./kittyDevHelpers";
import { useBackLayer } from "./useBackLayer";
import styles from "./KittyCst.module.css";

/** Frase curta de cada mundo (só a do mundo aberto aparece, sob o título). */
const TAGLINES = [
  "O poder do amor nos torna mais fortes ♡",
  "Cada estrela guarda um desejo ✦",
  "Brilhar junto é ainda mais bonito",
  "Sonhos que nunca se apagam",
  "Juntos formamos uma constelação",
  "A magia nasce da amizade",
  "Todas as estrelas, um só coração",
];

const TWINKLES = Array.from({ length: 12 }, (_, index) => ({ x: (index * 41 + 7) % 94 + 2, y: (index * 29 + 5) % 70 + 3, size: .5 + (index % 4) * .2, duration: 2.6 + (index % 5) * .7, delay: -(index * .9) }));
const SPARKS_BURST = Array.from({ length: 22 }, (_, index) => ({ angle: index * (360 / 22) + (index % 2 ? 7 : 0), radius: 46 + (index % 4) * 20, size: .5 + (index % 3) * .3, delay: (index % 5) * .025 }));
const SPARKS_CHARGE = Array.from({ length: 12 }, (_, index) => ({ angle: index * 30 + (index % 2 ? 10 : 0), radius: 70 + (index % 3) * 22, delay: (index % 4) * .06 }));

/** Fundo vivo: poucas luzinhas que só mudam de opacidade/escala, uma estrela cadente e névoa lenta (nada de blur nem filtros). */
const CstBackdrop = memo(function CstBackdrop() {
  return <>
    <span className={styles.cloudDrift} aria-hidden="true" />
    {TWINKLES.map((twinkle, index) => <GoldSparkle key={index} className={styles.twinkle} style={{ "--x": `${twinkle.x}%`, "--y": `${twinkle.y}%`, "--s": `${twinkle.size}rem`, "--d": `${twinkle.duration}s`, "--dl": `${twinkle.delay}s` } as CSSProperties} />)}
    <span className={styles.shooting} aria-hidden="true" />
    <span className={styles.shooting} style={{ "--top": "34%", "--dur": "13s", "--dl": "7s" } as CSSProperties} aria-hidden="true" />
    <span className={styles.shooting} style={{ "--top": "6%", "--dur": "9.5s", "--dl": "11s" } as CSSProperties} aria-hidden="true" />
  </>;
});

/** Linhas da constelação (SVG estático; só a linha recém-ligada anima, uma única vez). */
const ConstellationLines = memo(function ConstellationLines({ index, stars, mini = false, fresh }: { index: number; stars: number; mini?: boolean; fresh?: number }) {
  const shape = constellationShape(index);
  const nodes = shape.nodes.map(placeNode);
  return <>
    {shape.links.map(([first, second]) => {
      // a luz sempre corre da estrela mais antiga para a mais nova
      const [a, b] = first < second ? [first, second] : [second, first];
      const level = linkLevel([a, b]);
      const [x1, y1] = nodes[a - 1]; const [x2, y2] = nodes[b - 1];
      const lit = level <= stars;
      const isFresh = fresh === level;
      if (!lit) return <line key={`${a}-${b}`} className={`${styles.lineDim} ${mini ? styles.lineDimMini : ""}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
      return <g key={`${a}-${b}`}>
        <line className={`${styles.lineGlow} ${mini ? styles.lineGlowMini : ""} ${isFresh ? styles.lineGlowIn : ""}`} x1={x1} y1={y1} x2={x2} y2={y2} />
        <line className={`${styles.lineSolid} ${mini ? styles.lineMini : ""} ${isFresh ? styles.lineDraw : ""}`} pathLength={100} x1={x1} y1={y1} x2={x2} y2={y2} />
        {isFresh && !mini && <line className={styles.comet} pathLength={100} x1={x1} y1={y1} x2={x2} y2={y2} />}
      </g>;
    })}
  </>;
});

/** Estrelinhas desenhadas no SVG do álbum. */
const MiniStars = memo(function MiniStars({ index, stars }: { index: number; stars: number }) {
  return <>{placedNodes(index).map(([x, y], i) => <polygon key={i} className={i + 1 <= stars ? styles.miniStarOn : styles.miniStarOff} points={starPolygon(x, y, 8)} strokeLinejoin="round" />)}</>;
});

/** Efeito de carga e explosão quando uma estrela nova acende (posicionado no centro da estrela). */
function StarUnlockFx({ x, y }: { x: number; y: number }) {
  return <span className={styles.fx} style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true">
    {SPARKS_CHARGE.map((spark, index) => <GoldSparkle key={`c${index}`} className={styles.fxCharge} style={{ "--a": `${spark.angle}deg`, "--r": `${spark.radius}px`, "--d": `${spark.delay}s` } as CSSProperties} />)}
    <FxImage src={FX.glow} className={styles.fxFlash} />
    <FxImage src={FX.rays} className={styles.fxRays} size={512} />
    {[0, .14, .3].map((delay) => <FxImage key={delay} src={FX.ring} className={styles.fxShock} style={{ "--d": `${.5 + delay}s` } as CSSProperties} />)}
    {SPARKS_BURST.map((spark, index) => <GoldSparkle key={`b${index}`} className={styles.fxSpark} style={{ "--a": `${spark.angle}deg`, "--r": `${spark.radius * 2.2}px`, "--s": `${spark.size}rem`, "--d": `${spark.delay}s` } as CSSProperties} />)}
  </span>;
}

/** Estrelas da tela principal: HTML sobre o desenho (brilho, pulso e anéis animam só com transform/opacity). */
function LiveStars({ index, stars, nextLevel, purchased, shownLevel, fresh, onPick }: { index: number; stars: number; nextLevel: number | null; purchased: boolean; shownLevel: number; fresh?: number; onPick: (level: number) => void }) {
  return <>{placedNodes(index).map(([x, y], i) => {
    const level = i + 1;
    const on = level <= stars;
    const isFresh = on && fresh === level;
    const next = level === nextLevel && purchased;
    const selected = shownLevel === level;
    return <button key={level} type="button" className={`${styles.star} ${on ? styles.starOn : styles.starOff} ${selected ? styles.starSel : ""}`} style={{ left: `${x}%`, top: `${y}%`, "--i": i } as CSSProperties} aria-pressed={selected}
      aria-label={`Estrela ${level}: ${on ? "acesa" : next ? "próxima" : "apagada"}`} onClick={() => onPick(level)}>
      {on && <FxImage src={FX.glow} className={`${styles.starGlow} ${isFresh ? styles.starGlowFresh : ""}`} />}
      <span className={styles.starRing} aria-hidden="true" />
      {on && <span className={styles.orbit} aria-hidden="true"><GoldSparkle /><GoldSparkle /></span>}
      {(!on || isFresh) && <Image className={`${styles.crystal} ${isFresh ? styles.crystalCharge : ""}`} src={FX.crystalOff} alt="" width={256} height={266} unoptimized />}
      {on && <Image className={`${styles.crystal} ${isFresh ? styles.crystalFresh : styles.crystalOn}`} src={FX.crystal} alt="" width={256} height={266} unoptimized />}
      {next && <><i className={styles.nextRing} aria-hidden="true" /><i className={`${styles.nextRing} ${styles.nextRingB}`} aria-hidden="true" /></>}
      {selected && <i className={styles.selRing} aria-hidden="true" />}
    </button>;
  })}</>;
}

function Album({ items, kd, scenes, current, onClose, onPick }: { items: IdleItemSnapshot[]; kd: KittyDevSnapshot; scenes: IdleModeSnapshot["scenes"]; current: string; onClose: () => void; onPick: (id: string) => void }) {
  useBackLayer(onClose);
  const done = items.filter((item) => (kd.characters[item.definition.id]?.stars ?? 0) >= 5).length;
  let lastWorld = -1;
  return <div className={styles.album} role="dialog" aria-label="Todas as constelações">
    <div className={styles.albumTop}>
      <button type="button" className={styles.back} onClick={onClose} aria-label="Fechar álbum"><X size={22} strokeWidth={3.2} /></button>
      <div className={styles.plaque}><h2>Constelações</h2><p>Escolha um personagem</p></div>
      <span className={styles.albumCount}><Crown size={14} aria-hidden="true" />{done}/{items.length}</span>
    </div>
    <div className={styles.albumGrid}>
      {items.map((item) => {
        const info = kd.characters[item.definition.id];
        if (!info) return null;
        const complete = info.stars >= 5;
        const world = item.definition.scene;
        const heading = world !== lastWorld ? <p key={`w${world}`} className={styles.albumGroup}>{scenes.find((scene) => scene.id === world)?.name ?? `Ilha ${world + 1}`}</p> : null;
        lastWorld = world;
        return <ReactFragment key={item.definition.id}>
          {heading}
          <button type="button" className={`${styles.albumCard} ${complete ? styles.albumCardDone : ""} ${item.purchased ? "" : styles.albumCardLocked} ${item.definition.id === current ? styles.albumCardCurrent : ""}`} onClick={() => onPick(item.definition.id)} aria-label={`${item.definition.name}: ${info.stars} de 5 estrelas`}>
            <span className={styles.albumArt}>
              <span className={styles.albumChar}><Image src={spriteFor(item, kd).src} alt="" fill sizes="96px" /></span>
              <svg className={styles.albumSvg} viewBox="0 0 100 100" aria-hidden="true"><ConstellationLines index={info.index} stars={item.purchased ? info.stars : 0} mini /><MiniStars index={info.index} stars={item.purchased ? info.stars : 0} /></svg>
              {!item.purchased && <LockKeyhole className={styles.albumLock} size={20} aria-hidden="true" />}
              {complete && <Crown className={styles.albumCrown} size={16} aria-hidden="true" />}
            </span>
            <span className={styles.albumName}>{item.definition.name}</span>
          </button>
        </ReactFragment>;
      })}
    </div>
  </div>;
}

function ReactFragment({ children }: { children: ReactNode }) { return <>{children}</>; }

/** Tela de constelações: um desenho de 5 estrelas por personagem, evoluído com Pedras Estelares. O álbum leva a qualquer personagem de qualquer mundo. */
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
  const [fresh, setFresh] = useState<{ key: number; level: number; text: string } | null>(null);
  const [complete, setComplete] = useState<string | null>(null);
  const [album, setAlbum] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const item = data.items.find((entry) => entry.definition.id === selectedId) ?? data.items[0];
  const info = item ? kd.characters[item.definition.id] : undefined;
  // O mundo exibido é o do personagem escolhido (pelo álbum e pelas setas dá para ir a qualquer mundo).
  const currentWorld = item?.definition.scene ?? world;
  const roster = useMemo(() => charactersOfWorld(data.items, currentWorld), [data.items, currentWorld]);
  const currentWorldName = data.scenes.find((scene) => scene.id === currentWorld)?.name ?? worldName;
  const worldCount = data.scenes.length;

  const closeButton = <button type="button" className={styles.back} onClick={onClose} aria-label="Voltar para o mundo"><ArrowLeft size={24} strokeWidth={3.4} /></button>;
  const wrap = (children: ReactNode) => mounted ? createPortal(children, document.body) : null;

  if (!item || !info) return wrap(<div className={styles.cst}><div className={styles.top}>{closeButton}</div><p className={styles.empty}>Nenhum personagem neste mundo ainda.</p></div>);

  const shape = constellationShape(info.index);
  const nodes = placedNodes(info.index);
  const nextLevel = info.stars < 5 ? info.stars + 1 : null;
  const shownLevel = pickedLevel ?? nextLevel ?? 5;
  const requirement = nextLevel ? info.starRequirements[nextLevel - 1] : 0;
  const levelOk = item.level >= requirement;
  const enoughStones = info.nextStarCost !== null && kd.stones >= info.nextStarCost;
  const canBuy = Boolean(item.purchased && nextLevel && enoughStones && levelOk && !busy);
  const sprite = spriteFor(item, kd);
  const later = (callback: () => void, ms: number) => timers.current.push(window.setTimeout(callback, ms));
  const select = (id: string) => { setSelectedId(id); setPickedLevel(null); setError(null); setFresh(null); setInfoOpen(false); };
  const goWorld = (delta: number) => {
    const target = currentWorld + delta;
    if (target < 0 || target >= worldCount) return;
    const group = charactersOfWorld(data.items, target);
    const next = group.find((entry) => entry.purchased) ?? group[0];
    if (next) select(next.definition.id);
  };

  const buy = async () => {
    if (!canBuy || !nextLevel) return;
    setBusy(true); setError(null); setInfoOpen(false);
    try {
      const bonus = info.starBonuses[nextLevel - 1];
      onSnapshot(await kittyDevBuyConstellation(item.definition.id));
      const key = Date.now();
      setFresh({ key, level: nextLevel, text: bonus }); setPickedLevel(null);
      later(() => setFresh(null), 3_200);
      vibrate(nextLevel === 5 ? [30, 50, 30, 50, 90] : [20, 40, 40]);
      later(() => playSoundEffect(nextLevel === 5 ? "idleAwaken" : "idleStar"), 480);
      if (nextLevel === 5) later(() => setComplete(item.definition.id), 2_100);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível evoluir agora.");
    } finally { setBusy(false); }
  };

  const chip = !item.purchased ? "Desbloqueie o personagem" : info.starBonuses[shownLevel - 1];
  const chipDone = shownLevel <= info.stars;
  const [fx, fy] = fresh ? nodes[fresh.level - 1] : [0, 0];

  return wrap(<div className={`${styles.cst}`} role="dialog" aria-label={`Constelações de ${currentWorldName}`}>
    <CstBackdrop />
    {fresh && <span key={`dim${fresh.key}`} className={styles.dim} aria-hidden="true" />}
    {fresh && <span key={`flash${fresh.key}`} className={styles.fxScreen} aria-hidden="true" />}
    <div className={styles.top}>
      {closeButton}
      <div className={styles.plaque}>
        <GoldSparkle className={styles.plaqueGem} />
        <GoldSparkle className={`${styles.plaqueSpark} ${styles.plaqueSparkL}`} /><GoldSparkle className={`${styles.plaqueSpark} ${styles.plaqueSparkR}`} />
        <h2>{currentWorldName}</h2>
        <p>{TAGLINES[currentWorld % TAGLINES.length]}</p>
      </div>
      <div className={styles.stones} aria-label={`${kd.stones} Pedras Estelares`}><Image src={STONE_ICON} alt="" width={64} height={64} /><span>{formatIdleNumber(kd.stones)}</span></div>
    </div>
    <div className={styles.tabsRow}>
      <button type="button" className={styles.tabsArrow} onClick={() => goWorld(-1)} disabled={currentWorld <= 0} aria-label="Mundo anterior"><ChevronLeft size={26} strokeWidth={3} /></button>
      <div className={styles.tabs} role="tablist" aria-label="Personagens do mundo">
        {roster.map((entry) => {
          const entryInfo = kd.characters[entry.definition.id];
          if (!entryInfo) return null;
          const on = entry.definition.id === item.definition.id;
          return <button key={entry.definition.id} type="button" role="tab" aria-selected={on} aria-label={`${entry.definition.name}: ${entryInfo.stars} de 5 estrelas`}
            className={`${styles.tab} ${on ? styles.tabOn : ""} ${entry.purchased ? "" : styles.tabLocked} ${entryInfo.stars >= 5 ? styles.tabDone : ""}`} onClick={() => select(entry.definition.id)}>
            <span className={styles.tabArt}><Image src={spriteFor(entry, kd).src} alt="" fill sizes="64px" /></span>
            {!entry.purchased && <LockKeyhole className={styles.tabLock} size={18} aria-hidden="true" />}
            <span className={styles.tabDots} aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i key={index} data-on={index < entryInfo.stars ? "yes" : "no"} />)}</span>
          </button>;
        })}
      </div>
      <button type="button" className={styles.tabsArrow} onClick={() => goWorld(1)} disabled={currentWorld >= worldCount - 1} aria-label="Próximo mundo"><ChevronRight size={26} strokeWidth={3} /></button>
    </div>
    <div className={styles.stage}>
      <div key={item.definition.id} className={`${styles.arena} ${fresh ? styles.arenaHit : ""}`}>
        <FxImage src={FX.glow} className={styles.halo} />
        <span className={styles.ring} aria-hidden="true" />
        <span className={`${styles.ring} ${styles.ringB}`} aria-hidden="true" />
        <span className={`${styles.char} ${item.purchased ? "" : styles.charLocked} ${fresh ? styles.charHit : ""}`}><Image src={sprite.src} alt={item.definition.name} fill sizes="70vw" priority /></span>
        <svg className={styles.canvas} viewBox="0 0 100 100" aria-hidden="true"><ConstellationLines index={info.index} stars={info.stars} fresh={fresh?.level} /></svg>
        <div className={styles.stars} role="group" aria-label={`Constelação ${shape.name} de ${item.definition.name}`}>
          <LiveStars index={info.index} stars={info.stars} nextLevel={nextLevel} purchased={item.purchased} shownLevel={shownLevel} fresh={fresh?.level} onPick={setPickedLevel} />
        </div>
        {fresh && <StarUnlockFx key={`fx${fresh.key}`} x={fx} y={fy} />}
        {fresh && <span key={`bonus${fresh.key}`} className={styles.bonus} style={{ left: `${Math.min(76, Math.max(24, fx))}%`, top: `${fy}%` }} aria-hidden="true"><Sparkles size={13} />{fresh.text}</span>}
      </div>
    </div>
    <div className={styles.bottom}>
      <div className={styles.panel}>
        <span className={`${styles.panelIcon} ${chipDone ? styles.panelIconDone : ""}`}>{chipDone ? <Check size={18} strokeWidth={3.6} aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}</span>
        <p className={styles.panelText}>{chip}</p>
        <button type="button" className={styles.panelInfo} onClick={() => setInfoOpen((open) => !open)} aria-expanded={infoOpen} aria-label="Ver bônus de todas as estrelas"><Info size={17} strokeWidth={2.8} /></button>
        {infoOpen && <div className={styles.infoPop} role="status">
          {info.starBonuses.map((bonus, index) => <p key={index} className={styles.infoRow} data-on={index < info.stars ? "yes" : "no"}><b>{index < info.stars ? <Check size={11} strokeWidth={4} aria-hidden="true" /> : index + 1}</b><span>{bonus}</span></p>)}
        </div>}
      </div>
      {nextLevel
        ? <button type="button" className={`${styles.buy} ${canBuy ? styles.buyReady : ""}`} disabled={!canBuy} onClick={() => void buy()}>
            {!item.purchased ? <><LockKeyhole size={18} aria-hidden="true" /><span>Bloqueado</span></>
              : !levelOk ? <><LockKeyhole size={18} aria-hidden="true" /><span>Requer nível {requirement}</span></>
              : <><span>Evoluir</span><Image src={STONE_ICON} alt="" width={64} height={64} /><span>{info.nextStarCost}</span></>}
          </button>
        : <p className={styles.done}><Crown size={20} aria-hidden="true" />Completa!</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button type="button" className={styles.all} onClick={() => { setInfoOpen(false); setAlbum(true); }} aria-label="Ver todas as constelações"><LayoutGrid size={16} aria-hidden="true" /><span>Ver todas</span></button>
    </div>
    {album && <Album items={data.items} kd={kd} scenes={data.scenes} current={item.definition.id} onClose={() => setAlbum(false)} onPick={(id) => { if (data.items.some((entry) => entry.definition.id === id)) { select(id); setAlbum(false); } }} />}
    {complete && <CompleteCelebration item={data.items.find((entry) => entry.definition.id === complete) ?? item} info={kd.characters[complete] ?? info} kd={kd} onClose={() => setComplete(null)} />}
  </div>);
}
