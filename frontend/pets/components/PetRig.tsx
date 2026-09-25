"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { PetAnimation, PetDefinition } from "../config";
import styles from "../pets.module.css";

type RigPet = Extract<PetDefinition, { renderer: "rig" }>;
type RigPart = RigPet["rig"]["parts"][number];

const PART_MOTION: Record<RigPart["motion"], string> = {
  fixed: "",
  breath: styles.rigBreath,
  head: "",
  earLeft: styles.rigEarLeft,
  earRight: styles.rigEarRight,
  tail: styles.rigTail,
};

function renderPart(part: RigPart, canvasSize: number) {
  return (
    <span
      key={part.src}
      className={`${styles.rigPart} ${PART_MOTION[part.motion]}`}
      style={{
        left: `${part.x / canvasSize * 100}%`,
        top: `${part.y / canvasSize * 100}%`,
        width: `${part.width / canvasSize * 100}%`,
        height: `${part.height / canvasSize * 100}%`,
        transformOrigin: part.pivot ? `${part.pivot.x}% ${part.pivot.y}%` : undefined,
        backgroundImage: `url("${part.src}")`,
      }}
      data-rig-part={part.motion}
      aria-hidden="true"
    />
  );
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomSign() {
  return Math.random() < 0.5 ? -1 : 1;
}

export default function PetRig({
  pet,
  animation,
  className,
}: {
  pet: RigPet;
  animation: PetAnimation;
  className: string;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const { canvasSize, duration, parts } = pet.rig;
  const headParts = parts.filter(
    (part) => part.motion === "head" || part.motion === "earLeft" || part.motion === "earRight",
  );
  const groundedParts = parts.filter(
    (part) => part.motion !== "head" && part.motion !== "earLeft" && part.motion !== "earRight",
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root || animation !== "idle") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const chest = root.querySelector<HTMLElement>('[data-rig-part="breath"]');
    const headBreath = root.querySelector<HTMLElement>('[data-rig-part="headBreath"]');
    const headLife = root.querySelector<HTMLElement>('[data-rig-part="headLife"]');
    const leftEar = root.querySelector<HTMLElement>('[data-rig-part="earLeft"]');
    const rightEar = root.querySelector<HTMLElement>('[data-rig-part="earRight"]');
    const tail = root.querySelector<HTMLElement>('[data-rig-part="tail"]');

    let active = true;
    let previousBreathDuration = duration * 1000;
    const timers = new Set<number>();
    const runningAnimations = new Set<Animation>();

    const later = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (active) callback();
      }, delay);
      timers.add(timer);
    };

    const play = (
      element: HTMLElement | null,
      keyframes: Keyframe[],
      options: KeyframeAnimationOptions,
    ) => {
      if (!active || !element) return null;
      const running = element.animate(keyframes, options);
      runningAnimations.add(running);
      running.oncancel = () => runningAnimations.delete(running);
      return running;
    };

    // Breathing never pauses between cycles. Its pace drifts gradually instead
    // of jumping between obviously different loops.
    const breathe = () => {
      const targetDuration = Math.max(
        2650,
        Math.min(4200, previousBreathDuration + randomBetween(-480, 480)),
      );
      previousBreathDuration = targetDuration;

      const peak = randomBetween(0.39, 0.46);
      const scaleX = randomBetween(1.048, 1.068);
      const scaleY = randomBetween(1.028, 1.043);
      const chestLift = randomBetween(0.8, 1.45);
      const headLift = randomBetween(4.5, 6.2);
      const chestAnimation = play(
        chest,
        [
          { offset: 0, transform: "translateY(0) scale(1)" },
          {
            offset: peak,
            transform: `translateY(-${chestLift.toFixed(2)}px) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`,
          },
          { offset: 1, transform: "translateY(0) scale(1)" },
        ],
        {
          duration: targetDuration,
          easing: "cubic-bezier(.45,.05,.55,.95)",
        },
      );

      play(
        headBreath,
        [
          { offset: 0, transform: "translateY(0)" },
          {
            offset: peak,
            transform: `translateY(-${headLift.toFixed(2)}px)`,
          },
          { offset: 1, transform: "translateY(0)" },
        ],
        {
          duration: targetDuration,
          easing: "cubic-bezier(.45,.05,.55,.95)",
        },
      );

      if (chestAnimation) {
        chestAnimation.onfinish = () => {
          runningAnimations.delete(chestAnimation);
          if (active) breathe();
        };
      } else {
        later(breathe, targetDuration);
      }
    };

    // Slow neck-pivot arc: rotation only, no horizontal translation. The head
    // follows a smooth left/center/right/center path while breathing happens on
    // the parent layer, so the two motions compose without a sideways twitch.
    const swayHead = () => {
      play(
        headLife,
        [
          { offset: 0, transform: "rotate(0deg)" },
          { offset: 0.25, transform: "rotate(-1.2deg)" },
          { offset: 0.5, transform: "rotate(0deg)" },
          { offset: 0.75, transform: "rotate(1.2deg)" },
          { offset: 1, transform: "rotate(0deg)" },
        ],
        {
          duration: 8200,
          iterations: Infinity,
          easing: "ease-in-out",
        },
      );
    };

    const flickEar = (ear: HTMLElement | null, side: "left" | "right", strength = 1) => {
      const outward = side === "left" ? -1 : 1;
      const amplitude = randomBetween(2.1, 4.9) * strength * outward;
      const durationMs = randomBetween(480, 920);

      const earAnimation = play(
        ear,
        [
          { offset: 0, transform: "rotate(0deg)" },
          { offset: 0.38, transform: `rotate(${amplitude.toFixed(2)}deg)` },
          { offset: 0.67, transform: `rotate(${(-amplitude * 0.24).toFixed(2)}deg)` },
          { offset: 1, transform: "rotate(0deg)" },
        ],
        { duration: durationMs, easing: "ease-in-out" },
      );

      if (earAnimation) {
        earAnimation.onfinish = () => runningAnimations.delete(earAnimation);
      }
    };

    const moveEars = () => {
      const choice = Math.random();

      if (choice < 0.35) {
        flickEar(leftEar, "left", randomBetween(0.75, 1.1));
      } else if (choice < 0.7) {
        flickEar(rightEar, "right", randomBetween(0.75, 1.1));
      } else {
        // Both ears move, but never as a perfect mirror.
        flickEar(leftEar, "left", randomBetween(0.7, 1.15));
        later(
          () => flickEar(rightEar, "right", randomBetween(0.65, 1.1)),
          randomBetween(45, 190),
        );
      }

      later(moveEars, randomBetween(850, 2600));
    };

    let tailAngle = 0;
    let tailDirection = randomSign();

    // The tail never stops. Each completed half-swing becomes the exact start
    // of the next one; only the next amplitude changes, which keeps movement
    // continuous while still feeling less mechanical.
    const wagTail = () => {
      if (!tail || !active) return;

      const strengthRoll = Math.random();
      const amplitude =
        strengthRoll < 0.24
          ? randomBetween(3.4, 4.4)
          : strengthRoll < 0.78
            ? randomBetween(4.7, 6.2)
            : randomBetween(6.5, 8.0);
      const targetAngle = amplitude * tailDirection;
      const angularDistance = Math.abs(targetAngle - tailAngle);
      const durationMs = Math.max(560, Math.min(980, 470 + angularDistance * 34));

      const tailAnimation = play(
        tail,
        [
          { transform: `rotate(${tailAngle.toFixed(2)}deg)` },
          { transform: `rotate(${targetAngle.toFixed(2)}deg)` },
        ],
        {
          duration: durationMs,
          easing: "cubic-bezier(.45,.03,.55,.97)",
          fill: "forwards",
        },
      );

      if (tailAnimation) {
        tailAnimation.onfinish = () => {
          runningAnimations.delete(tailAnimation);
          tailAngle = targetAngle;
          tail.style.transform = `rotate(${tailAngle.toFixed(2)}deg)`;
          tailAnimation.cancel();
          tailDirection *= -1;
          if (active) wagTail();
        };
      }
    };

    breathe();
    swayHead();
    later(moveEars, randomBetween(450, 1300));
    wagTail();

    return () => {
      active = false;
      timers.forEach((timer) => window.clearTimeout(timer));
      runningAnimations.forEach((running) => running.cancel());
      timers.clear();
      runningAnimations.clear();
    };
  }, [animation, duration]);

  const rigStyle = {
    aspectRatio: "1 / 1",
    "--rig-duration": `${duration}s`,
  } as CSSProperties;

  return (
    <span
      ref={rootRef}
      className={`${styles.petSprite} ${styles.rigRoot} ${className}`}
      style={rigStyle}
      data-pet={pet.id}
      data-animation={animation}
      role="img"
      aria-label={pet.name}
    >
      {groundedParts.map((part) => renderPart(part, canvasSize))}
      <span className={styles.rigHeadGroup} data-rig-part="headBreath" aria-hidden="true">
        <span className={styles.rigHeadLife} data-rig-part="headLife">
          {headParts.map((part) => renderPart(part, canvasSize))}
        </span>
      </span>
    </span>
  );
}
