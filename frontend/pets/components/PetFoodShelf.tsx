"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { PET_FOODS, type PetFood } from "../food";
import { isPetDropPoint } from "./PetInteraction";
import styles from "../PetRoom.module.css";

type Position = { x: number; y: number };
type Burst = { food: PetFood; center: Position; id: number };
const PARTICLES = [
  [-34, -32, -23], [29, -41, 19], [-42, 5, 34], [39, 8, -32],
  [-19, -52, 14], [13, -22, -23], [5, 25, 26],
] as const;

export default function PetFoodShelf({ onFeed, onHover, onArrive = () => {}, ready }: {
  onFeed: (food: PetFood) => Promise<boolean>;
  onHover: (value: boolean) => void;
  onArrive?: () => void;
  ready: boolean;
}) {
  const [dragging, setDragging] = useState<PetFood | null>(null);
  const [origin, setOrigin] = useState<Position | null>(null);
  const [burst, setBurst] = useState<Burst | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const active = useRef<{ food: PetFood; id: number; x: number; y: number; hover: boolean } | null>(null);
  const occupied = useRef(false);
  const mounted = useRef(true);
  const timers = useRef<Set<number>>(new Set());
  const nextBurst = useRef(0);
  const feed = useRef(onFeed);
  const hover = useRef(onHover);
  const arrive = useRef(onArrive);
  useEffect(() => { feed.current = onFeed; hover.current = onHover; arrive.current = onArrive; }, [onFeed, onHover, onArrive]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; timers.current.forEach(window.clearTimeout); timers.current.clear(); }; }, []);
  const later = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => { timers.current.delete(timer); callback(); }, delay);
    timers.current.add(timer);
  };

  useEffect(() => {
    const cancel = () => {
      ghost.current?.animate?.([
        { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
        { transform: "translate(-50%,-50%) scale(.8)", opacity: 0 },
      ], { duration: 120, easing: "ease-out", fill: "forwards" });
      later(() => { setDragging(null); occupied.current = false; }, 120);
    };
    const move = (event: globalThis.PointerEvent) => {
      const current = active.current;
      if (!current || current.id !== event.pointerId) return;
      event.preventDefault();
      current.x = event.clientX; current.y = event.clientY;
      if (ghost.current) { ghost.current.style.left = `${current.x}px`; ghost.current.style.top = `${current.y}px`; }
      const valid = isPetDropPoint(document.querySelector('[data-pet-drop-target]'), current.x, current.y);
      if (current.hover !== valid) { current.hover = valid; hover.current(valid); }
    };
    const finish = (event: globalThis.PointerEvent) => {
      const current = active.current;
      if (!current || current.id !== event.pointerId) return;
      active.current = null;
      hover.current(false);
      // Keep the released coordinates independently of the pointer ref. The old
      // ghost read active.current?.x ?? 0 on this render, causing the (0,0) flash.
      const release = { x: event.clientX, y: event.clientY };
      if (ghost.current) { ghost.current.style.left = `${release.x}px`; ghost.current.style.top = `${release.y}px`; }
      setOrigin(release);
      const target = document.querySelector('[data-pet-drop-target]');
      if (event.type === "pointercancel" || !isPetDropPoint(target, release.x, release.y)) {
        cancel(); return;
      }
      void feed.current(current.food).then((success) => {
        if (!mounted.current) return;
        if (!success) { cancel(); return; }
        const bounds = target?.getBoundingClientRect();
        if (!bounds) { cancel(); return; }
        const mouth = { x: bounds.left + bounds.width * .52, y: bounds.top + bounds.height * .39 };
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const duration = reduced ? 80 : 310;
        ghost.current?.animate?.([
          { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
          { transform: `translate(calc(-50% + ${mouth.x - release.x}px),calc(-50% + ${mouth.y - release.y}px)) scale(.18)`, opacity: .2 },
        ], { duration, easing: "cubic-bezier(.25,.8,.25,1)", fill: "forwards" });
        later(() => {
          const burstId = ++nextBurst.current;
          setDragging(null);
          setBurst({ food: current.food, center: mouth, id: burstId });
          arrive.current();
          occupied.current = false;
          later(() => setBurst((old) => old?.id === burstId ? null : old), 680);
        }, duration);
      }).catch(() => { if (mounted.current) cancel(); });
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      hover.current(false);
    };
  }, []);

  const begin = (event: PointerEvent<HTMLButtonElement>, food: PetFood) => {
    if (!ready || occupied.current) return;
    event.preventDefault();
    occupied.current = true;
    active.current = { food, id: event.pointerId, x: event.clientX, y: event.clientY, hover: false };
    setOrigin({ x: event.clientX, y: event.clientY });
    setDragging(food);
  };

  return <>
    <div className={styles.foodGrid}>
      {PET_FOODS.map((food) => <button type="button" key={food.id} disabled={!ready}
        className={styles.foodItem} onPointerDown={(event) => begin(event, food)}
        aria-label={`${food.name}, ${food.price} moedas, recupera ${food.satiety} de saciedade. Arraste até o pet.`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/pets/food/${food.id}.webp`} alt="" draggable={false} />
        <strong>{food.name}</strong>
        <span className={styles.foodDetails}><span>+{food.satiety}</span><span>✦ {food.price}</span></span>
      </button>)}
    </div>
    {dragging && origin && createPortal(<div ref={ghost} className={styles.foodGhost} style={{ left: origin.x, top: origin.y }} aria-hidden="true" data-food-ghost={dragging.id}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/pets/food/${dragging.id}.webp`} alt="" draggable={false} />
    </div>, document.body)}
    {burst && createPortal(<span className={styles.foodBurst} aria-hidden="true" data-food-burst={burst.food.id}>
      {PARTICLES.map(([dx, dy, rotation], index) => <img key={`${burst.id}-${index}`} src={`/pets/food/${burst.food.id}.webp`} alt="" className={styles.foodFragment} style={{ left: burst.center.x, top: burst.center.y, "--fragment-x": `${dx}px`, "--fragment-y": `${dy}px`, "--fragment-rotation": `${rotation}deg`, animationDelay: `${index * 15}ms` } as CSSProperties} />)}
    </span>, document.body)}
  </>;
}

