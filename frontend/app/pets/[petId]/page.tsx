import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPet, petRoomQuery } from "@/pets/config";
import PetRoom from "@/pets/components/PetRoom";
import styles from "@/pets/PetRoom.module.css";

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
          <Link href={`/pets${petRoomQuery(searchParams.sala)}`} className={styles.backLink} aria-label="Voltar para Nossos Pets"><ArrowLeft size={19} /><span className={styles.backText}>Nossos Pets</span></Link>
        </header>
        <PetRoom pet={pet} />
      </div>
    </main>
  );
}
