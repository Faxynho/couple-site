"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AccountAvatar from "./AccountAvatar";
import AccountPanel from "./AccountPanel";
import { fetchAccounts } from "@/lib/accountApi";
import { AccountId, clearActiveAccount, getActiveAccount, subscribeToActiveAccountChange } from "@/lib/accountSession";
import { PublicAccountProfile } from "@/lib/accountTypes";
import { isPersistentDuoPath } from "@/lib/persistentDuo";

/**
 * Espelha o ThemeToggleGate: fica fixo no canto superior ESQUERDO (o direito
 * já é do botão de tema) em todo o site, menos nas telas de jogo (/game/...),
 * que usam esse canto para os próprios controles flutuantes. Só aparece para
 * quem está com uma conta fixa ativa — Visitante não tem perfil pra abrir.
 */
export default function AccountPanelGate() {
  const pathname = usePathname();
  const router = useRouter();
  const isGameScreen = pathname?.startsWith("/game/") || pathname === "/mundo" || pathname?.startsWith("/pets") || pathname?.startsWith("/cantinho");
  // O lobby persistente tem o próprio card do jogador no topo (PersistentDuoStatus).
  const hasOwnPlayerCard = isPersistentDuoPath(pathname);

  const [accountId, setAccountId] = useState<AccountId | null>(null);
  const [profile, setProfile] = useState<PublicAccountProfile | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(() => {
    const active = getActiveAccount();
    if (active?.type !== "account") {
      setAccountId(null);
      setProfile(null);
      return;
    }
    setAccountId(active.id);
    fetchAccounts()
      .then((accounts) => {
        const found = accounts.find((a) => a.id === active.id);
        if (found) setProfile(found);
      })
      .catch(() => {
        // Servidor fora do ar: mantém o botão escondido em vez de mostrar
        // dado incompleto — a próxima mudança de conta tenta de novo.
        setProfile(null);
      });
  }, []);

  useEffect(() => {
    refresh();
    return subscribeToActiveAccountChange(refresh);
  }, [refresh]);

  if (isGameScreen || hasOwnPlayerCard || !accountId || !profile) return null;

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Abrir minha conta"
        title="Minha conta"
        className="account-control glass-panel fixed left-4 top-4 z-50 flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-ink shadow-soft"
      >
        <AccountAvatar name={profile.name} photo={profile.photo} accountId={accountId} size={32} />
        <span className="hidden font-display text-sm font-medium sm:inline">{profile.name}</span>
      </motion.button>

      {open && (
        <AccountPanel
          accountId={accountId}
          profile={profile}
          onClose={() => setOpen(false)}
          onProfileUpdated={(updated) => setProfile(updated)}
          onSwitchAccount={() => {
            clearActiveAccount();
            setOpen(false);
            router.push("/");
          }}
        />
      )}
    </>
  );
}
