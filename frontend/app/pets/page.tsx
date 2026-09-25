import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, Heart, PawPrint, Sparkles } from "lucide-react";
import { PETS, petReturnHref, petRoomQuery } from "@/pets/config";
import styles from "@/pets/pets.module.css";

export default function PetsPage({ searchParams }: { searchParams: { sala?: string } }) {
  const query = petRoomQuery(searchParams.sala);

  return (
    <main className={styles.shell}>
      <div className={styles.selectorBackdrop} aria-hidden="true">
        <PawPrint className={styles.backdropPawOne} />
        <Heart className={styles.backdropHeart} fill="currentColor" />
        <PawPrint className={styles.backdropPawTwo} />
        <Sparkles className={styles.backdropSparkle} />
      </div>

      <div className={`${styles.inner} ${styles.selectorInner}`}>
        <div className={styles.selectorTopbar}>
          <Link href={petReturnHref(searchParams.sala)} className={styles.backLink}>
            <ArrowLeft size={17} />
            <span>Voltar ao lobby</span>
          </Link>

          <span className={styles.selectorBadge}>
            <Heart size={13} fill="currentColor" />
            Nix &amp; Max
          </span>
        </div>

        <header className={styles.selectorHero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <span className={styles.eyebrow}>
            <Sparkles size={13} />
            Nosso cantinho
            <Sparkles size={13} />
          </span>
          <h1>Nossos Pets</h1>
          <p>Escolha quem você quer visitar, cuidar e mimar agora.</p>
          <div className={styles.heroPaws} aria-hidden="true">
            <PawPrint size={15} />
            <span />
            <Heart size={12} fill="currentColor" />
            <span />
            <PawPrint size={15} />
          </div>
        </header>

        <div className={styles.selectorGrid}>
          {PETS.map((pet, index) => (
            <Link
              href={`/pets/${pet.id}${query}`}
              className={styles.petCard}
              key={pet.id}
              aria-label={`Visitar o quarto de ${pet.name}`}
            >
              <span className={styles.cardArt}>
                <span className={styles.cardHalo} aria-hidden="true" />
                <span className={styles.cardGlow} aria-hidden="true" />
                <span className={styles.cardPaw} aria-hidden="true">
                  <PawPrint size={20} />
                </span>
                <span className={styles.cardNumber} aria-hidden="true">0{index + 1}</span>
                <Image
                  src={pet.portrait}
                  alt=""
                  width={pet.portraitWidth}
                  height={pet.portraitHeight}
                  sizes="(max-width: 640px) 46vw, 300px"
                  className={styles.portrait}
                  priority
                />
              </span>

              <span className={styles.cardFooter}>
                <span className={styles.cardCopy}>
                  <small>Quarto de</small>
                  <strong>{pet.name}</strong>
                  <span className={styles.cardSubtitle}>Entrar, cuidar e brincar</span>
                </span>
                <span className={styles.cardArrow}>
                  <ArrowUpRight size={20} />
                </span>
              </span>
            </Link>
          ))}
        </div>

        <div className={styles.selectorFootprint} aria-hidden="true">
          <PawPrint size={18} />
          <span className={styles.footprintLine} />
          <Heart size={14} fill="currentColor" />
          <span className={styles.footprintLine} />
          <PawPrint size={18} />
        </div>
      </div>
    </main>
  );
}
