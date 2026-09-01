"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import GameCard from "@/components/GameCard";
import { GAMES } from "@/lib/games";
import { GameDefinition } from "@/lib/types";
import GameSearch, { normalizeGameSearch } from "@/components/GameSearch";
import GameCatalogActions from "@/components/GameCatalogActions";
import GameSequenceSuggestion from "@/components/GameSequenceSuggestion";

export default function SoloPickerPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const filteredGames = useMemo(() => {
    const query = normalizeGameSearch(search);
    if (!query) return GAMES;
    return GAMES.filter((game) => normalizeGameSearch(`${game.name} ${game.description}`).includes(query));
  }, [search]);
  const handleRandomGame = () => {
    const availableGames = GAMES.filter((game) => game.available);
    const game = availableGames[Math.floor(Math.random() * availableGames.length)];
    if (game) router.push(`/solo/${game.id}`);
  };

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

      <div className="mt-10 w-full">
        <GameSearch value={search} onChange={setSearch} />
        <GameCatalogActions onRandom={handleRandomGame} onToggleSuggestion={() => setSuggestionOpen((open) => !open)} suggestionOpen={suggestionOpen} />
        <AnimatePresence initial={false}>
          {suggestionOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <GameSequenceSuggestion
                sequence={GAMES.filter((game) => game.available).map((game) => game.id)}
                sequenceProgress={[]}
                isHost={false}
                onShuffle={() => undefined}
                onPickGame={() => undefined}
                preview
              />
            </motion.div>
          )}
        </AnimatePresence>
        {filteredGames.length > 0 ? (
          <div className="mt-5 grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
            {filteredGames.map((game, i) => (
          <GameCard
            key={game.id}
            game={game}
            index={i}
            ctaLabel="Jogar sozinho"
            onPlay={(g: GameDefinition) => router.push(`/solo/${g.id}`)}
          />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl3 border border-surface/70 bg-surface/45 px-5 py-10 text-center">
            <p className="font-display text-base font-semibold text-ink">Nenhum jogo encontrado</p>
            <p className="mt-1 text-sm text-ink-soft">Tente pesquisar outro nome.</p>
          </div>
        )}
      </div>
    </main>
  );
}
