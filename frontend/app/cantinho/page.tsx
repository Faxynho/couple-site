"use client";

import Image from "next/image";
import { ChevronRight, FlaskConical, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import IdleHeader from "@/components/idle/IdleHeader";
import styles from "@/components/idle/IdleGame.module.css";
import { useIdleGame } from "@/hooks/useIdleGame";
import { addIdleTestFunds } from "@/lib/idleApi";
import { IdleModeId } from "@/lib/idleTypes";

export default function IdleChoicePage() {
  const router = useRouter();
  const { snapshot, error, loading, accountId, reload } = useIdleGame();
  const [developerOpen, setDeveloperOpen] = useState(false);

  if (loading) return <main className={styles.page}><div className={styles.loading}>Preparando o cantinho…</div></main>;

  return (
    <main className={styles.page}>
      <IdleHeader
        title={snapshot?.areaName ?? "Nosso Cantinho"}
        subtitle="Escolha para onde vocês querem ir hoje"
        coins={snapshot?.globalCoins ?? 0}
        onBack={() => router.push("/sala/PERSISTENT_DUO")}
      />
      <div className={styles.selection}>
        <div className={styles.choiceGrid}>
          <button type="button" className={styles.choiceCard} onClick={() => router.push("/cantinho/farm")}>
            <Image src="/idle/backgrounds/farm.webp" alt="" fill priority sizes="(max-width: 699px) 100vw, 50vw" />
            <span className={styles.choiceCopy}>
              <h2>Fazendinha ♥</h2>
              <p>Nosso cantinho produtivo</p>
              <span className={styles.enterButton}>Entrar <ChevronRight size={19} /></span>
            </span>
          </button>
          <button type="button" className={styles.choiceCard} onClick={() => router.push("/cantinho/kitty")}>
            <Image src="/idle/backgrounds/kitty-room.webp" alt="" fill priority sizes="(max-width: 699px) 100vw, 50vw" />
            <span className={styles.choiceCopy}>
              <h2>Mundo da Hello Kitty ♥</h2>
              <p>Um cantinho super fofo</p>
              <span className={styles.enterButton}>Entrar <ChevronRight size={19} /></span>
            </span>
          </button>
        </div>
        {accountId === "andre" && (
          <button type="button" className={styles.developerButton} onClick={() => setDeveloperOpen(true)}>
            <FlaskConical size={18} />
            <span><strong>Modo Desenvolvedor</strong><small>Adicionar saldos para testar a progressão</small></span>
            <ChevronRight size={18} />
          </button>
        )}
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {developerOpen && accountId === "andre" && <DeveloperPanel onClose={() => setDeveloperOpen(false)} onChanged={reload} />}
    </main>
  );
}

function DeveloperPanel({ onClose, onChanged }: { onClose: () => void; onChanged: () => Promise<void> }) {
  const [values, setValues] = useState<Record<"farm" | "kitty" | "global", string>>({ farm: "", kitty: "", global: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const rows: Array<{ id: "global" | IdleModeId; label: string; description: string }> = [
    { id: "farm", label: "Dinheiro da Fazendinha", description: "Saldo interno para produtores" },
    { id: "kitty", label: "Dinheiro Hello Kitty", description: "Saldo interno para personagens" },
    { id: "global", label: "Moeda global", description: "Saldo compartilhado do site" },
  ];
  const add = async (target: "global" | IdleModeId) => {
    const amount = Number(values[target]);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Digite um valor positivo válido.");
      return;
    }
    setBusy(target);
    setMessage(null);
    try {
      await addIdleTestFunds(target, amount, "andre");
      await onChanged();
      setValues((current) => ({ ...current, [target]: "" }));
      setMessage("Saldo adicionado com sucesso.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível adicionar o saldo.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className={styles.developerOverlay} role="dialog" aria-modal="true" aria-label="Modo Desenvolvedor">
      <section className={styles.developerPanel}>
        <button type="button" className={styles.developerClose} onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        <span className={styles.developerIcon}><FlaskConical size={25} /></span>
        <h2>Modo Desenvolvedor</h2>
        <p>Créditos de teste exclusivos da conta André.</p>
        <div className={styles.developerRows}>
          {rows.map((row) => (
            <div key={row.id} className={styles.developerRow}>
              <label htmlFor={`dev-${row.id}`}><strong>{row.label}</strong><small>{row.description}</small></label>
              <div><input id={`dev-${row.id}`} type="number" inputMode="decimal" min="1" placeholder="Ex.: 100000" value={values[row.id]} onChange={(event) => setValues((current) => ({ ...current, [row.id]: event.target.value }))} />
              <button type="button" disabled={Boolean(busy)} onClick={() => void add(row.id)}><Plus size={17} />{busy === row.id ? "..." : "Adicionar"}</button></div>
            </div>
          ))}
        </div>
        <div className={styles.quickAmounts}>{[1_000,1_000_000,1_000_000_000].map((amount) => <button key={amount} type="button" onClick={() => setValues({ farm: String(amount), kitty: String(amount), global: String(amount) })}>{amount === 1_000 ? "1K" : amount === 1_000_000 ? "1M" : "1B"} em todos</button>)}</div>
        {message && <p className={styles.developerMessage}>{message}</p>}
      </section>
    </div>
  );
}
