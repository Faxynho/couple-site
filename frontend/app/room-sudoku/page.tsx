"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import ConnectionThread from "@/components/ConnectionThread";
import { useRoom } from "@/hooks/useRoom";
import { SUDOKU_DIFFICULTIES, SudokuDifficulty } from "@/lib/sudokuTypes";

export default function SudokuLobbyPage() {
  const router = useRouter();
  const { room, selfId, error, loading, createRoom, joinRoom, startGame, setConfig } = useRoom();

  const [mode, setMode] = useState<"choose" | "join">("choose");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (room?.status === "playing") {
      router.push(`/game/${room.gameId}/${room.code}`);
    }
  }, [room, router]);

  const handleCreate = async () => {
    await createRoom("sudoku", name);
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    await joinRoom(code, name);
  };

  const isHost = Boolean(room && selfId && room.hostId === selfId);
  const bothConnected = room ? room.players.filter((p) => p.connected).length === room.maxPlayers : false;
  const selectedDifficulty = (room?.pendingDifficulty as SudokuDifficulty) ?? "medium";

  const handleSelectDifficulty = (key: SudokuDifficulty) => {
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
            <div className="mb-5 text-center">
              <span className="text-3xl">🔢</span>
              <h1 className="mt-2 font-display text-xl font-semibold text-ink">Sudoku</h1>
              <p className="mt-1 text-sm text-ink-soft">Clássico 9x9 — sozinho ou com um amigo.</p>
            </div>

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
            <p className="mt-1 text-xs text-ink-soft">Envie esse código para seu par entrar — ou jogue sozinho.</p>

            <ConnectionThread players={room.players} maxPlayers={room.maxPlayers} selfId={selfId} />

            <div className="mt-2 text-left">
              <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">
                {isHost ? "Dificuldade" : "Dificuldade escolhida pelo anfitrião"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(SUDOKU_DIFFICULTIES) as [SudokuDifficulty, (typeof SUDOKU_DIFFICULTIES)[SudokuDifficulty]][]).map(
                  ([key, info]) => {
                    const isSelected = selectedDifficulty === key;
                    return (
                      <button
                        key={key}
                        disabled={!isHost}
                        onClick={() => handleSelectDifficulty(key)}
                        className={`flex flex-col items-center gap-1 rounded-xl2 border px-2 py-2.5 transition-colors ${
                          isSelected ? "border-rose bg-rose/10 text-ink" : "border-white/70 bg-white/50 text-ink-soft"
                        } ${isHost ? "hover:bg-white/70" : "cursor-default opacity-90"}`}
                      >
                        <span className="text-lg leading-none">{info.emoji}</span>
                        <span className="text-xs font-medium">{info.label}</span>
                        <span className="text-center text-[10px] text-ink-soft">{info.hint}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {isHost ? (
              <>
                <Button onClick={() => startGame()} className="mt-6 w-full">
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
    </main>
  );
}
