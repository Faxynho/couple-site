import type { PetDefinition } from "../config";
import PetSprite from "./PetSprite";
import styles from "../PetRoom.module.css";

export default function PetRoomScene({ pet }: { pet: PetDefinition }) {
  return (
    <section className={styles.scene} aria-label={`Quarto de ${pet.name}`}>
      <div className={styles.wallDetail} aria-hidden="true" />
      <div className={styles.window} aria-hidden="true">
        <span className={styles.windowSky} />
        <span className={styles.windowCross} />
        <span className={styles.curtainLeft} />
        <span className={styles.curtainRight} />
      </div>
      <div className={styles.wallFrame} aria-hidden="true"><span>♥</span></div>
      <div className={styles.wallShelf} aria-hidden="true"><span /><span /></div>
      <div className={styles.floor} aria-hidden="true" />
      <div className={styles.rug} aria-hidden="true" />
      <div className={styles.plant} aria-hidden="true"><span /><span /><span /></div>
      <div className={styles.petBed} aria-hidden="true" />
      <div className={styles.petBowl} aria-hidden="true" />
      <div className={styles.petBall} aria-hidden="true" />
      <div className={styles.petShadow} aria-hidden="true" />
      <PetSprite pet={pet} className={styles.pet} />
    </section>
  );
}
