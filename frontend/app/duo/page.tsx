"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import { useRoom } from "@/hooks/useRoom";
import { ActiveAccount, getActiveAccount } from "@/lib/accountSession";

function DuoEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCode = searchParams.get("code") || "";

  const { error, loading, createRoom, joinRoom, joinPersistentDuoRoom } = useRoom();
  const [screen, setScreen] = useState<"choose" | "join">(prefillCode ? "join" : "choose");
  const [name, setName] = useState("");
  const [code, setCode] = useState(prefillCode);
  const [account, setAccount] = useState<ActiveAccount | null | undefined>(undefined);
  const persistentJoinStarted = useRef(false);

  useEffect(() => {
    const active = getActiveAccount();
    setAccount(active);
    if (active?.type !== "account" || persistentJoinStarted.current) return;
    persistentJoinStarted.current = true;
    void joinPersistentDuoRoom(active.id).then((res) => {
      if (res.ok && res.room) router.replace(`/sala/${res.room.code}`);
    });
  }, [joinPersistentDuoRoom, router]);

  const handleCreate = async () => {
    const res = await createRoom("duo", name);
    if (res.ok && res.room) router.push(`/sala/${res.room.code}`);
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    const res = await joinRoom(code, name);
    if (res.ok && res.room) router.push(`/sala/${res.room.code}`);
  };

  if (account === undefined) return null;

  if (account?.type === "account") {
    return (
      <main className="duo-shell app-shell mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-14 text-center">
        <Logo size={48} />
        <div className="glass-panel mt-7 w-full rounded-xl3 p-7">
          <span className="text-3xl">💞</span>
          <h1 className="mt-3 font-display text-xl font-semibold text-ink">Entrando no lobby de vocês</h1>
          <p className="mt-2 text-sm text-ink-soft">Conectando você à sala compartilhada de André e Flávia...</p>
          {error && <p className="mt-4 text-sm text-rose-deep">{error}</p>}
          {error && <Button onClick={() => router.push("/")} variant="secondary" className="mt-5 w-full">Voltar</Button>}
        </div>
      </main>
    );
  }

  return (
    <main className="duo-shell app-shell mx-auto flex min-h-screen max-w-md flex-col items-center px-5 py-14">
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

      <AnimatePresence mode="wait">
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4 }}
          className="glass-panel mt-8 w-full rounded-xl3 p-6"
        >
          <div className="mb-5 text-center">
            <span className="text-3xl">💞</span>
            <h1 className="mt-2 font-display text-xl font-semibold text-ink">Jogar em Duo</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Crie a sala e envie o código pro seu par — ou entre com um código que já recebeu.
            </p>
          </div>

          <label className="text-sm font-medium text-ink">Seu nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como podemos te chamar?"
            className="mt-2 w-full rounded-full border border-surface/70 bg-surface/60 px-5 py-3 text-ink placeholder:text-ink-soft/70 outline-none focus:border-rose"
          />

          {screen === "choose" ? (
            <div className="mt-6 flex flex-col gap-3">
              <Button onClick={handleCreate} disabled={!name.trim() || loading} className="w-full">
                Criar uma sala nova
              </Button>
              <Button onClick={() => setScreen("join")} variant="secondary" className="w-full">
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
                className="w-full rounded-full border border-surface/70 bg-surface/60 px-5 py-3 text-center font-display tracking-[0.3em] text-ink placeholder:tracking-normal placeholder:text-ink-soft/70 outline-none focus:border-rose"
              />
              <Button onClick={handleJoin} disabled={!name.trim() || !code.trim() || loading} className="w-full">
                Entrar na sala
              </Button>
              <Button onClick={() => setScreen("choose")} variant="ghost" className="w-full">
                Voltar
              </Button>
            </div>
          )}

          {error && <p className="mt-4 text-center text-sm text-rose-deep">{error}</p>}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

export default function DuoEntryPage() {
  return (
    <Suspense fallback={null}>
      <DuoEntryContent />
    </Suspense>
  );
}
