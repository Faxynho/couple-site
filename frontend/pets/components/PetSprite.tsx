import type { CSSProperties } from "react";
import type { PetAnimation, PetDefinition } from "../config";
import PetRig from "./PetRig";
import styles from "../pets.module.css";

interface PetSpriteProps {
  pet: PetDefinition;
  animation?: PetAnimation;
  className?: string;
}

export default function PetSprite({ pet, animation = "idle", className = "" }: PetSpriteProps) {
  if (pet.renderer === "rig") {
    return <PetRig pet={pet} animation={animation} className={className} />;
  }

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
      data-pet={pet.id}
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
