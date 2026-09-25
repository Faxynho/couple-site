import type { CSSProperties } from "react";
import type { PetAnimation, PetDefinition } from "../config";
import styles from "../pets.module.css";

type RigPet = Extract<PetDefinition, { renderer: "rig" }>;

// Each layer uses the same master coordinate system. Only transform changes
// during idle; the grounded body and the containing layout never move.
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

  return (
    <span
      className={`${styles.petSprite} ${styles.rigRoot} ${className}`}
      style={{ aspectRatio: "1 / 1", "--rig-duration": `${duration}s` } as CSSProperties}
      data-pet={pet.id}
      data-animation={animation}
      role="img"
      aria-label={pet.name}
    >
      {parts.map((part) => (
        <span
          key={part.src}
          className={`${styles.rigPart} ${part.motion === "head" ? styles.rigHead : part.motion === "breath" ? styles.rigBreath : ""}`}
          style={{
            left: `${part.x / canvasSize * 100}%`,
            top: `${part.y / canvasSize * 100}%`,
            width: `${part.width / canvasSize * 100}%`,
            height: `${part.height / canvasSize * 100}%`,
            backgroundImage: `url("${part.src}")`,
          }}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
