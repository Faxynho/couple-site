"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Heart, Pencil, X } from "lucide-react";
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
import DuoTogetherTimeBadge from "@/components/duo/DuoTogetherTimeBadge";
import SharedDrawingBoard from "@/components/duo/SharedDrawingBoard";
import PersistentDuoLobbyScene from "@/components/duo/PersistentDuoLobbyScene";
import PersistentDuoMinigamesScene from "@/components/duo/PersistentDuoMinigamesScene";
import PetLobbyArea from "@/pets/components/PetLobbyArea";
import {
  consumePersistentDuoMinigamesReturn,
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
  const [minigamesLayout, setMinigamesLayout] = useState<"visual" | "classic">("visual");
  const [lobbyNotice, setLobbyNotice] = useState<string | null>(null);
  const [editingLobbyName, setEditingLobbyName] = useState(false);
  const [lobbyNameDraft, setLobbyNameDraft] = useState("");
  const [lobbyNameError, setLobbyNameError] = useState<string | null>(null);
  const [viewedProfile, setViewedProfile] = useState<Awaited<ReturnType<typeof fetchAccounts>>[number] | null>(null);
  const profileRequestRef = useRef(0);
  const lobbyForwardVideoRef = useRef<HTMLVideoElement | null>(null);
  const lobbyReverseVideoRef = useRef<HTMLVideoElement | null>(null);
  const [lobbyVideoDirection, setLobbyVideoDirection] = useState<"forward" | "reverse">("forward");
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
    if (room?.status === "playing" || room?.status === "finished") setShowMinigames(false);
  }, [room?.status]);

  useEffect(() => {
    if (room?.roomKind !== "persistent-duo" || room.status !== "lobby") return;
    if (!consumePersistentDuoMinigamesReturn(code)) return;

    setLobbyNotice(null);
    setMinigamesLayout("visual");
    setShowMinigames(true);
  }, [code, room?.roomKind, room?.status]);

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
  const requiresPair = room.gameId === "whoami" || room.gameId === "casino" || room.gameId === "drawguess";
  const pairRequirementMessage = room.gameId === "casino"
    ? "O Cassino precisa dos dois jogadores conectados."
    : room.gameId === "drawguess"
      ? "O Desenhe & Adivinhe precisa dos dois jogadores conectados."
      : "O Quem Sou Eu? precisa dos dois jogadores conectados.";
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

  const playLobbyVideo = (direction: "forward" | "reverse") => {
    const nextVideo = direction === "forward" ? lobbyForwardVideoRef.current : lobbyReverseVideoRef.current;
    const previousVideo = direction === "forward" ? lobbyReverseVideoRef.current : lobbyForwardVideoRef.current;
    if (!nextVideo) return;

    nextVideo.currentTime = 0;
    void nextVideo.play().then(() => {
      setLobbyVideoDirection(direction);
      if (previousVideo) {
        previousVideo.pause();
        previousVideo.currentTime = 0;
      }
    }).catch(() => undefined);
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
    <main
      className={
        isPersistentDuo
          ? "persistent-duo-lobby-shell relative isolate flex min-h-[100dvh] w-full flex-col items-center overflow-x-hidden bg-transparent"
          : "room-shell app-shell mx-auto flex min-h-screen max-w-md flex-col items-center px-5 py-14"
      }
    >
      {isPersistentDuo && !showMinigames && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <video
            ref={lobbyForwardVideoRef}
            className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-75 ${lobbyVideoDirection === "forward" ? "opacity-100" : "opacity-0"}`}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={() => playLobbyVideo("reverse")}
          >
            <source src="/vídeos/lobby-background-video.mp4" type="video/mp4" />
          </video>
          <video
            ref={lobbyReverseVideoRef}
            className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-75 ${lobbyVideoDirection === "reverse" ? "opacity-100" : "opacity-0"}`}
            muted
            playsInline
            preload="auto"
            onEnded={() => playLobbyVideo("forward")}
          >
            <source src="/vídeos/lobby-background-video-reverse.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25" />
        </div>
      )}
      {isPersistentDuo && room.status === "lobby" && showMinigames && (
        <button
          type="button"
          onClick={() => {
            setLobbyNotice(null);
            setShowMinigames(false);
          }}
          aria-label="Voltar ao lobby"
          title="Voltar ao lobby"
          className="fixed left-4 top-[5.25rem] z-50 inline-flex h-10 items-center gap-1.5 rounded-full border border-[#ff86b8]/45 bg-[#211228]/75 px-3 font-display text-xs font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35),0_0_16px_rgba(255,94,160,0.16)] backdrop-blur-md transition-transform active:scale-95"
        >
          <ArrowLeft size={15} />
          Lobby
        </button>
      )}

      {!isPersistentDuo && (
        <div className="flex w-full items-center justify-between">
          <Logo size={40} />
          <span className="font-display text-xs font-medium tracking-[0.15em] text-ink-soft">
            Sala {room.code}
          </span>
        </div>
      )}

      <AnimatePresence mode={isPersistentDuo ? "sync" : "wait"}>
        {room.status === "lobby" ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={isPersistentDuo ? { opacity: 0.995, y: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: isPersistentDuo ? 0.22 : 0.4 }}
            className={isPersistentDuo ? "relative z-10 flex w-full flex-col items-center" : "mt-6 flex w-full flex-col items-center gap-6"}
          >
            {!isPersistentDuo && (
              <div className="glass-panel room-panel w-full rounded-xl3 p-5 text-center">
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
                {error && <p className="mt-2 text-sm text-rose-deep">{error}</p>}
              </div>
            )}

            {isPersistentDuo && !showMinigames ? (
              <div className="w-full">
                <div className="relative h-[clamp(30rem,62dvh,38rem)] w-full overflow-hidden md:h-[clamp(34rem,82dvh,46rem)]">
                  <PersistentDuoLobbyScene
                    onWorldClick={() => {
                      setLobbyNotice(null);
                      router.push("/mundo");
                    }}
                    onMinigamesClick={() => {
                      setLobbyNotice(null);
                      setShowMinigames(true);
                    }}
                  />

                  <section
                    className="pointer-events-none absolute inset-x-0 top-[5.5rem] z-30 px-4 text-center"
                    aria-label="Informações do lobby"
                  >
                    <div className="pointer-events-auto mx-auto w-full max-w-sm">
                      {editingLobbyName ? (
                        <form
                          className="mx-auto flex w-full flex-col gap-2"
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
                            className="w-full rounded-full border border-[#ff86b8]/55 bg-black/35 px-4 py-2.5 text-center font-display text-xl font-bold text-white shadow-[0_0_18px_rgba(255,91,160,0.28)] outline-none backdrop-blur-md ring-[#ff6da8]/45 placeholder:text-white/60 focus:ring-2"
                          />
                          <div className="flex justify-center gap-2">
                            <button type="submit" className="inline-flex min-h-9 items-center gap-1 rounded-full bg-rose px-3 text-xs font-semibold text-white shadow-soft transition-opacity hover:opacity-90">
                              <Check size={14} /> Salvar
                            </button>
                            <button type="button" onClick={cancelLobbyNameEdit} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-white/15 bg-black/30 px-3 text-xs font-semibold text-white/90 backdrop-blur-md">
                              <X size={14} /> Cancelar
                            </button>
                          </div>
                          {lobbyNameError && (
                            <p className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-rose-200 backdrop-blur-md" role="alert">
                              {lobbyNameError}
                            </p>
                          )}
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center justify-center gap-2.5">
                            <Heart
                              size={18}
                              className="shrink-0 text-[#ff5fa2] drop-shadow-[0_0_8px_rgba(255,95,162,0.95)]"
                              fill="currentColor"
                              aria-hidden="true"
                            />
                            <h1 className="min-w-0 break-words font-display text-[1.7rem] font-extrabold leading-none tracking-[-0.025em] text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)] sm:text-3xl">
                              {lobbyDisplayName}
                            </h1>
                            <Heart
                              size={18}
                              className="shrink-0 text-[#ff5fa2] drop-shadow-[0_0_8px_rgba(255,95,162,0.95)]"
                              fill="currentColor"
                              aria-hidden="true"
                            />
                            <button
                              type="button"
                              onClick={beginLobbyNameEdit}
                              aria-label="Editar nome do lobby"
                              className="ml-0.5 shrink-0 rounded-full bg-black/20 p-1.5 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/35 hover:text-white"
                            >
                              <Pencil size={15} />
                            </button>
                          </div>
                          <p
                            className="mx-auto mt-2 max-w-sm text-[1.15rem] font-semibold leading-tight tracking-[0.01em] text-[#ff9ac7]"
                            style={{
                              fontFamily: "var(--font-handwriting), cursive",
                              textShadow: "0 0 10px rgba(255, 91, 160, 0.85), 0 2px 4px rgba(0, 0, 0, 0.82)",
                            }}
                          >
                            O cantinho compartilhado de vocês, sempre no mesmo lugar.
                          </p>
                        </>
                      )}
                    </div>
                  </section>

                  {(error || lobbyNotice) && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-[10.8rem] z-30 px-4">
                      <p
                        className="pointer-events-auto mx-auto max-w-sm rounded-xl2 border border-white/15 bg-black/45 px-4 py-3 text-center text-sm font-semibold text-white shadow-soft backdrop-blur-md"
                        role={error ? "alert" : "status"}
                      >
                        {error ?? lobbyNotice}
                      </p>
                    </div>
                  )}

                </div>

                <PetLobbyArea roomCode={room.code} />

                <div className="relative z-20 mx-auto w-full max-w-md px-4 pt-2 sm:max-w-2xl">
                  <DuoTogetherTimeBadge />
                  <div className="mt-3">
                    <PersistentDuoStatus presence={persistentPresence} />
                  </div>
                </div>

                <div className="relative z-20 mx-auto w-full max-w-md px-4 pb-12 pt-3 sm:max-w-2xl">
                  <SharedDrawingBoard />
                </div>
              </div>
            ) : isHost ? (
              <div
                className={
                  isPersistentDuo && minigamesLayout === "visual"
                    ? "w-full"
                    : isPersistentDuo
                      ? "mx-auto w-full max-w-md px-4 pb-12 pt-28 sm:max-w-3xl"
                      : "w-full"
                }
              >
                {isPersistentDuo && minigamesLayout === "visual" ? (
                  <PersistentDuoMinigamesScene
                    presence={persistentPresence}
                    onSelectGame={selectGame}
                    onRandomGame={handleRandomGame}
                    onShowClassic={() => setMinigamesLayout("classic")}
                  />
                ) : (
                  <>
                    {isPersistentDuo && (
                      <div className="mb-5 w-full">
                        <PersistentDuoStatus presence={persistentPresence} />
                      </div>
                    )}
                    <GameSearch value={search} onChange={setSearch} />
                    <GameCatalogActions
                      onRandom={handleRandomGame}
                      onToggleSuggestion={() => setSuggestionOpen((open) => !open)}
                      suggestionOpen={suggestionOpen}
                    />
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

                    {isPersistentDuo && (
                      <div className="mt-8 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setMinigamesLayout("visual")}
                          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rose/35 bg-surface/75 px-5 font-display text-sm font-semibold text-ink shadow-soft backdrop-blur-md transition-transform active:scale-95"
                        >
                          <Heart size={16} className="text-rose-deep" fill="currentColor" />
                          Ver sala ilustrada
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-center text-sm text-ink-soft">Aguardando o anfitrião escolher o jogo...</p>
            )}

          </motion.div>
        ) : isPersistentDuo ? (
          <motion.div
            key="persistent-config"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            className="relative z-10 w-full"
          >
            <div
              className="pointer-events-none min-h-[100dvh] w-full bg-[#150c1b] bg-cover bg-top bg-no-repeat"
              style={{ backgroundImage: 'url("/images/lobby-background-minigames.jpg")' }}
              aria-hidden="true"
            />

            <motion.div
              className="fixed inset-0 z-40 bg-[#100813]/62"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              aria-hidden="true"
            />

            <motion.section
              layoutId={game ? "minigame-config-" + game.id : undefined}
              transition={{ type: "spring", stiffness: 340, damping: 36, mass: 0.72 }}
              className="fixed bottom-3 left-3 right-3 top-20 z-[45] mx-auto max-w-[640px] overflow-hidden rounded-[30px] border border-rose/30 bg-surface text-center shadow-[0_18px_46px_rgba(0,0,0,0.38)] transform-gpu will-change-transform [contain:layout_paint]"
              aria-label={game ? `Configuração de ${game.name}` : "Configuração do jogo"}
            >
              <motion.div
                className="h-full overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-7"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.06, duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => isHost && backToGameSelect()}
                    disabled={!isHost}
                    className="flex min-h-10 items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-ink disabled:opacity-40"
                  >
                    <ArrowLeft size={15} /> Trocar jogo
                  </button>
                  <span className="text-3xl drop-shadow-sm">{game?.emoji}</span>
                </div>

                <h1 className="mt-2 font-display text-2xl font-bold text-ink">{game?.name}</h1>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-soft">
                  Os dois podem ajustar as opções e iniciar a partida.
                </p>

                <div className="mt-5">
                  <PersistentDuoStatus presence={persistentPresence} />
                </div>

                <div className="mt-3">
                  <GameConfigPanel
                    room={room}
                    isHost={isHost}
                    selfId={selfId}
                    setConfig={setConfig}
                    setBoardRacePawnColor={setBoardRacePawnColor}
                  />
                </div>

                <Button onClick={handleStart} disabled={!bothConnected} className="mt-6 w-full">
                  {bothConnected ? "Iniciar partida" : "Aguardando seu par"}
                </Button>

                {!bothConnected && (
                  <p className="mt-2 text-xs text-ink-soft">
                    {persistentAvailabilityMessage}
                  </p>
                )}

                {error && <p className="mt-4 text-sm text-rose-deep">{error}</p>}
              </motion.div>
            </motion.section>
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
              {`Envie o código ${room.code} para seu par entrar — ou jogue sozinho.`}
            </p>

            <ConnectionThread
              players={room.players}
              maxPlayers={room.maxPlayers}
              selfId={selfId}
              isHost={isHost}
              onKick={kickPlayer}
              onViewProfile={handleViewProfile}
            />

            <div className="mt-2">
              <GameConfigPanel room={room} isHost={isHost} selfId={selfId} setConfig={setConfig} setBoardRacePawnColor={setBoardRacePawnColor} />
            </div>

            {isHost ? (
              <>
                <Button onClick={handleStart} disabled={requiresPair && !bothConnected} className="mt-6 w-full">
                  {bothConnected ? "Iniciar partida" : requiresPair ? "Aguardando seu par" : "Jogar sozinho"}
                </Button>
                {!bothConnected && (
                  <p className="mt-2 text-xs text-ink-soft">
                    {requiresPair ? pairRequirementMessage : "Ainda esperando seu par entrar — ou comece agora e jogue sozinho."}
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
