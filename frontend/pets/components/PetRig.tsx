import type { CSSProperties } from "react";
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

export default function PetRig({
  pet,
  animation,
  className,
}: {
  pet: RigPet;
  animation: PetAnimation;
  className: string;
}) {
  const { canvasSize, duration, parts } = pet.rig;
  const headParts = parts.filter(
    (part) => part.motion === "head" || part.motion === "earLeft" || part.motion === "earRight",
  );
  const groundedParts = parts.filter(
    (part) => part.motion !== "head" && part.motion !== "earLeft" && part.motion !== "earRight",
  );

  const rigStyle = {
    aspectRatio: "1 / 1",
    "--rig-duration": `${duration}s`,
    "--rig-life-duration": `${(duration * 2.75).toFixed(2)}s`,
    "--rig-ear-left-duration": `${(duration * 2.25).toFixed(2)}s`,
    "--rig-ear-right-duration": `${(duration * 2.5).toFixed(2)}s`,
    "--rig-tail-duration": `${(duration * 3.05).toFixed(2)}s`,
  } as CSSProperties;

  return (
    <span
      className={`${styles.petSprite} ${styles.rigRoot} ${className}`}
      style={rigStyle}
      data-pet={pet.id}
      data-animation={animation}
      role="img"
      aria-label={pet.name}
    >
      {groundedParts.map((part) => renderPart(part, canvasSize))}
      <span className={styles.rigHeadGroup} data-rig-part="headGroup" aria-hidden="true">
        <span className={styles.rigHeadLife}>
          {headParts.map((part) => renderPart(part, canvasSize))}
        </span>
      </span>
    </span>
  );
}
