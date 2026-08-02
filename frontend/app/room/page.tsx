"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import ConnectionThread from "@/components/ConnectionThread";
import { useRoom } from "@/hooks/useRoom";
import { GameId } from "@/lib/types";

function RoomLobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = (searchParams.get("game") as GameId) || "puzzle";
  const prefillCode = searchParams.get("code") || "";

  const { room, selfId, error, loading, createRoom, joinRoom, startGame } = useRoom();
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

  const bothConnected = room ? room.players.filter((p) => p.connected).length === room.maxPlayers : false;

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

            <Button onClick={() => startGame()} disabled={!bothConnected} className="mt-4 w-full">
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
