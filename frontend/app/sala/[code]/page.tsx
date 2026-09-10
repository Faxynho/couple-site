"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Pencil, X } from "lucide-react";
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
import PersistentDuoStatus from "@/components/duo/PersistentDuoStatus";
import {
  getPersistentDuoAvailabilityMessage,
  normalizePersistentDuoDisplayName,
  PERSISTENT_DUO_DEFAULT_DISPLAY_NAME,
  PERSISTENT_DUO_DISPLAY_NAME_MAX_LENGTH,
} from "@/lib/persistentDuo";

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
    setBoardRacePawnColor,
    startGame,
    kickPlayer,
    shuffleSequence,
    setPersistentDuoName,
  } = useRoomSession(code);
  const [search, setSearch] = useState("");
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [showMinigames, setShowMinigames] = useState(false);
  const [lobbyNotice, setLobbyNotice] = useState<string | null>(null);
  const [editingLobbyName, setEditingLobbyName] = useState(false);
  const [lobbyNameDraft, setLobbyNameDraft] = useState("");
  const [lobbyNameError, setLobbyNameError] = useState<string | null>(null);
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
    if (room?.status && room.status !== "lobby") setShowMinigames(false);
  }, [room?.status]);

  useEffect(() => {
    if (!editingLobbyName && room?.persistentDuoLobby?.displayName) {
      setLobbyNameDraft(room.persistentDuoLobby.displayName);
    }
  }, [editingLobbyName, room?.persistentDuoLobby?.displayName]);

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

  const isPersistentDuo = room.roomKind === "persistent-duo";
  const isHost = isPersistentDuo || Boolean(selfId && room.hostId === selfId);
  const persistentPresence = room.persistentDuoPresence ?? { andre: "offline" as const, flavia: "offline" as const };
  const persistentAvailabilityMessage = isPersistentDuo && (selfId === "andre" || selfId === "flavia")
    ? getPersistentDuoAvailabilityMessage(persistentPresence, selfId)
    : null;
  const bothConnected = isPersistentDuo
    ? persistentAvailabilityMessage === null
    : room.players.filter((p) => p.connected).length === room.maxPlayers;
  const requiresPair = room.gameId === "whoami" || room.gameId === "casino";
  const pairRequirementMessage = room.gameId === "casino" ? "O Cassino precisa dos dois jogadores conectados." : "O Quem Sou Eu? precisa dos dois jogadores conectados.";
  const game = GAMES.find((g) => g.id === room.gameId);

  const handleStart = async () => {
    await startGame();
  };
  const lobbyDisplayName = room.persistentDuoLobby?.displayName ?? PERSISTENT_DUO_DEFAULT_DISPLAY_NAME;
  const beginLobbyNameEdit = () => {
    setLobbyNameDraft(lobbyDisplayName);
    setLobbyNameError(null);
    setEditingLobbyName(true);
  };
  const cancelLobbyNameEdit = () => {
    setLobbyNameDraft(lobbyDisplayName);
    setLobbyNameError(null);
    setEditingLobbyName(false);
  };
  const saveLobbyName = async () => {
    const displayName = normalizePersistentDuoDisplayName(lobbyNameDraft);
    if (!displayName) {
      setLobbyNameError("Digite um nome para o lobby.");
      return;
    }
    const result = await setPersistentDuoName(displayName);
    if (!result.ok) {
      setLobbyNameError(result.error ?? "Não foi possível salvar o nome do lobby.");
      return;
    }
    setLobbyNameError(null);
    setEditingLobbyName(false);
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
        <span className="font-display text-xs font-medium tracking-[0.15em] text-ink-soft">
          {isPersistentDuo ? "NOSSO LOBBY" : `Sala ${room.code}`}
        </span>
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
            <div className="glass-panel room-panel w-full rounded-xl3 p-5 text-center">
              {isPersistentDuo ? (
                <>
                  <span className="text-3xl">💞</span>
                  {editingLobbyName ? (
                    <form
                      className="mx-auto mt-3 flex w-full max-w-sm flex-col gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void saveLobbyName();
                      }}
                    >
                      <label htmlFor="persistent-duo-lobby-name" className="sr-only">Nome do lobby</label>
                      <input
                        id="persistent-duo-lobby-name"
                        autoFocus
                        maxLength={PERSISTENT_DUO_DISPLAY_NAME_MAX_LENGTH}
                        value={lobbyNameDraft}
                        onChange={(event) => setLobbyNameDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") cancelLobbyNameEdit();
                        }}
                        className="w-full rounded-xl2 border border-rose/30 bg-surface/70 px-3 py-2 text-center font-display text-lg font-semibold text-ink outline-none ring-rose/30 focus:ring-2"
                      />
                      <div className="flex justify-center gap-2">
                        <button type="submit" className="inline-flex min-h-9 items-center gap-1 rounded-full bg-rose px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90">
                          <Check size={14} /> Salvar
                        </button>
                        <button type="button" onClick={cancelLobbyNameEdit} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-surface px-3 text-xs font-semibold text-ink-soft transition-colors hover:text-ink">
                          <X size={14} /> Cancelar
                        </button>
                      </div>
                      {lobbyNameError && <p className="text-xs text-rose-deep" role="alert">{lobbyNameError}</p>}
                    </form>
                  ) : (
                    <div className="mt-2 flex max-w-full items-start justify-center gap-2">
                      <h1 className="min-w-0 break-words font-display text-xl font-semibold text-ink">{lobbyDisplayName}</h1>
                      <button
                        type="button"
                        onClick={beginLobbyNameEdit}
                        aria-label="Editar nome do lobby"
                        className="mt-1 shrink-0 rounded-full p-1.5 text-ink-soft transition-colors hover:bg-surface hover:text-ink"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  )}
                  <p className="mb-5 mt-1 text-xs text-ink-soft">O cantinho compartilhado de vocês, sempre no mesmo lugar.</p>
                  <PersistentDuoStatus presence={persistentPresence} />
                </>
              ) : (
                <>
                  <p className="text-xs text-ink-soft">Código da sala</p>
                  <p className="room-code font-display text-2xl font-semibold tracking-[0.3em] text-ink">{room.code}</p>
                  <p className="mt-1 text-xs text-ink-soft">Envie esse código para seu par entrar.</p>
                  <ConnectionThread
                    players={room.players}
                    maxPlayers={room.maxPlayers}
                    selfId={selfId}
                    isHost={isHost}
                    onKick={kickPlayer}
                    onViewProfile={handleViewProfile}
                  />
                </>
              )}
              {error && <p className="mt-2 text-sm text-rose-deep">{error}</p>}
            </div>

            {isPersistentDuo && !showMinigames ? (
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  disabled
                  className="glass-panel relative flex min-h-40 flex-col items-center justify-center rounded-xl3 p-6 text-center opacity-65"
                >
                  <span className="absolute right-4 top-4 rounded-full bg-surface/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Em breve</span>
                  <span className="text-4xl">🏡</span>
                  <h2 className="mt-3 font-display text-lg font-semibold text-ink">Nosso Mundo</h2>
                  <p className="mt-1 text-xs text-ink-soft">Um espaço que cada um poderá explorar sozinho ou junto.</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (persistentAvailabilityMessage) {
                      setLobbyNotice(persistentAvailabilityMessage);
                      return;
                    }
                    setLobbyNotice(null);
                    setShowMinigames(true);
                  }}
                  className="glass-panel flex min-h-40 flex-col items-center justify-center rounded-xl3 p-6 text-center transition-transform hover:-translate-y-1 hover:shadow-glow"
                >
                  <span className="text-4xl">🎮</span>
                  <h2 className="mt-3 font-display text-lg font-semibold text-ink">Minijogos</h2>
                  <p className="mt-1 text-xs text-ink-soft">Escolham um jogo quando os dois estiverem disponíveis no lobby.</p>
                </button>
                {lobbyNotice && (
                  <p className="rounded-xl2 bg-rose/10 px-4 py-3 text-center text-sm text-rose-deep sm:col-span-2" role="status">
                    {lobbyNotice}
                  </p>
                )}
              </div>
            ) : isHost ? (
              <div className="w-full">
                {isPersistentDuo && (
                  <button
                    type="button"
                    onClick={() => setShowMinigames(false)}
                    className="mb-4 flex items-center gap-1.5 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
                  >
                    <ArrowLeft size={14} /> Voltar ao lobby
                  </button>
                )}
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
            className="glass-panel room-panel mt-6 w-full rounded-xl3 p-6 text-center"
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
            <p className="mt-1 text-xs text-ink-soft">
              {isPersistentDuo ? "Os dois podem ajustar as opções e iniciar a partida." : `Envie o código ${room.code} para seu par entrar — ou jogue sozinho.`}
            </p>

            {isPersistentDuo ? (
              <div className="mt-5"><PersistentDuoStatus presence={persistentPresence} /></div>
            ) : (
              <ConnectionThread
                players={room.players}
                maxPlayers={room.maxPlayers}
                selfId={selfId}
                isHost={isHost}
                onKick={kickPlayer}
                onViewProfile={handleViewProfile}
              />
            )}

            <div className="mt-2">
              <GameConfigPanel room={room} isHost={isHost} selfId={selfId} setConfig={setConfig} setBoardRacePawnColor={setBoardRacePawnColor} />
            </div>

            {isHost ? (
              <>
                <Button onClick={handleStart} disabled={(isPersistentDuo || requiresPair) && !bothConnected} className="mt-6 w-full">
                  {bothConnected ? "Iniciar partida" : isPersistentDuo || requiresPair ? "Aguardando seu par" : "Jogar sozinho"}
                </Button>
                {!bothConnected && (
                  <p className="mt-2 text-xs text-ink-soft">
                    {isPersistentDuo ? persistentAvailabilityMessage : requiresPair ? pairRequirementMessage : "Ainda esperando seu par entrar — ou comece agora e jogue sozinho."}
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
