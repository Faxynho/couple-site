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

// The head group carries both ears; only the upper torso, head, ears and tail
// transform. The paws and the root box stay anchored throughout the loop.
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
  const headParts = parts.filter((part) => part.motion === "head" || part.motion === "earLeft" || part.motion === "earRight");
  const groundedParts = parts.filter((part) => part.motion !== "head" && part.motion !== "earLeft" && part.motion !== "earRight");

  return (
    <span
      className={`${styles.petSprite} ${styles.rigRoot} ${className}`}
      style={{ aspectRatio: "1 / 1", "--rig-duration": `${duration}s` } as CSSProperties}
      data-pet={pet.id}
      data-animation={animation}
      role="img"
      aria-label={pet.name}
    >
      {groundedParts.map((part) => renderPart(part, canvasSize))}
      <span className={styles.rigHeadGroup} data-rig-part="headGroup" aria-hidden="true">
        {headParts.map((part) => renderPart(part, canvasSize))}
      </span>
    </span>
  );
}
