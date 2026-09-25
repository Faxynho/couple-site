"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { PetDefinition } from "../config";
import styles from "../pets.module.css";

type RigPet = Extract<PetDefinition, { renderer: "rig" }>;
type BlinkArtwork = NonNullable<RigPet["rig"]["blink"]>;
type BlinkState = "open" | "half" | "closed";

function between(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function nextInterval() {
  const chance = Math.random();
  if (chance < 0.1) return between(1900, 2500);
  if (chance > 0.9) return between(7000, 9000);
  return between(2500, 7000);
}

export default function MaxBlink({ artwork, canvasSize }: { artwork: BlinkArtwork; canvasSize: number }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const halfRef = useRef<HTMLSpanElement>(null);
  const closedRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const half = halfRef.current;
    const closed = closedRef.current;
    if (!root || !half || !closed) return;

    let active = true;
    const timers = new Set<number>();
    const later = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (active && !document.hidden) callback();
      }, delay);
      timers.add(timer);
    };
    const show = (state: BlinkState) => {
      root.dataset.blinkState = state;
      half.style.visibility = state === "half" ? "visible" : "hidden";
      closed.style.visibility = state === "closed" ? "visible" : "hidden";
    };
    const blink = (done: () => void) => {
      const duration = between(160, 205);
      show("half");
      later(() => show("closed"), duration * 0.28);
      later(() => show("half"), duration * 0.62);
      later(() => {
        show("open");
        done();
      }, duration);
    };
    const schedule = () => {
      later(() => {
        blink(() => {
          if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && Math.random() < 0.15) {
            later(() => blink(schedule), between(120, 280));
          } else {
            schedule();
          }
        });
      }, nextInterval());
    };
    const onVisibilityChange = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      show("open");
      if (!document.hidden) schedule();
    };

    if (!document.hidden) schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      show("open");
    };
  }, []);

  const position: CSSProperties = {
    left: `${artwork.x / canvasSize * 100}%`,
    top: `${artwork.y / canvasSize * 100}%`,
    width: `${artwork.width / canvasSize * 100}%`,
    height: `${artwork.height / canvasSize * 100}%`,
  };

  return (
    <span ref={rootRef} className={styles.blinkRegion} style={position} data-blink-state="open" aria-hidden="true">
      <span ref={halfRef} className={styles.blinkLayer} style={{ backgroundImage: `url("${artwork.half}")` }} />
      <span ref={closedRef} className={styles.blinkLayer} style={{ backgroundImage: `url("${artwork.closed}")` }} />
    </span>
  );
}
