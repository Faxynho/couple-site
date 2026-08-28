"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";
import AccountAvatar from "./AccountAvatar";
import { fetchAccounts } from "@/lib/accountApi";
import { ActiveAccount, setActiveAccount } from "@/lib/accountSession";
import { PublicAccountProfile } from "@/lib/accountTypes";

interface AccountGateProps {
  onSelected: (account: ActiveAccount) => void;
}

/**
 * Primeira coisa que a pessoa vê ao abrir o site (antes até da escolha entre
 * Duo e Solo): decide QUEM está jogando agora. As duas contas fixas guardam
 * estatísticas e recordes entre visitas; Visitante segue o fluxo antigo (só
 * pede um nome, mais adiante, na criação da sala) e nunca grava nada.
 */
export default function AccountGate({ onSelected }: AccountGateProps) {
  const [accounts, setAccounts] = useState<PublicAccountProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchAccounts()
      .then((data) => {
        if (alive) setAccounts(data);
      })
      .catch(() => {
        if (alive) setError("Não foi possível falar com o servidor. Confira se o backend está rodando.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const choose = (account: ActiveAccount) => {
    setPendingId(account.type === "account" ? account.id : "visitor");
    setActiveAccount(account);
    onSelected(account);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-5 py-14 sm:py-20">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Logo size={52} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 text-center font-display text-3xl font-semibold text-ink sm:text-4xl"
      >
        Quem vai jogar?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-3 max-w-md text-center text-ink-soft"
      >
        Entre com uma conta fixa para guardar suas estatísticas e recordes, ou jogue como visitante.
      </motion.p>

      {error && (
        <p className="mt-6 rounded-full bg-rose/10 px-5 py-2 text-center text-sm text-rose-deep">{error}</p>
      )}

      <div className="mt-12 grid w-full grid-cols-1 gap-5 sm:grid-cols-3">
        {(accounts ?? []).map((account, index) => (
          <motion.button
            key={account.id}
            type="button"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.98 }}
            disabled={pendingId !== null}
            onClick={() => choose({ type: "account", id: account.id })}
            className="glass-panel flex flex-col items-center gap-3 rounded-xl3 p-8 text-center transition-shadow hover:shadow-glow disabled:opacity-60"
          >
            <AccountAvatar name={account.name} photo={account.photo} accountId={account.id} size={64} />
            <h2 className="font-display text-lg font-semibold text-ink">{account.name}</h2>
            <p className="text-sm text-ink-soft">Entrar com esta conta</p>
          </motion.button>
        ))}

        {!accounts && !error && (
          <>
            <div className="glass-panel h-[172px] animate-pulse rounded-xl3" />
            <div className="glass-panel h-[172px] animate-pulse rounded-xl3" />
          </>
        )}

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -6 }}
          whileTap={{ scale: 0.98 }}
          disabled={pendingId !== null}
          onClick={() => choose({ type: "visitor" })}
          className="glass-panel flex flex-col items-center gap-3 rounded-xl3 p-8 text-center transition-shadow hover:shadow-glow disabled:opacity-60"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface/60 text-3xl">🙈</span>
          <h2 className="font-display text-lg font-semibold text-ink">Visitante</h2>
          <p className="text-sm text-ink-soft">Escolhe um nome na hora de jogar</p>
        </motion.button>
      </div>
    </main>
  );
}
