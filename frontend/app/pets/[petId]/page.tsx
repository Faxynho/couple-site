import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PawPrint } from "lucide-react";
import { getPet, petRoomQuery } from "@/pets/config";
import PetRoom from "@/pets/components/PetRoom";
import styles from "@/pets/pets.module.css";

export default function PetRoomPage({
  params,
  searchParams,
}: {
  params: { petId: string };
  searchParams: { sala?: string };
}) {
  const pet = getPet(params.petId);
  if (!pet) notFound();

  return (
    <main className={styles.shell}>
      <div className={styles.roomInner}>
        <header className={styles.roomHeader}>
          <Link href={`/pets${petRoomQuery(searchParams.sala)}`} className={styles.backLink}><ArrowLeft size={17} /> Nossos Pets</Link>
          <span className={styles.roomHeaderBadge}><PawPrint size={14} /> Quartinho de {pet.name}</span>
        </header>
        <PetRoom pet={pet} />
      </div>
    </main>
  );
}
