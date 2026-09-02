"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";
import AccountGate from "@/components/account/AccountGate";
import { getStoredRoomCode } from "@/lib/roomSession";
import { ActiveAccount, clearActiveAccount, getActiveAccount, subscribeToActiveAccountChange } from "@/lib/accountSession";

const KICK_MESSAGES: Record<string, string> = {
  expulso: "Você foi removido da sala pelo anfitrião.",
};

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notice = searchParams.get("aviso");
  const [storedRoomCode, setStoredRoomCode] = useState<string | null>(null);
  // `undefined` enquanto ainda não checamos o navegador (evita mostrar a
  // tela errada por uma fração de segundo); `null` = ninguém escolhido ainda.
  const [account, setAccount] = useState<ActiveAccount | null | undefined>(undefined);

  useEffect(() => {
    setStoredRoomCode(getStoredRoomCode());
    setAccount(getActiveAccount());
    // Cobre o caso de "Trocar de conta" ser clicado com o painel aberto
    // enquanto já se está em "/" — nesse caso não há troca de rota para
    // remontar este componente, então escutamos a mudança diretamente.
    return subscribeToActiveAccountChange(() => setAccount(getActiveAccount()));
  }, []);

  if (account === undefined) return null;
  if (account === null) return <AccountGate onSelected={setAccount} />;

  return (
    <main className="home-shell app-shell mx-auto flex min-h-screen max-w-3xl flex-col items-center px-5 py-14 sm:py-20">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Logo size={52} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 text-center font-display text-3xl font-semibold text-ink sm:text-4xl"
      >
        Uma salinha só nossa
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-3 max-w-md text-center text-ink-soft"
      >
        Jogos para vocês dois jogarem juntos, em tempo real, onde quer que estejam — ou pra jogar sozinho, no seu ritmo.
      </motion.p>

      {notice && KICK_MESSAGES[notice] && (
        <p className="mt-6 rounded-full bg-rose/10 px-5 py-2 text-center text-sm text-rose-deep">
          {KICK_MESSAGES[notice]}
        </p>
      )}

      <div className="mt-12 grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -6 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/duo")}
          className="glass-panel flex flex-col items-center gap-3 rounded-xl3 p-8 text-center transition-shadow hover:shadow-glow"
        >
          <span className="text-4xl">💞</span>
          <h2 className="font-display text-xl font-semibold text-ink">Jogar em Duo</h2>
          <p className="text-sm text-ink-soft">
            Crie uma sala, chame seu par com um código e escolham juntos o que jogar.
          </p>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -6 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/solo")}
          className="glass-panel flex flex-col items-center gap-3 rounded-xl3 p-8 text-center transition-shadow hover:shadow-glow"
        >
          <span className="text-4xl">🙋</span>
          <h2 className="font-display text-xl font-semibold text-ink">Jogar Solo</h2>
          <p className="text-sm text-ink-soft">Escolha um jogo e comece na hora, no seu próprio ritmo.</p>
        </motion.button>
      </div>

      {storedRoomCode && (
        <button
          onClick={() => router.push(`/sala/${storedRoomCode}`)}
          className="mt-8 text-sm font-medium text-ink-soft underline decoration-dotted underline-offset-4 transition-colors hover:text-ink"
        >
          Voltar para sua sala ({storedRoomCode})
        </button>
      )}

      <button
        onClick={() => {
          clearActiveAccount();
          setAccount(null);
        }}
        className="mt-4 text-sm font-medium text-ink-soft underline decoration-dotted underline-offset-4 transition-colors hover:text-ink"
      >
        Trocar de conta
      </button>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
