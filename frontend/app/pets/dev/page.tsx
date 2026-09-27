"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FlaskConical } from "lucide-react";
import { useEffect, useState } from "react";
import { getActiveAccountId } from "@/lib/accountSession";
import { PETS, petRoomQuery } from "@/pets/config";
import styles from "@/pets/pets.module.css";

export default function PetDevChoicePage({ searchParams }: { searchParams: { sala?: string } }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => setAllowed(getActiveAccountId() === "andre"), []);
  const query = petRoomQuery(searchParams.sala);
  if (allowed === null) return null;
  if (!allowed) return <main className={styles.shell}><p className={styles.petDevDenied}>Acesso exclusivo da conta André.</p></main>;
  return <main className={styles.shell + " " + styles.petDevShell}>
    <div className={styles.inner + " " + styles.selectorInner}>
      <div className={styles.selectorTopbar}><Link href={`/pets${query}`} className={styles.backLink}><ArrowLeft size={17} /> Nossos Pets</Link><span className={styles.selectorBadge}><FlaskConical size={14} /> MODO DEV</span></div>
      <header className={styles.selectorHero}><span className={styles.eyebrow}>Ambiente isolado</span><h1>Quartos de Desenvolvimento</h1><p>Nenhuma alteração daqui toca os quartos reais.</p></header>
      <div className={styles.selectorGrid}>{PETS.map((pet) => <Link href={`/pets/dev/${pet.id}${query}`} className={styles.petCard} key={pet.id}><span className={styles.cardArt}><Image src={pet.portrait} alt="" width={pet.portraitWidth} height={pet.portraitHeight} className={styles.portrait} /></span><span className={styles.cardFooter}><span className={styles.cardCopy}><small>Quarto de testes</small><strong>{pet.name} DEV</strong><span className={styles.cardSubtitle}>Testar compras e slots</span></span><span className={styles.cardArrow}><ArrowUpRight size={20} /></span></span></Link>)}</div>
    </div>
  </main>;
}
