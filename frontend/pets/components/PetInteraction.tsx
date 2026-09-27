"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { PetAnimation, PetDefinition, PetMood } from "../config";
import PetSprite from "./PetSprite";
import styles from "../pets.module.css";

type Heart = { id: number; dx: number; drift: number; delay: number };
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
  const gesture = useRef<{ pointerId: number; x: number; y: number; distance: number; lastStroke: number } | null>(null);
  const nextHeart = useRef(0);
  const reactionEnd = useRef<number | null>(null);
  const timers = useRef<Set<number>>(new Set());
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [petting, setPetting] = useState(false);
  const [reactionTick, setReactionTick] = useState(0);
  useEffect(() => () => { timers.current.forEach(window.clearTimeout); timers.current.clear(); if (reactionEnd.current) window.clearTimeout(reactionEnd.current); }, []);

  const later = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => { timers.current.delete(timer); callback(); }, delay);
    timers.current.add(timer);
  };
  const onPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (action === "eating" || !ref.current || !pointInside(ref.current.getBoundingClientRect(), event.clientX, event.clientY)) return;
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, distance: 0, lastStroke: -Infinity };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId || !ref.current) return;
    const inside = pointInside(ref.current.getBoundingClientRect(), event.clientX, event.clientY);
    const length = Math.hypot(event.clientX - current.x, event.clientY - current.y);
    current.distance = inside ? current.distance + Math.min(length, 36) : 0;
    current.x = event.clientX;
    current.y = event.clientY;
    if (current.distance < 30 || performance.now() - current.lastStroke < 500) return;
    current.distance = 0;
    current.lastStroke = performance.now();
    void onStroke().then((accepted) => {
      if (!accepted) return;
      setPetting(true);
      setReactionTick((count) => count + 1);
      const id = ++nextHeart.current;
      setHearts((old) => [...old.slice(-5), { id, dx: (Math.random() - .5) * 32, drift: (Math.random() - .5) * 25, delay: Math.random() * 100 }]);
      later(() => setHearts((old) => old.filter((heart) => heart.id !== id)), 1150);
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
      {hearts.map((heart) => <span className={styles.floatingHeart} key={heart.id} style={{ "--heart-x": `${heart.dx}px`, "--heart-drift": `${heart.drift}px`, animationDelay: `${heart.delay}ms` } as CSSProperties}>♥</span>)}
    </span>
  </span>;
}
