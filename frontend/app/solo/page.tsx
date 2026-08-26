"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import GameCard from "@/components/GameCard";
import { GAMES } from "@/lib/games";
import { GameDefinition } from "@/lib/types";

export default function SoloPickerPage() {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-5 py-14 sm:py-20">
      <div className="flex w-full items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface/60 hover:text-ink"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <Logo size={40} />
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 text-center font-display text-2xl font-semibold text-ink sm:text-3xl"
      >
        Jogar Solo
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mt-2 max-w-md text-center text-ink-soft"
      >
        Escolha um jogo — só o modo solo aparece aqui, sem duelo ou modo juntos.
      </motion.p>

      <div className="mt-10 grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
        {GAMES.map((game, i) => (
          <GameCard
            key={game.id}
            game={game}
            index={i}
            ctaLabel="Jogar sozinho"
            onPlay={(g: GameDefinition) => router.push(`/solo/${g.id}`)}
          />
        ))}
      </div>
    </main>
  );
}
