"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import ConnectionThread from "@/components/ConnectionThread";
import ImagePicker from "@/components/ImagePicker";
import { useRoom } from "@/hooks/useRoom";
import { usePuzzleImages, PuzzleImageOption } from "@/hooks/usePuzzleImages";
import { GameId } from "@/lib/types";
import { DIFFICULTIES, Difficulty } from "@/lib/games";

function RoomLobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = (searchParams.get("game") as GameId) || "puzzle";
  const prefillCode = searchParams.get("code") || "";

  const { room, selfId, error, loading, createRoom, joinRoom, startGame } = useRoom();
  const { images, loading: imagesLoading } = usePuzzleImages();

  const [step, setStep] = useState<"image" | "lobby">("image");
  const [selectedImage, setSelectedImage] = useState<PuzzleImageOption | null>(null);
  const [mode, setMode] = useState<"choose" | "join">(prefillCode ? "join" : "choose");
  const [name, setName] = useState("");
  const [code, setCode] = useState(prefillCode);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

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

  const handleStart = async () => {
    if (!selectedImage) return;
    await startGame({
      difficulty,
      imageId: selectedImage.file,
      imageWidth: selectedImage.width,
      imageHeight: selectedImage.height,
    });
  };

  const bothConnected = room ? room.players.filter((p) => p.connected).length === room.maxPlayers : false;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center px-5 py-14">
      <Logo size={44} />

      <AnimatePresence mode="wait">
        {step === "image" ? (
          <motion.div
            key="image"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="glass-panel mt-10 w-full rounded-xl3 p-6"
          >
            <h2 className="font-display text-lg font-semibold text-ink">Escolha a imagem</h2>
            <p className="mt-1 text-sm text-ink-soft">Qualquer imagem em <code>public/images/puzzle</code> aparece aqui.</p>

            <div className="mt-5">
              <ImagePicker images={images} loading={imagesLoading} selected={selectedImage} onSelect={setSelectedImage} />
            </div>

            <Button
              onClick={() => setStep("lobby")}
              disabled={!selectedImage}
              className="mt-6 w-full"
            >
              Continuar
            </Button>
          </motion.div>
        ) : !room ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="glass-panel mt-10 w-full rounded-xl3 p-6"
          >
            {selectedImage && (
              <button
                onClick={() => setStep("image")}
                className="mb-4 flex items-center gap-2 text-xs font-medium text-ink-soft hover:text-ink"
              >
                <img src={selectedImage.file} alt="" className="h-8 w-8 rounded-md object-cover" />
                Trocar imagem
              </button>
            )}

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

            <div className="mt-2">
              <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Dificuldade</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(DIFFICULTIES) as [Difficulty, (typeof DIFFICULTIES)[Difficulty]][]).map(
                  ([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setDifficulty(key)}
                      className={`flex flex-col items-center gap-1 rounded-xl2 border px-2 py-2.5 transition-colors ${
                        difficulty === key
                          ? "border-rose bg-rose/10 text-ink"
                          : "border-white/70 bg-white/50 text-ink-soft hover:bg-white/70"
                      }`}
                    >
                      <span className="text-lg leading-none">{info.emoji}</span>
                      <span className="text-xs font-medium">{info.label}</span>
                      <span className="text-[10px] text-ink-soft">~{info.targetPieces} peças</span>
                    </button>
                  )
                )}
              </div>
            </div>

            <Button onClick={handleStart} disabled={!bothConnected || !selectedImage} className="mt-4 w-full">
              {bothConnected ? "Começar" : "Esperando o par..."}
            </Button>

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