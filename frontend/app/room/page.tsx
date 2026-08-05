"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import ConnectionThread from "@/components/ConnectionThread";
import ImagePicker from "@/components/ImagePicker";
import { useRoom } from "@/hooks/useRoom";
import { usePuzzleImages } from "@/hooks/usePuzzleImages";
import { GameId } from "@/lib/types";
import { DIFFICULTIES, Difficulty } from "@/lib/games";

function RoomLobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = (searchParams.get("game") as GameId) || "puzzle";
  const prefillCode = searchParams.get("code") || "";

  const { room, selfId, error, loading, createRoom, joinRoom, startGame, setConfig } = useRoom();
  const { images, loading: imagesLoading } = usePuzzleImages();

  const [mode, setMode] = useState<"choose" | "join">(prefillCode ? "join" : "choose");
  const [name, setName] = useState("");
  const [code, setCode] = useState(prefillCode);

  useEffect(() => {
    if (room?.status === "playing") {
      router.push(`/game/${room.gameId}/${room.code}`);
    }
  }, [room, router]);

  const handleCreate = async () => {
    await createRoom(gameId, name);
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    await joinRoom(code, name);
  };

  const isHost = Boolean(room && selfId && room.hostId === selfId);
  const bothConnected = room ? room.players.filter((p) => p.connected).length === room.maxPlayers : false;
  const selectedImage = room ? images.find((img) => img.file === room.pendingImageId) ?? null : null;
  const selectedDifficulty = (room?.pendingDifficulty as Difficulty) ?? "medium";

  const handleSelectImage = (img: { file: string; width: number; height: number }) => {
    if (!isHost) return;
    setConfig({ imageId: img.file, imageWidth: img.width, imageHeight: img.height });
  };

  const handleSelectDifficulty = (key: Difficulty) => {
    if (!isHost) return;
    setConfig({ difficulty: key });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center px-5 py-14">
      <Logo size={44} />

      <AnimatePresence mode="wait">
        {!room ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="glass-panel mt-10 w-full rounded-xl3 p-6"
          >
            <label className="text-sm font-medium text-ink">Seu nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como podemos te chamar?"
              className="mt-2 w-full rounded-full border border-white/70 bg-white/60 px-5 py-3 text-ink placeholder:text-ink-soft/70 outline-none focus:border-rose"
            />

            {mode === "choose" ? (
              <div className="mt-6 flex flex-col gap-3">
                <Button onClick={handleCreate} disabled={!name.trim() || loading} className="w-full">
                  Criar uma sala nova
                </Button>
                <Button onClick={() => setMode("join")} variant="secondary" className="w-full">
                  Entrar com um código
                </Button>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Código da sala"
                  maxLength={5}
                  className="w-full rounded-full border border-white/70 bg-white/60 px-5 py-3 text-center font-display tracking-[0.3em] text-ink placeholder:tracking-normal placeholder:text-ink-soft/70 outline-none focus:border-rose"
                />
                <Button onClick={handleJoin} disabled={!name.trim() || !code.trim() || loading} className="w-full">
                  Entrar na sala
                </Button>
                <Button onClick={() => setMode("choose")} variant="ghost" className="w-full">
                  Voltar
                </Button>
              </div>
            )}

            {error && <p className="mt-4 text-center text-sm text-rose-deep">{error}</p>}
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-panel mt-10 w-full rounded-xl3 p-6 text-center"
          >
            <p className="text-sm text-ink-soft">Código da sala</p>
            <p className="font-display text-3xl font-semibold tracking-[0.3em] text-ink">{room.code}</p>
            <p className="mt-1 text-xs text-ink-soft">Envie esse código para seu par entrar na sala</p>

            <ConnectionThread players={room.players} maxPlayers={room.maxPlayers} selfId={selfId} />

            {isHost ? (
              <>
                <div className="mt-2 text-left">
                  <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Escolha a imagem</p>
                  <ImagePicker
                    images={images}
                    loading={imagesLoading}
                    selected={selectedImage}
                    onSelect={handleSelectImage}
                  />
                </div>

                <div className="mt-5 text-left">
                  <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Dificuldade</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(DIFFICULTIES) as [Difficulty, (typeof DIFFICULTIES)[Difficulty]][]).map(
                      ([key, info]) => {
                        const isSelected = selectedDifficulty === key;
                        return (
                          <button
                            key={key}
                            onClick={() => handleSelectDifficulty(key)}
                            className={`flex flex-col items-center gap-1 rounded-xl2 border px-2 py-2.5 transition-colors hover:bg-white/70 ${
                              isSelected
                                ? "border-rose bg-rose/10 text-ink"
                                : "border-white/70 bg-white/50 text-ink-soft"
                            }`}
                          >
                            <span className="text-lg leading-none">{info.emoji}</span>
                            <span className="text-xs font-medium">{info.label}</span>
                            <span className="text-[10px] text-ink-soft">~{info.targetPieces} peças</span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <Button onClick={() => startGame()} disabled={!selectedImage} className="mt-6 w-full">
                  {bothConnected ? "Iniciar partida" : "Jogar sozinho"}
                </Button>
                {!bothConnected && (
                  <p className="mt-2 text-xs text-ink-soft">
                    Ainda esperando seu par entrar — ou comece agora e jogue sozinho.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="mt-2 text-left">
                  <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Imagem escolhida pelo anfitrião</p>
                  <ImagePicker images={images} loading={imagesLoading} selected={selectedImage} onSelect={() => {}} readOnly />
                </div>

                <div className="mt-5 text-left">
                  <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Dificuldade escolhida pelo anfitrião</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(DIFFICULTIES) as [Difficulty, (typeof DIFFICULTIES)[Difficulty]][]).map(
                      ([key, info]) => {
                        const isSelected = selectedDifficulty === key;
                        return (
                          <div
                            key={key}
                            className={`flex flex-col items-center gap-1 rounded-xl2 border px-2 py-2.5 ${
                              isSelected
                                ? "border-rose bg-rose/10 text-ink"
                                : "border-white/70 bg-white/50 text-ink-soft opacity-90"
                            }`}
                          >
                            <span className="text-lg leading-none">{info.emoji}</span>
                            <span className="text-xs font-medium">{info.label}</span>
                            <span className="text-[10px] text-ink-soft">~{info.targetPieces} peças</span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                <p className="mt-6 text-sm text-ink-soft">Aguardando o anfitrião iniciar a partida...</p>
              </>
            )}

            {error && <p className="mt-4 text-sm text-rose-deep">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function RoomLobbyPage() {
  return (
    <Suspense fallback={null}>
      <RoomLobbyContent />
    </Suspense>
  );
}
