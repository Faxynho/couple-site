"use client";

import { ReactNode, useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import {
  resetDuoParticipation,
  resetDuoSharedStats,
  resetRecords,
  resetSoloStats,
  resetTogetherRecords,
} from "@/lib/accountApi";
import { AccountsOverview } from "@/lib/accountTypes";

interface SettingsTabProps {
  overview: AccountsOverview | null;
  /** Chamado depois de qualquer reset bem-sucedido, pra Estatísticas e
   *  Recordes buscarem os dados de novo e não ficarem mostrando número velho. */
  onChanged: () => void;
}

const ACCOUNT_ORDER = ["andre", "flavia"] as const;

/**
 * Só é renderizada pelo AccountPanel quando a conta ativa é "andre" — ver
 * comentário em accountsRoutes.ts sobre o backend também conferir isso.
 * Cada botão reseta UMA categoria (estatística solo de uma conta, estatística
 * duo da dupla, duelos de uma conta, ou recordes solo/duo de uma conta) —
 * nunca tudo de uma vez, pra dar pra corrigir só a parte que bugou.
 */
export default function SettingsTab({ overview, onChanged }: SettingsTabProps) {
  const nameOf = (id: (typeof ACCOUNT_ORDER)[number]) => overview?.profiles[id]?.name ?? id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-2 rounded-xl2 bg-rose/10 p-3 text-xs text-ink-soft">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-deep" />
        <p>
          Essas ações apagam dados salvos e não podem ser desfeitas. Use só se algo tiver bugado —
          no dia a dia não precisa mexer aqui. Clique uma vez para selecionar e de novo para confirmar.
        </p>
      </div>

      <Section title="Estatísticas Solo">
        {ACCOUNT_ORDER.map((id) => (
          <ResetRow key={id} label={nameOf(id)} onConfirm={() => resetSoloStats(id, "andre").then(onChanged)} />
        ))}
      </Section>

      <Section title="Estatísticas Duo (da dupla)">
        <ResetRow
          label="Partidas juntos, duelos jogados e tempo"
          onConfirm={() => resetDuoSharedStats("andre").then(onChanged)}
        />
      </Section>

      <Section title="Duelos por conta (vitórias, derrotas e empates)">
        {ACCOUNT_ORDER.map((id) => (
          <ResetRow key={id} label={nameOf(id)} onConfirm={() => resetDuoParticipation(id, "andre").then(onChanged)} />
        ))}
      </Section>

      <Section title="Recordes Solo">
        {ACCOUNT_ORDER.map((id) => (
          <ResetRow key={id} label={nameOf(id)} onConfirm={() => resetRecords(id, "solo", "andre").then(onChanged)} />
        ))}
      </Section>

      <Section title="Recordes Duo">
        {ACCOUNT_ORDER.map((id) => (
          <ResetRow key={id} label={nameOf(id)} onConfirm={() => resetRecords(id, "duo", "andre").then(onChanged)} />
        ))}
      </Section>

      <Section title="Recordes Juntos (da dupla)">
        <ResetRow label="Melhores marcas cooperativas" onConfirm={() => resetTogetherRecords("andre").then(onChanged)} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </section>
  );
}

function ResetRow({ label, onConfirm }: { label: string; onConfirm: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível resetar agora.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl2 bg-surface/60 px-4 py-2.5">
      <span className="text-sm text-ink">{label}</span>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-rose-deep">{error}</span>}
        <button
          type="button"
          onClick={handleClick}
          onBlur={() => setConfirming(false)}
          disabled={busy}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
            confirming ? "bg-rose-deep text-white" : "bg-surface text-ink-soft hover:text-ink"
          }`}
        >
          <RotateCcw size={13} />
          {busy ? "Resetando..." : confirming ? "Confirmar?" : "Resetar"}
        </button>
      </div>
    </div>
  );
}
