import type { CSSProperties } from "react";
import type { PetAnimation, PetDefinition } from "../config";
import styles from "../pets.module.css";

interface PetSpriteProps {
  pet: PetDefinition;
  animation?: PetAnimation;
  className?: string;
}

/**
 * One image contains eight equally sized frames in a horizontal strip.
 * CSS steps move the strip without timers or React updates.
 */
export default function PetSprite({ pet, animation = "idle", className = "" }: PetSpriteProps) {
  const sheet = pet.animations[animation];
  const style = {
    aspectRatio: `${sheet.frameWidth} / ${sheet.frameHeight}`,
    "--pet-frames": sheet.frames,
    "--pet-duration": `${sheet.duration}s`,
  } as CSSProperties;

  return (
    <span
      className={`${styles.petSprite} ${className}`}
      style={style}
      role="img"
      aria-label={pet.name}
    >
      <span
        className={styles.petStrip}
        style={{
          width: `${sheet.frames * 100}%`,
          backgroundImage: `url("${sheet.src}")`,
          backgroundSize: "100% 100%",
        }}
        aria-hidden="true"
      />
    </span>
  );
}
