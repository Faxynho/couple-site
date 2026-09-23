import Link from "next/link";
import { ArrowUpRight, PawPrint } from "lucide-react";
import { PETS, petRoomQuery } from "../config";
import PetSprite from "./PetSprite";
import styles from "../pets.module.css";

export default function PetLobbyArea({ roomCode }: { roomCode: string }) {
  return (
    <section className={styles.lobbySection} aria-labelledby="lobby-pets-heading">
      <div className={styles.lobbyHeading}>
        <span className={styles.eyebrow}><PawPrint size={13} /> Um cantinho só deles</span>
        <h2 id="lobby-pets-heading">Nix &amp; Max</h2>
      </div>
      <div className={styles.lobbyStage}>
        <span className={styles.stageMolding} aria-hidden="true" />
        <span className={styles.stageFloor} aria-hidden="true" />
        <span className={styles.stageRug} aria-hidden="true" />
        <span className={styles.stageToy} aria-hidden="true" />
        <div className={styles.lobbyPets}>
          {PETS.map((pet) => (
            <div className={styles.lobbyPet} key={pet.id}>
              <PetSprite pet={pet} className={styles.lobbySprite} />
              <span className={styles.lobbyPetName}>{pet.name}</span>
            </div>
          ))}
        </div>
      </div>
      <Link className={styles.petsAccess} href={`/pets${petRoomQuery(roomCode)}`}>
        <span className={styles.petsAccessIcon}><PawPrint size={19} /></span>
        <span>Nossos Pets</span>
        <ArrowUpRight size={18} className={styles.petsAccessArrow} aria-hidden="true" />
      </Link>
    </section>
  );
}
