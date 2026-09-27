import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { getPet, petRoomQuery } from "@/pets/config";
import PetRoom from "@/pets/components/PetRoom";
import styles from "@/pets/PetRoom.module.css";

export default function PetDevRoomPage({ params, searchParams }: { params: { petId: string }; searchParams: { sala?: string } }) {
  const pet = getPet(params.petId);
  if (!pet) notFound();
  return <main className={styles.shell + " " + styles.devRoom}>
    <div className={styles.roomInner}>
      <header className={styles.roomHeader}><Link href={`/pets/dev${petRoomQuery(searchParams.sala)}`} className={styles.backLink}><ArrowLeft size={19} /><span className={styles.backText}>Quartos DEV</span></Link></header>
      <span className={styles.devRoomBadge}><FlaskConical size={13} /> MODO DEV</span>
      <PetRoom pet={pet} environment="dev" />
    </div>
  </main>;
}
