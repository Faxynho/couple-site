"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { PetAnimation, PetDefinition, PetMood } from "../config";
import PetSprite from "./PetSprite";
import styles from "../pets.module.css";

type Heart = { id: number; x: number; y: number; drift: number; rise: number; size: number; rotation: number; delay: number };
// Around the silhouette, including the sides and lower body. Never from one head anchor.
const HEART_ORIGINS = [[24, 42], [75, 47], [36, 27], [66, 31], [25, 70], [72, 72]] as const;
const pointInside = (rect: DOMRect, x: number, y: number) => {
  const nx = (x - rect.left) / rect.width;
  const ny = (y - rect.top) / rect.height;
  return ((nx - .5) / .37) ** 2 + ((ny - .52) / .46) ** 2 <= 1;
};
export function isPetDropPoint(element: Element | null, x: number, y: number) {
  return Boolean(element && pointInside(element.getBoundingClientRect(), x, y));
}

export default function PetInteraction({ pet, className = "", mood = "happy", action = "idle", onStroke, dropActive = false }: {
  pet: PetDefinition;
  className?: string;
  mood?: PetMood;
  action?: PetAnimation;
  onStroke: () => Promise<boolean>;
  dropActive?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const actionRef = useRef(action);
  actionRef.current = action;
  const gesture = useRef<{ pointerId: number; x: number; y: number; rect: DOMRect; distance: number; lastStroke: number } | null>(null);
  const nextHeart = useRef(0);
  const reactionEnd = useRef<number | null>(null);
  const timers = useRef<Set<number>>(new Set());
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [petting, setPetting] = useState(false);
  const [reactionTick, setReactionTick] = useState(0);
  useEffect(() => () => { timers.current.forEach(window.clearTimeout); timers.current.clear(); if (reactionEnd.current) window.clearTimeout(reactionEnd.current); }, []);
  useEffect(() => {
    if (action !== "eating") return;
    gesture.current = null;
    if (reactionEnd.current) window.clearTimeout(reactionEnd.current);
    setPetting(false);
  }, [action]);

  const later = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => { timers.current.delete(timer); callback(); }, delay);
    timers.current.add(timer);
  };
  const onPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (action === "eating" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (!pointInside(rect, event.clientX, event.clientY)) return;
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, rect, distance: 0, lastStroke: -Infinity };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId || !ref.current || actionRef.current === "eating") return;
    const inside = pointInside(current.rect, event.clientX, event.clientY);
    const length = Math.hypot(event.clientX - current.x, event.clientY - current.y);
    current.distance = inside ? current.distance + Math.min(length, 36) : 0;
    current.x = event.clientX;
    current.y = event.clientY;
    if (current.distance < 30 || performance.now() - current.lastStroke < 500) return;
    current.distance = 0;
    current.lastStroke = performance.now();
    void onStroke().then((accepted) => {
      if (!accepted || actionRef.current === "eating") return;
      setPetting(true);
      setReactionTick((count) => count + 1);
      const burst = HEART_ORIGINS.map(([x, y], index) => ({
        id: ++nextHeart.current, x: x + (Math.random() - .5) * 8, y: y + (Math.random() - .5) * 8,
        drift: (Math.random() - .5) * 34, rise: 29 + Math.random() * 29,
        size: 12 + Math.random() * 9, rotation: (Math.random() - .5) * 32, delay: index * 34,
      }));
      setHearts((old) => [...old.slice(-18), ...burst]);
      const ids = new Set(burst.map((heart) => heart.id));
      later(() => setHearts((old) => old.filter((heart) => !ids.has(heart.id))), 1150);
      if (reactionEnd.current) window.clearTimeout(reactionEnd.current);
      reactionEnd.current = window.setTimeout(() => setPetting(false), 730);
    });
  };
  const endGesture = () => { gesture.current = null; };

  return <span ref={ref} className={`${styles.petInteraction} ${className}`} data-pet={pet.id} data-animation={action === "idle" && petting ? "petting" : action}
    data-pet-drop-target="" data-drop-active={dropActive || undefined}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endGesture} onPointerCancel={endGesture}>
    <PetSprite pet={pet} mood={mood} animation={action !== "idle" ? action : petting ? "petting" : "idle"} reactionTick={reactionTick} className={styles.interactionSprite} />
    <span className={styles.petHearts} aria-hidden="true">
      {hearts.map((heart) => <span className={styles.floatingHeart} key={heart.id} style={{ left: `${heart.x}%`, top: `${heart.y}%`, fontSize: `${heart.size}px`, "--heart-drift": `${heart.drift}px`, "--heart-rise": `${heart.rise}px`, "--heart-rotation": `${heart.rotation}deg`, animationDelay: `${heart.delay}ms` } as CSSProperties}>♥</span>)}
    </span>
  </span>;
}

