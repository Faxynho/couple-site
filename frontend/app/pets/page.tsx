import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, PawPrint } from "lucide-react";
import { PETS, petReturnHref, petRoomQuery } from "@/pets/config";
import styles from "@/pets/pets.module.css";

export default function PetsPage({ searchParams }: { searchParams: { sala?: string } }) {
  const query = petRoomQuery(searchParams.sala);
  return (
    <main className={styles.shell}>
      <div className={styles.inner}>
        <Link href={petReturnHref(searchParams.sala)} className={styles.backLink}><ArrowLeft size={17} /> Voltar ao lobby</Link>
        <div className={styles.selectorHeading}>
          <span className={styles.eyebrow}><PawPrint size={14} /> Nosso cantinho</span>
          <h1>Nossos Pets</h1>
          <p>Quem você quer visitar?</p>
        </div>
        <div className={styles.selectorGrid}>
          {PETS.map((pet) => (
            <Link href={`/pets/${pet.id}${query}`} className={styles.petCard} key={pet.id} aria-label={`Visitar o quarto de ${pet.name}`}>
              <span className={styles.cardArt}>
                <span className={styles.cardHalo} aria-hidden="true" />
                <Image src={pet.portrait} alt="" width={pet.portraitWidth} height={pet.portraitHeight} sizes="(max-width: 640px) 70vw, 300px" className={styles.portrait} priority />
              </span>
              <span className={styles.cardFooter}>
                <span><small>Visitar</small><strong>{pet.name}</strong></span>
                <span className={styles.cardArrow}><ArrowUpRight size={20} /></span>
              </span>
            </Link>
          ))}
        </div>
        <div className={styles.selectorFootprint} aria-hidden="true"><PawPrint size={21} /><span>♥</span><PawPrint size={21} /></div>
      </div>
    </main>
  );
}
