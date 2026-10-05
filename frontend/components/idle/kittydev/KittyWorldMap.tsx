"use client";

import Image from "next/image";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { playSoundEffect } from "@/lib/sound";
import { ISLAND_LAYOUT, islandSprite } from "./kittyDevHelpers";
import styles from "./KittyDev.module.css";

const RATIO = 1672 / 941; // altura / largura da imagem de fundo
const TRAVEL_MS = 950;

function Flower({ n }: { n: number }) {
  return <span className={styles.islandBadge} aria-hidden="true">
    <svg viewBox="0 0 40 40">
      {Array.from({ length: 5 }, (_, i) => { const a = (-90 + i * 72) * Math.PI / 180; return <circle key={i} cx={20 + Math.cos(a) * 10.5} cy={20 + Math.sin(a) * 10.5} r="8.4" fill="#fff5f9" stroke="#f2a6c6" strokeWidth="1.8" />; })}
      <circle cx="20" cy="20" r="10.5" fill="#fff5f9" />
    </svg>
    <b>{n}</b>
  </span>;
}

/** Tela de seleção de ilhas: 7 ilhas em zigue-zague; as bloqueadas ficam pretas com cadeado. */
export default function KittyWorldMap({ names, unlocked, current, lockedHint, onEnter }: {
  names: string[];
  unlocked: boolean[];
  /** Última ilha visitada (destacada e usada para rolar até ela). */
  current: number | null;
  lockedHint: (world: number) => string;
  onEnter: (world: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState<{ world: number; ox: number; oy: number; vx: number; vy: number } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const frontier = useMemo(() => unlocked.reduce((last, open, index) => open ? index : last, 0), [unlocked]);

  useEffect(() => {
    const box = scroller.current;
    const inner = stage.current;
    if (!box || !inner) return;
    const target = current ?? frontier;
    const y = inner.offsetTop + inner.offsetHeight * ISLAND_LAYOUT[target].y / 100 - box.clientHeight / 2;
    box.scrollTop = Math.max(0, y);
  }, [current, frontier]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const flash = (message: string) => {
    setHint(message);
    timers.current.push(window.setTimeout(() => setHint(null), 2_400));
  };

  const open = (world: number, element: HTMLElement) => {
    if (travel) return;
    if (!unlocked[world]) { flash(lockedHint(world)); return; }
    const rect = element.getBoundingClientRect();
    setTravel({ world, ox: ISLAND_LAYOUT[world].x, oy: ISLAND_LAYOUT[world].y, vx: (rect.left + rect.width / 2) / window.innerWidth * 100, vy: (rect.top + rect.height / 2) / window.innerHeight * 100 });
    playSoundEffect("idleTravel");
    timers.current.push(window.setTimeout(() => onEnter(world), TRAVEL_MS));
  };

  return <>
    <div ref={scroller} className={styles.map} role="region" aria-label="Seleção de ilhas">
      <div ref={stage} className={`${styles.mapStage} ${travel ? styles.travelZoom : ""}`} style={travel ? { "--ox": `${travel.ox}%`, "--oy": `${travel.oy}%` } as CSSProperties : undefined}>
        <svg className={styles.mapPaths} viewBox={`0 0 100 ${100 * RATIO}`} aria-hidden="true">
          {ISLAND_LAYOUT.slice(0, -1).map((from, index) => {
            const to = ISLAND_LAYOUT[index + 1];
            const x1 = from.x, y1 = from.y * RATIO + 4, x2 = to.x, y2 = to.y * RATIO - 2;
            const cx = (x1 + x2) / 2 + (index % 2 === 0 ? -5 : 5), cy = (y1 + y2) / 2 + 6;
            const locked = !unlocked[index + 1];
            const mx = .25 * x1 + .5 * cx + .25 * x2, my = .25 * y1 + .5 * cy + .25 * y2;
            return <g key={index}>
              <path className={`${styles.pathDots} ${locked ? styles.pathDotsLocked : ""}`} d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`} />
              <path d={`M${mx},${my + 1.3} C${mx - 2.6},${my - .6} ${mx - .8},${my - 2.6} ${mx},${my - 1} C${mx + .8},${my - 2.6} ${mx + 2.6},${my - .6} ${mx},${my + 1.3}Z`} fill={locked ? "#e6d4e0" : "#ff8fb8"} stroke="#fff" strokeWidth=".35" />
            </g>;
          })}
        </svg>
        {ISLAND_LAYOUT.map((layout, world) => {
          const open_ = unlocked[world];
          return <button key={world} type="button" data-world={world} data-locked={open_ ? "no" : "yes"}
            className={`${styles.island} ${open_ ? "" : styles.islandLocked} ${open_ && current === world ? styles.islandCurrent : ""}`}
            style={{ left: `${layout.x}%`, top: `${layout.y}%`, width: `${layout.w}%` }}
            aria-label={open_ ? `Ilha ${world + 1}: ${names[world]}` : `Ilha ${world + 1} bloqueada`}
            onClick={(event) => open(world, event.currentTarget)}>
            <span className={styles.islandFloat} style={{ "--dur": `${4.6 + (world % 3) * .7}s`, "--delay": `${-world * .8}s` } as CSSProperties}>
              <Image className={styles.islandImg} src={islandSprite(world)} alt="" fill sizes="(max-width: 600px) 45vw, 240px" priority={world < 3} />
              {!open_ && <span className={styles.islandLock}><LockKeyhole size={20} strokeWidth={2.8} aria-hidden="true" /></span>}
              <Flower n={world + 1} />
              {open_ && <span className={styles.islandName}>{names[world]}</span>}
            </span>
          </button>;
        })}
      </div>
    </div>
    {hint && <p className={styles.islandHint} role="status">{hint}</p>}
    {travel && <>
      <div className={styles.travelVeil} style={{ "--ox": `${travel.vx}%`, "--oy": `${travel.vy}%` } as CSSProperties} aria-hidden="true" />
      <div className={styles.travelClouds} aria-hidden="true">{[12, 30, 48, 66, 82].map((y, index) => <i key={y} style={{ "--y": y, "--d": `${index * .06}s` } as CSSProperties} />)}</div>
    </>}
  </>;
}
