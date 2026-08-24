"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";
import GameCard from "@/components/GameCard";
import { GAMES } from "@/lib/games";
import { GameDefinition } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();

  const handlePlay = (game: GameDefinition) => {
    if (game.id === "sudoku") {
      router.push("/room-sudoku");
      return;
    }
    if (game.id === "colors") {
      router.push("/room-colors");
      return;
    }
    if (game.id === "crossword") {
      router.push("/room-crossword");
      return;
    }
    if (game.id === "wordsearch") {
      router.push("/room-wordsearch");
      return;
    }
    if (game.id === "quiz") {
      router.push("/room-quiz");
      return;
    }
    if (game.id === "rpg") {
      router.push("/room-rpg");
      return;
    }
    router.push(`/room?game=${game.id}`);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-5 py-14 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Logo size={52} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 text-center font-display text-3xl font-semibold text-ink sm:text-4xl"
      >
        Uma salinha só nossa
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-3 max-w-md text-center text-ink-soft"
      >
        Jogos cooperativos para vocês dois jogarem juntos, em tempo real, onde quer que estejam.
      </motion.p>

      <div className="mt-12 grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
        {GAMES.map((game, i) => (
          <GameCard key={game.id} game={game} index={i} onPlay={handlePlay} />
        ))}
      </div>
    </main>
  );
}
