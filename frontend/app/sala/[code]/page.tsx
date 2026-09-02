"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import ConnectionThread from "@/components/ConnectionThread";
import GameCard from "@/components/GameCard";
import GameConfigPanel from "@/components/GameConfigPanel";
import GameSequenceSuggestion from "@/components/GameSequenceSuggestion";
import LoadingScreen from "@/components/LoadingScreen";
import { useRoomSession } from "@/hooks/useRoomSession";
import { GAMES } from "@/lib/games";
import { GameDefinition, Player } from "@/lib/types";
import GameSearch, { normalizeGameSearch } from "@/components/GameSearch";
import GameCatalogActions from "@/components/GameCatalogActions";
import AccountPanel from "@/components/account/AccountPanel";
import { fetchAccounts } from "@/lib/accountApi";

export default function DuoRoomPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();
  const {
    room,
    selfId,
    notFound,
    kicked,
    error,
    selectGame,
    backToGameSelect,
    setConfig,
    startGame,
    kickPlayer,
    shuffleSequence,
  } = useRoomSession(code);
  const [search, setSearch] = useState("");
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [viewedProfile, setViewedProfile] = useState<Awaited<ReturnType<typeof fetchAccounts>>[number] | null>(null);
  const profileRequestRef = useRef(0);
  const filteredGames = useMemo(() => {
    const query = normalizeGameSearch(search);
    if (!query) return GAMES;
    return GAMES.filter((item) => normalizeGameSearch(`${item.name} ${item.description}`).includes(query));
  }, [search]);

  useEffect(() => {
    if (room?.status === "playing" || room?.status === "finished") {
      router.push(`/game/${room.gameId}/${room.code}`);
    }
  }, [room, router]);

  useEffect(() => {
    if (kicked) router.push("/?aviso=expulso");
  }, [kicked, router]);

  if (kicked) return null;

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-ink-soft">Essa sala não existe (ou o código está errado).</p>
        <Button onClick={() => router.push("/duo")}>Voltar</Button>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5">
        <LoadingScreen label="Entrando na sala..." />
      </main>
    );
  }

  const isHost = Boolean(selfId && room.hostId === selfId);
  const bothConnected = room.players.filter((p) => p.connected).length === room.maxPlayers;
  const game = GAMES.find((g) => g.id === room.gameId);

  const handleStart = async () => {
    await startGame();
  };
  const handleRandomGame = () => {
    const availableGames = GAMES.filter((item) => item.available);
    const gameToPlay = availableGames[Math.floor(Math.random() * availableGames.length)];
    if (gameToPlay) selectGame(gameToPlay.id);
  };

  const handleViewProfile = async (player: Player) => {
    // Visitantes sem uma conta fixa não têm um perfil persistente para abrir.
    if (!player.accountId || player.id === selfId) return;
    const requestId = ++profileRequestRef.current;
    try {
      const profiles = await fetchAccounts();
      if (requestId !== profileRequestRef.current) return;
      const profile = profiles.find((item) => item.id === player.accountId);
      if (profile) setViewedProfile(profile);
    } catch {
      // O avatar continua apenas visual se o perfil não puder ser carregado.
    }
  };

  return (
    <main className="room-shell app-shell mx-auto flex min-h-screen max-w-md flex-col items-center px-5 py-14">
      <div className="flex w-full items-center justify-between">
        <Logo size={40} />
        <span className="font-display text-xs font-medium tracking-[0.15em] text-ink-soft">Sala {room.code}</span>
      </div>

      <AnimatePresence mode="wait">
        {room.status === "lobby" ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="mt-6 flex w-full flex-col items-center gap-6"
          >
            <div className="glass-panel w-full rounded-xl3 p-5 text-center">
              <p className="text-xs text-ink-soft">Código da sala</p>
              <p className="font-display text-2xl font-semibold tracking-[0.3em] text-ink">{room.code}</p>
              <p className="mt-1 text-xs text-ink-soft">Envie esse código para seu par entrar.</p>
              <ConnectionThread
                players={room.players}
                maxPlayers={room.maxPlayers}
                selfId={selfId}
                isHost={isHost}
                onKick={kickPlayer}
                onViewProfile={handleViewProfile}
              />
              {error && <p className="mt-2 text-sm text-rose-deep">{error}</p>}
            </div>

            {isHost ? (
              <div className="w-full">
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
                        sequence={room.sequence}
                        sequenceProgress={room.sequenceProgress}
                        isHost={isHost}
                        onShuffle={shuffleSequence}
                        onPickGame={selectGame}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                {filteredGames.length > 0 ? (
                  <div className="mt-5 grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
                    {filteredGames.map((g, i) => (
                      <GameCard key={g.id} game={g} index={i} ctaLabel="Escolher" onPlay={(gd: GameDefinition) => selectGame(gd.id)} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-8 rounded-xl3 border border-surface/70 bg-surface/45 px-5 py-10 text-center">
                    <p className="font-display text-base font-semibold text-ink">Nenhum jogo encontrado</p>
                    <p className="mt-1 text-sm text-ink-soft">Tente pesquisar outro nome.</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-sm text-ink-soft">Aguardando o anfitrião escolher o jogo...</p>
            )}

          </motion.div>
        ) : (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-panel mt-6 w-full rounded-xl3 p-6 text-center"
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => isHost && backToGameSelect()}
                disabled={!isHost}
                className="flex items-center gap-1.5 text-xs font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
              >
                <ArrowLeft size={14} /> Trocar jogo
              </button>
              <span className="text-2xl">{game?.emoji}</span>
            </div>

            <h1 className="mt-2 font-display text-xl font-semibold text-ink">{game?.name}</h1>
            <p className="mt-1 text-xs text-ink-soft">Envie o código {room.code} para seu par entrar — ou jogue sozinho.</p>

            <ConnectionThread
              players={room.players}
              maxPlayers={room.maxPlayers}
              selfId={selfId}
              isHost={isHost}
              onKick={kickPlayer}
              onViewProfile={handleViewProfile}
            />

            <div className="mt-2">
              <GameConfigPanel room={room} isHost={isHost} selfId={selfId} setConfig={setConfig} />
            </div>

            {isHost ? (
              <>
                <Button onClick={handleStart} className="mt-6 w-full">
                  {bothConnected ? "Iniciar partida" : "Jogar sozinho"}
                </Button>
                {!bothConnected && (
                  <p className="mt-2 text-xs text-ink-soft">
                    Ainda esperando seu par entrar — ou comece agora e jogue sozinho.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-6 text-sm text-ink-soft">Aguardando o anfitrião iniciar a partida...</p>
            )}

            {error && <p className="mt-4 text-sm text-rose-deep">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {viewedProfile && (
        <AccountPanel
          accountId={viewedProfile.id}
          profile={viewedProfile}
          readOnly
          onClose={() => setViewedProfile(null)}
        />
      )}
    </main>
  );
}
