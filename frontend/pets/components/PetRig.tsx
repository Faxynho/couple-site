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
      const breathTilt = randomSign() * randomBetween(0.05, 0.16);

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
          { offset: 0, transform: "translateY(0) rotate(0deg)" },
          {
            offset: peak,
            transform: `translateY(-${headLift.toFixed(2)}px) rotate(${breathTilt.toFixed(3)}deg)`,
          },
          { offset: 1, transform: "translateY(0) rotate(0deg)" },
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

    const swayHead = () => {
      const direction = randomSign();
      const rotation = randomBetween(0.45, 0.85) * direction;
      const travel = randomBetween(1.1, 2.3) * direction;
      const durationMs = randomBetween(1050, 1850);

      const headAnimation = play(
        headLife,
        [
          { offset: 0, transform: "translateX(0) rotate(0deg)" },
          {
            offset: 0.42,
            transform: `translateX(${travel.toFixed(2)}px) rotate(${rotation.toFixed(3)}deg)`,
          },
          {
            offset: 0.72,
            transform: `translateX(${(travel * -0.18).toFixed(2)}px) rotate(${(rotation * -0.16).toFixed(3)}deg)`,
          },
          { offset: 1, transform: "translateX(0) rotate(0deg)" },
        ],
        { duration: durationMs, easing: "ease-in-out" },
      );

      if (headAnimation) {
        headAnimation.onfinish = () => {
          runningAnimations.delete(headAnimation);
          later(swayHead, randomBetween(1900, 4700));
        };
      }
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

    const wagTail = () => {
      const direction = randomSign();
      const strength = Math.random();
      const amplitude =
        strength < 0.3
          ? randomBetween(2.4, 3.6)
          : strength < 0.82
            ? randomBetween(3.8, 5.8)
            : randomBetween(6.0, 7.4);
      const signedAmplitude = amplitude * direction;
      const durationMs = randomBetween(850, 1650);
      const enthusiastic = strength > 0.78;

      const keyframes: Keyframe[] = enthusiastic
        ? [
            { offset: 0, transform: "rotate(0deg)" },
            { offset: 0.25, transform: `rotate(${signedAmplitude.toFixed(2)}deg)` },
            { offset: 0.5, transform: `rotate(${(-signedAmplitude * 0.7).toFixed(2)}deg)` },
            { offset: 0.72, transform: `rotate(${(signedAmplitude * 0.5).toFixed(2)}deg)` },
            { offset: 1, transform: "rotate(0deg)" },
          ]
        : [
            { offset: 0, transform: "rotate(0deg)" },
            { offset: 0.42, transform: `rotate(${signedAmplitude.toFixed(2)}deg)` },
            { offset: 0.72, transform: `rotate(${(-signedAmplitude * 0.28).toFixed(2)}deg)` },
            { offset: 1, transform: "rotate(0deg)" },
          ];

      const tailAnimation = play(tail, keyframes, {
        duration: durationMs,
        easing: "ease-in-out",
      });

      if (tailAnimation) {
        tailAnimation.onfinish = () => {
          runningAnimations.delete(tailAnimation);
          later(wagTail, randomBetween(1250, 4300));
        };
      }
    };

    breathe();
    later(swayHead, randomBetween(900, 2200));
    later(moveEars, randomBetween(450, 1300));
    later(wagTail, randomBetween(800, 2300));

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
