"use client";

import Image from "next/image";
import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Crown, Sparkles } from "lucide-react";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import { playSoundEffect } from "@/lib/sound";
import { IdleItemSnapshot, KittyDevCharacterSnapshot, KittyDevSnapshot } from "@/lib/idleTypes";
import { GoldSparkle } from "./KittyDevIcons";
import { constellationShape, linkLevel, placeNode } from "./constellationShapes";
import { spriteFor } from "./kittyDevHelpers";
import { useAwakeFit } from "./useAwakeFit";
import { useBackLayer } from "./useBackLayer";
import styles from "./KittyCst.module.css";

export const FX = {
  rays: "/idle/dev/cst/cst-rays.webp",
  glow: "/idle/dev/cst/cst-glow.webp",
  ring: "/idle/dev/cst/cst-ring.webp",
  flare: "/idle/dev/cst/cst-flare.webp",
  crystal: "/idle/dev/cst/cst-crystal.webp",
  crystalOff: "/idle/dev/cst/cst-crystal-off.webp",
};

/** Imagem de efeito (textura pequena movida por CSS): barata para o celular. */
export function FxImage({ src, className = "", style, size = 256 }: { src: string; className?: string; style?: CSSProperties; size?: number }) {
  return <Image className={`${styles.fxImg} ${className}`} src={src} alt="" aria-hidden="true" width={size} height={size} unoptimized style={style} />;
}

export function vibrate(pattern: number | number[]) {
  try { if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern); } catch { /* sem vibração */ }
}

function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

const FIREWORKS = [[18, 24], [82, 20], [50, 10], [14, 62], [86, 58]] as const;
const CONFETTI = Array.from({ length: 14 }, (_, index) => ({ x: (index * 37 + 8) % 100, delay: (index % 11) * .24 + 2.4, duration: 2.8 + (index % 5) * .35, size: .5 + (index % 4) * .18 }));

function Fireworks({ start }: { start: number }) {
  return <>
    <span className={styles.fireworks} aria-hidden="true">{FIREWORKS.map(([x, y], index) => <span key={index} className={styles.firework} data-hue={index % 3} style={{ left: `${x}%`, top: `${y}%`, "--delay": `${start + .3 + index * .4}s` } as CSSProperties}>
      {Array.from({ length: 8 }, (_, spark) => <GoldSparkle key={spark} style={{ "--a": `${spark * 45}deg` } as CSSProperties} />)}
    </span>)}</span>
    <span className={styles.confetti} aria-hidden="true">{CONFETTI.map((piece, index) => <GoldSparkle key={index} style={{ left: `${piece.x}%`, "--delay": `${piece.delay + start - 2.4}s`, "--dur": `${piece.duration}s`, "--s": `${piece.size}rem` } as CSSProperties} />)}</span>
  </>;
}

/** Fecha ao tocar, mas só depois de um tempo (para um toque do jogo não pular a animação) e sozinho no fim. */
function useDismiss(onClose: () => void, guardMs: number, autoMs: number) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const armed = useRef(false);
  useEffect(() => {
    const arm = window.setTimeout(() => { armed.current = true; }, guardMs);
    const auto = window.setTimeout(() => closeRef.current(), autoMs);
    return () => { window.clearTimeout(arm); window.clearTimeout(auto); };
  }, [guardMs, autoMs]);
  return () => { if (armed.current) closeRef.current(); };
}

/** Celebração única de constelação completa: as 5 estrelas acendem em sequência, o personagem aparece e o título chega letra por letra. */
export function CompleteCelebration({ item, info, kd, onClose }: { item: IdleItemSnapshot; info: KittyDevCharacterSnapshot; kd: KittyDevSnapshot; onClose: () => void }) {
  useBackLayer(onClose);
  const dismiss = useDismiss(onClose, 2_600, 12_000);
  useEffect(() => { vibrate([20, 40, 20, 40, 80]); }, []);
  const shape = constellationShape(info.index);
  const nodes = shape.nodes.map(placeNode);
  return <div className={styles.complete} role="dialog" aria-label={`Constelação de ${item.definition.name} completa`} onClick={dismiss}>
    <span className={styles.completeShade} aria-hidden="true" />
    <FxImage src={FX.rays} className={styles.cmpRays} size={512} />
    <FxImage src={FX.rays} className={`${styles.cmpRays} ${styles.cmpRaysB}`} size={512} />
    <Fireworks start={2.4} />
    <div className={styles.cmpBody}>
      <div className={styles.cmpArt}>
        <FxImage src={FX.glow} className={styles.cmpGlow} />
        <span className={styles.cmpChar}><Image src={spriteFor(item, kd).src} alt="" fill sizes="80vw" /></span>
        <svg className={styles.cmpSvg} viewBox="0 0 100 100" aria-hidden="true">
          {shape.links.map(([first, second], index) => {
            const [a, b] = first < second ? [first, second] : [second, first];
            const [x1, y1] = nodes[a - 1]; const [x2, y2] = nodes[b - 1];
            const delay = { "--i": linkLevel([a, b]) - 1 } as CSSProperties;
            return <g key={index}>
              <line className={styles.lineGlow} x1={x1} y1={y1} x2={x2} y2={y2} opacity=".7" />
              <line className={`${styles.lineSolid} ${styles.cmpLine}`} pathLength={100} x1={x1} y1={y1} x2={x2} y2={y2} style={delay} />
            </g>;
          })}
        </svg>
        <div className={styles.cmpStars} aria-hidden="true">{nodes.map(([x, y], index) => <span key={index} className={styles.cmpStar} style={{ left: `${x}%`, top: `${y}%`, "--i": index } as CSSProperties}>
          <FxImage src={FX.glow} className={styles.cmpStarGlow} />
          <Image src={FX.crystal} alt="" width={256} height={266} unoptimized />
        </span>)}</div>
        <FxImage src={FX.ring} className={styles.cmpRing} style={{ "--d": "2.2s" } as CSSProperties} />
        <FxImage src={FX.ring} className={styles.cmpRing} style={{ "--d": "2.5s" } as CSSProperties} />
      </div>
      <Crown className={styles.cmpCrown} size={38} strokeWidth={2.4} fill="currentColor" aria-hidden="true" />
      <p className={styles.cmpSub}>Constelação</p>
      <p className={styles.cmpTitle} aria-label="Completa!">{Array.from("COMPLETA!").map((letter, index) => <span key={index} aria-hidden="true" style={{ "--i": index } as CSSProperties}>{letter}</span>)}</p>
      <p className={styles.cmpName}>{item.definition.name}</p>
      {info.awakening && !info.awakening.awakened && <p className={styles.cmpHint}><Sparkles size={14} aria-hidden="true" /> Despertar liberado</p>}
      <p className={styles.cmpTap}>Toque para continuar</p>
    </div>
  </div>;
}

function CountUp({ value, delayMs, durationMs }: { value: number; delayMs: number; durationMs: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame = 0;
    const startTimer = window.setTimeout(() => {
      const begin = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - begin) / durationMs);
        setShown(value * (1 - Math.pow(1 - t, 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delayMs);
    return () => { window.clearTimeout(startTimer); cancelAnimationFrame(frame); };
  }, [value, delayMs, durationMs]);
  return <>{formatIdleNumber(shown)}</>;
}

const CHARGE = Array.from({ length: 14 }, (_, index) => ({ angle: index * (360 / 14) + (index % 2 ? 9 : 0), radius: 130 + (index % 4) * 28, delay: (index % 7) * .1 }));
const BURST = Array.from({ length: 24 }, (_, index) => ({ angle: index * 15, radius: 110 + (index % 4) * 38, size: .55 + (index % 3) * .3, delay: (index % 6) * .02 }));
const AW_SPARKS: Array<[number, number, number, number, number]> = [[6, 20, .9, 2.4, 0], [92, 14, .75, 2.8, -.8], [10, 64, .7, 3, -1.4], [94, 60, 1, 2.2, -.4], [50, 0, .8, 2.6, -1.9], [28, 96, .65, 3.1, -.9], [76, 94, .8, 2.5, -1.6], [2, 42, .6, 2.7, -.6], [98, 38, .65, 2.9, -1.2]];

/** Cinemática de despertar: carga de energia, clarão, a skin troca e o personagem desperto surge com título e bônus. */
export function AwakenCinematic({ name, normalSrc, awakeSrc, bonus, onClose }: { name: string; normalSrc: string; awakeSrc: string; bonus: number; onClose: () => void }) {
  useBackLayer(onClose);
  const dismiss = useDismiss(onClose, 3_600, 16_000);
  const fit = useAwakeFit(normalSrc, awakeSrc);
  useEffect(() => {
    playSoundEffect("idleStar");
    vibrate([40, 60, 40, 60, 40]);
    const reveal = window.setTimeout(() => { playSoundEffect("idleAwaken"); vibrate([120, 40, 200]); }, 2_250);
    return () => window.clearTimeout(reveal);
  }, []);
  const awakeStyle = { "--aw-fit": fit?.transform ?? "none" } as CSSProperties;
  return <Portal><div className={styles.awaken} role="dialog" aria-label={`${name} despertou`} onClick={dismiss}>
    <span className={styles.awShade} aria-hidden="true" />
    <span className={`${styles.awShade} ${styles.awShadeGold}`} aria-hidden="true" />
    <FxImage src={FX.rays} className={styles.awRays} size={512} />
    <FxImage src={FX.rays} className={`${styles.awRays} ${styles.awRaysB}`} size={512} />
    <div className={styles.awBody}>
      <div className={styles.awStage}>
        <FxImage src={FX.glow} className={styles.awGlow} />
        <span className={styles.awCharge} aria-hidden="true">
          {[0, .3, .6].map((delay) => <FxImage key={delay} src={FX.ring} className={styles.awChargeRing} style={{ "--d": `${delay}s` } as CSSProperties} />)}
          <span className={styles.fx} style={{ left: "50%", top: "50%" }}>{CHARGE.map((spark, index) => <GoldSparkle key={index} className={styles.fxCharge} style={{ "--a": `${spark.angle}deg`, "--r": `${spark.radius}px`, "--d": `${spark.delay}s` } as CSSProperties} />)}</span>
        </span>
        <span className={`${styles.awSprite} ${styles.awNormal}`}><Image src={normalSrc} alt="" fill sizes="80vw" priority /></span>
        <span className={`${styles.awSprite} ${styles.awAwake}`} style={awakeStyle}>
          <span className={styles.awAura} aria-hidden="true" />
          <Image src={awakeSrc} alt={name} fill sizes="80vw" priority />
        </span>
        <span className={styles.awSparkles} aria-hidden="true">{AW_SPARKS.map(([x, y, size, duration, delay], index) => <GoldSparkle key={index} style={{ "--x": `${x}%`, "--y": `${y}%`, "--s": `${size}rem`, "--d": `${duration}s`, "--dl": `${delay}s` } as CSSProperties} />)}</span>
        <span className={`${styles.fx} ${styles.awFx}`} style={{ left: "50%", top: "50%" }} aria-hidden="true">
          {[0, .18, .36].map((delay) => <FxImage key={delay} src={FX.ring} className={styles.fxShock} style={{ "--d": `${delay}s` } as CSSProperties} />)}
          {BURST.map((spark, index) => <GoldSparkle key={index} className={styles.fxSpark} style={{ "--a": `${spark.angle}deg`, "--r": `${spark.radius}px`, "--s": `${spark.size}rem`, "--d": `${spark.delay}s` } as CSSProperties} />)}
        </span>
      </div>
      <div className={styles.awTitleWrap}>
        <p className={styles.awTitle} aria-label="Despertou!">{Array.from("DESPERTOU!").map((letter, index) => <span key={index} aria-hidden="true" style={{ "--i": index } as CSSProperties}>{letter}</span>)}</p>
        <FxImage src={FX.flare} className={styles.awShine} size={512} />
      </div>
      <p className={styles.awName}>{name}</p>
      <p className={styles.awBonus}><Sparkles size={16} aria-hidden="true" />+<CountUp value={bonus} delayMs={3_800} durationMs={1_400} />/s de produção</p>
      <p className={styles.awTap}>Toque para continuar</p>
    </div>
    <span className={styles.awFlash} aria-hidden="true" />
  </div></Portal>;
}
