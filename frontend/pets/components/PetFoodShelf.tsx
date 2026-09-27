"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { PET_FOODS, type PetFood } from "../food";
import { isPetDropPoint } from "./PetInteraction";
import styles from "../PetRoom.module.css";

export default function PetFoodShelf({ onFeed, onHover, ready }: {
  onFeed: (food: PetFood) => Promise<boolean>;
  onHover: (value: boolean) => void;
  ready: boolean;
}) {
  const [dragging, setDragging] = useState<PetFood | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const active = useRef<{ food: PetFood; id: number; x: number; y: number; hover: boolean } | null>(null);
  const feed = useRef(onFeed);
  const hover = useRef(onHover);
  useEffect(() => { feed.current = onFeed; hover.current = onHover; }, [onFeed, onHover]);

  useEffect(() => {
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
      if (event.type === "pointercancel" || !isPetDropPoint(document.querySelector('[data-pet-drop-target]'), current.x, current.y)) {
        setDragging(null); return;
      }
      void feed.current(current.food).then((success) => {
        const target = document.querySelector('[data-pet-drop-target]')?.getBoundingClientRect();
        if (success && target && ghost.current) {
          const dx = target.left + target.width / 2 - current.x;
          const dy = target.top + target.height * .62 - current.y;
          ghost.current.animate([
            { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.22)`, opacity: .4 },
          ], { duration: 330, easing: "cubic-bezier(.25,.7,.3,1)" });
          window.setTimeout(() => setDragging(null), 340);
        } else setDragging(null);
      }).catch(() => setDragging(null));
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
    if (!ready || active.current || dragging) return;
    event.preventDefault();
    active.current = { food, id: event.pointerId, x: event.clientX, y: event.clientY, hover: false };
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
    {dragging && createPortal(<div ref={ghost} className={styles.foodGhost} style={{ left: active.current?.x ?? 0, top: active.current?.y ?? 0 }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/pets/food/${dragging.id}.webp`} alt="" draggable={false} />
    </div>, document.body)}
  </>;
}
