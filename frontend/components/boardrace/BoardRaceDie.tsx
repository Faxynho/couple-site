"use client";

import { PointerEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DIE_FACE_ORIENTATION,
  DIE_MIN_DRAG_DISTANCE,
  DieBounds,
  DieMotion,
  DieOrientation,
  DiePoint,
  closestFinalOrientation,
  createLaunchMotion,
  deterministicThrow,
  interpolateSettlingOrientation,
  stepDieMotion,
  throwDurationMs,
  velocityFromRecentPoints,
} from "./boardRaceDiePhysics";
import styles from "./BoardRaceVisual.module.css";

const PIPS: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

const SETTLING_WINDOW_MS = 520;
const MIN_LATE_SETTLING_MS = 360;
const FINAL_FACE_HOLD_MS = 470;

type SettlingMotion = {
  startedAt: number;
  durationMs: number;
  from: DieOrientation;
  target: DieOrientation;
  spin: DieOrientation;
  result: number;
};

interface Props {
  value: number | null;
  total: number | null;
  serial: number;
  rolledBy: string | null;
  canRoll: boolean;
  onRoll: () => void;
}

function DieFace({ value, className }: { value: number; className: string }) {
  const activePips = PIPS[value];
  return (
    <span className={`${styles.cubeFace} ${className}`} aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => <span key={index} className={`${styles.pipSlot} ${activePips.includes(index) ? styles.pip : ""}`} />)}
    </span>
  );
}

function getBounds(layer: HTMLDivElement | null, die: HTMLButtonElement | null): DieBounds | null {
  if (!layer || !die) return null;
  const rect = layer.getBoundingClientRect();
  const size = die.offsetWidth || Math.min(rect.width, rect.height) * 0.13;
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || !Number.isFinite(size) || rect.width <= 0 || rect.height <= 0 || size <= 0) return null;
  return { width: rect.width, height: rect.height, size };
}

function isRenderableMotion(motion: DieMotion, bounds: DieBounds) {
  const values = [
    motion.x, motion.y, motion.vx, motion.vy, motion.height, motion.heightVelocity,
    motion.rx, motion.ry, motion.rz, motion.spinX, motion.spinY, motion.spinZ,
    bounds.width, bounds.height, bounds.size,
  ];
  if (!values.every(Number.isFinite)) return false;
  if (bounds.width <= 0 || bounds.height <= 0 || bounds.size <= 0) return false;
  if (motion.x < -bounds.size * 2 || motion.x > bounds.width + bounds.size) return false;
  if (motion.y < -bounds.size * 2 || motion.y > bounds.height + bounds.size) return false;
  return Math.abs(motion.rx) < 100_000 && Math.abs(motion.ry) < 100_000 && Math.abs(motion.rz) < 100_000;
}

export default function BoardRaceDie({ value, total, serial, rolledBy, canRoll, onRoll }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const dieRef = useRef<HTMLButtonElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const motionRef = useRef<DieMotion | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<DiePoint | null>(null);
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const pointsRef = useRef<DiePoint[]>([]);
  const draggingRef = useRef(false);
  const animatingRef = useRef(false);
  const releaseRef = useRef(false);
  const lastSerialRef = useRef(serial);
  const latestValueRef = useRef(value);
  const resultForThrowRef = useRef<number | null>(null);
  const latestCanRollRef = useRef(canRoll);
  const previousCanRollRef = useRef(false);
  const settleTimerRef = useRef<number | null>(null);
  const rollTimeoutRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(canRoll);
  const [dragging, setDragging] = useState(false);
  const [throwing, setThrowing] = useState(false);
  const [settledValue, setSettledValue] = useState<number | null>(value);
  latestValueRef.current = value;
  latestCanRollRef.current = canRoll;

  const clearTimers = useCallback(() => {
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
    if (rollTimeoutRef.current !== null) window.clearTimeout(rollTimeoutRef.current);
    rafRef.current = null;
    settleTimerRef.current = null;
    rollTimeoutRef.current = null;
  }, []);

  const paint = useCallback((motion: DieMotion, bounds: DieBounds) => {
    const die = dieRef.current;
    const shadow = shadowRef.current;
    if (!die || !shadow || !isRenderableMotion(motion, bounds)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[BoardRaceDie] Estado visual inválido; o dado será restaurado na próxima oportunidade.", { motion, bounds });
      }
      return false;
    }
    die.style.transition = "none";
    const lift = motion.height * 0.34;
    const scale = 1 + Math.min(0.075, motion.height / 900);
    die.style.transform = `translate3d(${motion.x}px, ${motion.y - lift}px, ${motion.height * 0.08}px) rotateX(${motion.rx}deg) rotateY(${motion.ry}deg) rotateZ(${motion.rz}deg) scale(${scale})`;
    const shadowScale = Math.max(0.48, 1 - motion.height / 230);
    shadow.style.transition = "none";
    shadow.style.transform = `translate3d(${motion.x + bounds.size * 0.12}px, ${motion.y + bounds.size * 0.82}px, 0) scale(${shadowScale})`;
    shadow.style.opacity = String(Math.max(0.13, 0.42 - motion.height / 370));
    shadow.style.filter = `blur(${4 + Math.min(8, motion.height / 18)}px)`;
    return true;
  }, []);

  const placeAtHome = useCallback(() => {
    const bounds = getBounds(layerRef.current, dieRef.current);
    if (!bounds) return;
    const orientation = DIE_FACE_ORIENTATION[latestValueRef.current ?? 1];
    const motion: DieMotion = {
      x: Math.max(0, bounds.width / 2 - bounds.size / 2),
      y: Math.max(0, bounds.height * 0.8 - bounds.size / 2),
      vx: 0, vy: 0, height: 0, heightVelocity: 0,
      rx: orientation.x, ry: orientation.y, rz: orientation.z,
      spinX: 0, spinY: 0, spinZ: 0,
    };
    motionRef.current = motion;
    paint(motion, bounds);
  }, [paint]);

  const clearGesture = useCallback((restoreHome = false) => {
    const die = dieRef.current;
    const pointerId = pointerRef.current;
    if (die && pointerId !== null && die.hasPointerCapture?.(pointerId)) {
      die.releasePointerCapture?.(pointerId);
    }
    pointerRef.current = null;
    pointerStartRef.current = null;
    pointsRef.current = [];
    draggingRef.current = false;
    setDragging(false);
    if (restoreHome) window.requestAnimationFrame(placeAtHome);
  }, [placeAtHome]);

  const resetForAvailableTurn = useCallback(() => {
    clearTimers();
    clearGesture();
    animatingRef.current = false;
    releaseRef.current = false;
    resultForThrowRef.current = null;
    setThrowing(false);
    setVisible(true);
    setSettledValue(latestValueRef.current);
    window.requestAnimationFrame(placeAtHome);
  }, [clearGesture, clearTimers, placeAtHome]);

  const finishThrow = useCallback((motion: DieMotion, bounds: DieBounds, settling: SettlingMotion) => {
    const settled = {
      ...motion,
      height: 0,
      heightVelocity: 0,
      vx: 0,
      vy: 0,
      rx: settling.target.x,
      ry: settling.target.y,
      rz: settling.target.z,
      spinX: 0,
      spinY: 0,
      spinZ: 0,
    };
    motionRef.current = settled;
    paint(settled, bounds);
    animatingRef.current = false;
    setThrowing(false);
    setSettledValue(settling.result);
    if (!latestCanRollRef.current) {
      settleTimerRef.current = window.setTimeout(() => setVisible(false), FINAL_FACE_HOLD_MS);
    }
  }, [paint]);

  const runThrow = useCallback((initial: DieMotion) => {
    clearTimers();
    animatingRef.current = true;
    motionRef.current = initial;
    setVisible(true);
    setThrowing(true);
    setSettledValue(null);
    const startedAt = performance.now();
    const duration = throwDurationMs(initial);
    const settlingStartsAt = duration - SETTLING_WINDOW_MS;
    let settling: SettlingMotion | null = null;
    let previous = startedAt;
    const frame = (now: number) => {
      const bounds = getBounds(layerRef.current, dieRef.current);
      const current = motionRef.current;
      if (!bounds || !current) {
        rafRef.current = null;
        animatingRef.current = false;
        setThrowing(false);
        if (latestCanRollRef.current) {
          setVisible(true);
          window.requestAnimationFrame(placeAtHome);
        } else {
          setVisible(false);
        }
        return;
      }
      const elapsed = now - startedAt;
      const next = stepDieMotion(current, bounds, (now - previous) / 1_000);
      previous = now;
      const result = resultForThrowRef.current;
      if (!settling && result !== null && elapsed >= settlingStartsAt) {
        settling = {
          startedAt: now,
          durationMs: Math.max(MIN_LATE_SETTLING_MS, duration - elapsed),
          from: { x: next.rx, y: next.ry, z: next.rz },
          target: closestFinalOrientation(next, result),
          spin: { x: next.spinX, y: next.spinY, z: next.spinZ },
          result,
        };
      }
      let settlingProgress = 0;
      if (settling) {
        settlingProgress = Math.min(1, (now - settling.startedAt) / settling.durationMs);
        const orientation = interpolateSettlingOrientation(
          settling.from,
          settling.target,
          settling.spin,
          settlingProgress,
          settling.durationMs
        );
        next.rx = orientation.x;
        next.ry = orientation.y;
        next.rz = orientation.z;
        const remainingSpin = (1 - settlingProgress) ** 2;
        next.spinX = settling.spin.x * remainingSpin;
        next.spinY = settling.spin.y * remainingSpin;
        next.spinZ = settling.spin.z * remainingSpin;
      }
      if (!isRenderableMotion(next, bounds) || !paint(next, bounds)) {
        rafRef.current = null;
        animatingRef.current = false;
        setThrowing(false);
        if (latestCanRollRef.current) {
          setVisible(true);
          window.requestAnimationFrame(placeAtHome);
        } else {
          setVisible(false);
        }
        return;
      }
      motionRef.current = next;
      if (settling && settlingProgress >= 1) {
        rafRef.current = null;
        finishThrow(next, bounds, settling);
        return;
      }
      rafRef.current = window.requestAnimationFrame(frame);
    };
    rafRef.current = window.requestAnimationFrame(frame);
  }, [clearTimers, finishThrow, paint, placeAtHome]);

  useLayoutEffect(() => {
    placeAtHome();
    const layer = layerRef.current;
    if (!layer || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (latestCanRollRef.current && draggingRef.current) {
        resetForAvailableTurn();
      } else if (!draggingRef.current && !animatingRef.current) {
        placeAtHome();
      }
    });
    observer.observe(layer);
    return () => observer.disconnect();
  }, [placeAtHome, resetForAvailableTurn]);

  useEffect(() => {
    const wasAvailable = previousCanRollRef.current;
    previousCanRollRef.current = canRoll;
    if (canRoll && !wasAvailable) resetForAvailableTurn();
  }, [canRoll, resetForAvailableTurn]);

  // O serial é a confirmação autoritativa. No cliente remoto/BOT ele também
  // inicia uma trajetória reproduzível; no lançador local apenas fixa a face.
  useEffect(() => {
    if (serial === lastSerialRef.current) return;
    lastSerialRef.current = serial;
    resultForThrowRef.current = value;
    setSettledValue(value);
    if (releaseRef.current) {
      releaseRef.current = false;
      if (rollTimeoutRef.current !== null) window.clearTimeout(rollTimeoutRef.current);
      rollTimeoutRef.current = null;
      return;
    }
    const bounds = getBounds(layerRef.current, dieRef.current);
    if (!bounds) return;
    setVisible(true);
    const launch = deterministicThrow(serial, value);
    runThrow(createLaunchMotion(launch.dx, launch.dy, launch.vx, launch.vy, bounds));
  }, [runThrow, serial, value]);

  useEffect(() => () => {
    animatingRef.current = false;
    clearTimers();
  }, [clearTimers]);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerRef.current !== null || draggingRef.current) clearGesture();
    if (!canRoll || throwing || releaseRef.current || pointerRef.current !== null || event.isPrimary === false) return;
    event.preventDefault();
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = { x: event.clientX, y: event.clientY, time: performance.now() };
    pointerStartRef.current = point;
    pointsRef.current = [point];
    draggingRef.current = true;
    const current = motionRef.current;
    dragOriginRef.current = { x: current?.x ?? 0, y: current?.y ?? 0 };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerRef.current !== event.pointerId || !draggingRef.current) return;
    event.preventDefault();
    const start = pointerStartRef.current;
    if (!start) return;
    const point = { x: event.clientX, y: event.clientY, time: performance.now() };
    pointsRef.current = [...pointsRef.current, point].slice(-12);
    const bounds = getBounds(layerRef.current, dieRef.current);
    const current = motionRef.current;
    if (!bounds || !current) return;
    const x = Math.max(0, Math.min(bounds.width - bounds.size, dragOriginRef.current.x + (point.x - start.x) * 0.76));
    const y = Math.max(0, Math.min(bounds.height - bounds.size, dragOriginRef.current.y + (point.y - start.y) * 0.76));
    const dragged = { ...current, x, y, rx: (point.y - start.y) * -0.42, ry: (point.x - start.x) * 0.42, rz: (point.x - start.x) * 0.12 };
    motionRef.current = dragged;
    paint(dragged, bounds);
  };

  const releasePointer = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    const finalPoint = { x: event.clientX, y: event.clientY, time: performance.now() };
    const start = pointerStartRef.current;
    const points = [...pointsRef.current, finalPoint].slice(-12);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    clearGesture();
    if (!start) return;
    const dx = finalPoint.x - start.x;
    const dy = finalPoint.y - start.y;
    if (Math.hypot(dx, dy) < DIE_MIN_DRAG_DISTANCE) {
      window.requestAnimationFrame(placeAtHome);
      return;
    }
    const bounds = getBounds(layerRef.current, dieRef.current);
    const current = motionRef.current;
    if (releaseRef.current) return;
    const velocity = velocityFromRecentPoints(points);
    releaseRef.current = true;
    resultForThrowRef.current = null;
    if (bounds && current) {
      runThrow(createLaunchMotion(dx, dy, velocity.vx, velocity.vy, bounds, { x: current.x, y: current.y }));
    }
    rollTimeoutRef.current = window.setTimeout(() => { releaseRef.current = false; }, 2_600);
    onRoll();
  };

  const cancelPointer = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    clearGesture(true);
  };

  const recoverLostPointerCapture = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerRef.current !== event.pointerId && !draggingRef.current) return;
    clearGesture(true);
  };

  const accessibleValue = settledValue ?? value;
  return (
    <div ref={layerRef} className={`${styles.dieLaunchLayer} ${!visible && !canRoll ? styles.dieLaunchLayerHidden : ""}`} aria-hidden={!visible && !canRoll} aria-live="polite">
      <span ref={shadowRef} className={styles.throwDieShadow} />
      <button
        ref={dieRef}
        type="button"
        aria-label={canRoll ? "Arraste o dado e solte para jogar" : accessibleValue ? `Dado: ${accessibleValue}` : "Dado em lançamento"}
        disabled={!canRoll || throwing}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={cancelPointer}
        onLostPointerCapture={recoverLostPointerCapture}
        className={`${styles.throwDie} ${canRoll ? styles.throwDieReady : ""} ${dragging ? styles.throwDieDragging : ""} ${throwing ? styles.throwDieRolling : ""}`}
      >
        <span className={styles.cubeCore} aria-hidden="true">
          <span className={`${styles.cubeCoreFace} ${styles.cubeCoreFront}`} />
          <span className={`${styles.cubeCoreFace} ${styles.cubeCoreBack}`} />
          <span className={`${styles.cubeCoreFace} ${styles.cubeCoreRight}`} />
          <span className={`${styles.cubeCoreFace} ${styles.cubeCoreLeft}`} />
          <span className={`${styles.cubeCoreFace} ${styles.cubeCoreTop}`} />
          <span className={`${styles.cubeCoreFace} ${styles.cubeCoreBottom}`} />
        </span>
        <DieFace value={1} className={styles.cubeFront} />
        <DieFace value={6} className={styles.cubeBack} />
        <DieFace value={3} className={styles.cubeRight} />
        <DieFace value={4} className={styles.cubeLeft} />
        <DieFace value={2} className={styles.cubeTop} />
        <DieFace value={5} className={styles.cubeBottom} />
      </button>
      {canRoll && !throwing && <span className={styles.throwDieHint}>Arraste e solte</span>}
      {!canRoll && !throwing && accessibleValue !== null && <span className={styles.throwDieResult}>{total !== null && total !== accessibleValue ? `${accessibleValue} → ${total}` : `Saiu ${accessibleValue}`}</span>}
      {rolledBy === "BOT" && throwing && <span className={styles.throwDieResult}>BOT lançou</span>}
    </div>
  );
}
