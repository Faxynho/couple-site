"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import AccountAvatar from "@/components/account/AccountAvatar";
import { useRoom } from "@/hooks/useRoom";
import { fetchAccounts } from "@/lib/accountApi";
import { ActiveAccount, getActiveAccount } from "@/lib/accountSession";

function DuoEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCode = searchParams.get("code") || "";

  const { error, loading, createRoom, joinRoom } = useRoom();
  const [screen, setScreen] = useState<"choose" | "join">(prefillCode ? "join" : "choose");
  const [name, setName] = useState("");
  const [code, setCode] = useState(prefillCode);
  const [account, setAccount] = useState<ActiveAccount | null>(null);

  // Com uma conta fixa selecionada, o nome já é conhecido — busca o nome
  // (e a foto) atuais da conta em vez de pedir de novo, como pedia antes.
  useEffect(() => {
    const active = getActiveAccount();
    setAccount(active);
    if (active?.type === "account") {
      fetchAccounts()
        .then((accounts) => {
          const found = accounts.find((a) => a.id === active.id);
          if (found) setName(found.name);
        })
        .catch(() => {});
    }
  }, []);

  const handleCreate = async () => {
    const res = await createRoom("duo", name);
    if (res.ok && res.room) router.push(`/sala/${res.room.code}`);
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    const res = await joinRoom(code, name);
    if (res.ok && res.room) router.push(`/sala/${res.room.code}`);
  };

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

          <label className="text-sm font-medium text-ink">{account?.type === "account" ? "Sua conta" : "Seu nome"}</label>
          {account?.type === "account" ? (
            <div className="mt-2 flex items-center gap-3 rounded-full border border-surface/70 bg-surface/60 px-4 py-2.5">
              <AccountAvatar name={name || "?"} accountId={account.id} size={30} />
              <span className="text-sm font-medium text-ink">Jogando como {name || "..."}</span>
            </div>
          ) : (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como podemos te chamar?"
              className="mt-2 w-full rounded-full border border-surface/70 bg-surface/60 px-5 py-3 text-ink placeholder:text-ink-soft/70 outline-none focus:border-rose"
            />
          )}

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
