"use client";

import { ReactNode, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, ChevronRight, Palette, RotateCcw } from "lucide-react";
import {
  resetDuoParticipation,
  resetDuoSharedStats,
  resetRecords,
  resetSoloStats,
  resetTogetherRecords,
} from "@/lib/accountApi";
import { AccountsOverview } from "@/lib/accountTypes";
import { AccountId } from "@/lib/accountSession";
import {
  applyVisualTheme,
  getStoredVisualTheme,
  setStoredVisualTheme,
  VisualTheme,
} from "@/lib/theme";

interface SettingsTabProps {
  accountId: AccountId;
  overview: AccountsOverview | null;
  /** Chamado depois de qualquer reset bem-sucedido, pra Estatísticas e
   *  Recordes buscarem os dados de novo e não ficarem mostrando número velho. */
  onChanged: () => void;
}

const ACCOUNT_ORDER = ["andre", "flavia"] as const;
type SettingsView = "menu" | "themes" | "reset";

const THEME_OPTIONS: { id: VisualTheme; name: string; description: string; swatchClass: string }[] = [
  { id: "default", name: "Tema padrão", description: "O visual original do site.", swatchClass: "theme-swatch-default" },
  { id: "romance", name: "Corações", description: "Rosa suave, lilás e vidro brilhante.", swatchClass: "theme-swatch-romance" },
];

/**
 * Menu de preferências das contas fixas. A seleção visual é local ao aparelho;
 * o reset existente segue exclusivo do ID estável "andre".
 */
export default function SettingsTab({ accountId, overview, onChanged }: SettingsTabProps) {
  const [view, setView] = useState<SettingsView>("menu");

  if (view === "themes") {
    return <SettingsPage title="Temas" onBack={() => setView("menu")}><ThemeSelector /></SettingsPage>;
  }

  if (view === "reset" && accountId === "andre") {
    return <SettingsPage title="Resetar estatísticas e recordes" onBack={() => setView("menu")}><ResetSettings overview={overview} onChanged={onChanged} /></SettingsPage>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="mb-1 text-sm text-ink-soft">Personalize sua experiência neste aparelho.</p>
      <SettingsOption
        icon={Palette}
        title="Temas"
        description="Escolha a identidade visual do site."
        onClick={() => setView("themes")}
      />
      {accountId === "andre" && (
        <SettingsOption
          icon={RotateCcw}
          title="Resetar estatísticas e recordes"
          description="Acesse os controles de correção dos dados salvos."
          onClick={() => setView("reset")}
          danger
        />
      )}
    </div>
  );
}

function SettingsPage({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-5 flex items-center gap-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink">
        <ArrowLeft size={16} /> Configurações
      </button>
      <h2 className="mb-4 font-display text-xl font-semibold text-ink">{title}</h2>
      {children}
    </div>
  );
}

function SettingsOption({ icon: Icon, title, description, onClick, danger = false }: {
  icon: typeof Palette;
  title: string;
  description: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="settings-option flex w-full items-center gap-3 rounded-xl2 border border-surface/70 bg-surface/55 p-4 text-left transition hover:border-rose/35 hover:bg-surface/75"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? "bg-rose/15 text-rose-deep" : "bg-surface text-ink"}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-soft">{description}</span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-ink-soft" />
    </button>
  );
}

function ThemeSelector() {
  const [selected, setSelected] = useState<VisualTheme>("default");

  useEffect(() => {
    setSelected(getStoredVisualTheme());
  }, []);

  const choose = (theme: VisualTheme) => {
    applyVisualTheme(theme);
    setStoredVisualTheme(theme);
    setSelected(theme);
  };

  return (
    <div>
      <p className="mb-4 text-sm text-ink-soft">O modo claro ou escuro continua independente desta escolha.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_OPTIONS.map((theme) => {
          const active = selected === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => choose(theme.id)}
              aria-pressed={active}
              className={`theme-choice relative overflow-hidden rounded-xl2 border p-4 text-left transition ${active ? "border-rose bg-rose/10 shadow-glow" : "border-surface/75 bg-surface/55 hover:border-rose/40"}`}
            >
              <span className={`theme-swatch ${theme.swatchClass} mb-4 block h-20 rounded-xl border border-white/40`} aria-hidden="true" />
              <span className="block pr-7 font-display text-sm font-semibold text-ink">{theme.name}</span>
              <span className="mt-1 block text-xs text-ink-soft">{theme.description}</span>
              {active && <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-rose text-white"><Check size={14} strokeWidth={3} /></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Interface de reset original. Cada botão continua chamando exatamente as
 * mesmas funções e nunca apaga mais de uma categoria por vez.
 */
function ResetSettings({ overview, onChanged }: Pick<SettingsTabProps, "overview" | "onChanged">) {
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
