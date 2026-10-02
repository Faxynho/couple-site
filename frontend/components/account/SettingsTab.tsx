"use client";

import { ReactNode, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, ChevronRight, Moon, Palette, RotateCcw, ShieldAlert, Sparkles, Sun, Volume2, VolumeX } from "lucide-react";
import {
  resetDuoParticipation,
  resetDuoSharedStats,
  resetRecords,
  resetSoloStats,
  resetTogetherRecords,
} from "@/lib/accountApi";
import { resetIdle } from "@/lib/idleApi";
import { resetRealPetRooms } from "@/lib/petApi";
import { AccountsOverview } from "@/lib/accountTypes";
import { AccountId } from "@/lib/accountSession";
import { useSoundEnabled } from "@/hooks/useSoundEnabled";
import {
  applyTheme,
  applyVisualTheme,
  getCurrentTheme,
  getStoredVisualTheme,
  setStoredTheme,
  setStoredVisualTheme,
  subscribeTheme,
  Theme,
  VisualTheme,
} from "@/lib/theme";
import "./profile-card.css";

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
 * Menu de preferências das contas fixas, organizado em grupos: Aparência (modo
 * claro/escuro e temas), Som e — só para o ID estável "andre" — Administração
 * (reset). Tudo aqui é local ao aparelho, exceto o reset, que apaga dados salvos.
 */
export default function SettingsTab({ accountId, overview, onChanged }: SettingsTabProps) {
  const [view, setView] = useState<SettingsView>("menu");
  const [visualTheme, setVisualTheme] = useState<VisualTheme>("default");

  // Relê o tema ao voltar da tela de Temas, para o resumo da linha estar certo.
  useEffect(() => {
    if (view === "menu") setVisualTheme(getStoredVisualTheme());
  }, [view]);

  if (view === "themes") {
    return <SettingsPage title="Temas" onBack={() => setView("menu")}><ThemeSelector /></SettingsPage>;
  }

  if (view === "reset" && accountId === "andre") {
    return <SettingsPage title="Resetar estatísticas e recordes" onBack={() => setView("menu")}><ResetSettings overview={overview} onChanged={onChanged} /></SettingsPage>;
  }

  const currentThemeName = THEME_OPTIONS.find((theme) => theme.id === visualTheme)?.name ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-[color:var(--pc-text)]">Configurações</h2>
        <p className="mt-1 text-sm text-[color:var(--pc-text-soft)]">Personalize sua experiência neste aparelho.</p>
      </div>

      <SettingsGroup icon={Palette} title="Aparência">
        <ThemeModeRow />
        <SettingsLinkRow
          icon={Sparkles}
          title="Temas"
          description="Escolha a identidade visual do site."
          value={currentThemeName}
          onClick={() => setView("themes")}
        />
      </SettingsGroup>

      <SettingsGroup icon={Volume2} title="Som">
        <SoundRow />
      </SettingsGroup>

      {accountId === "andre" && (
        <SettingsGroup icon={ShieldAlert} title="Administração" danger>
          <SettingsLinkRow
            icon={RotateCcw}
            title="Resetar estatísticas e recordes"
            description="Acesse os controles de correção dos dados salvos."
            onClick={() => setView("reset")}
            danger
          />
        </SettingsGroup>
      )}
    </div>
  );
}

function SettingsPage({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-5 flex items-center gap-2 text-sm font-semibold text-[color:var(--pc-text-soft)] transition-colors hover:text-[color:var(--pc-text)]">
        <ArrowLeft size={16} /> Configurações
      </button>
      <h2 className="mb-4 font-display text-xl font-bold text-[color:var(--pc-text)]">{title}</h2>
      {children}
    </div>
  );
}

function SettingsGroup({ icon: Icon, title, danger = false, children }: {
  icon: typeof Palette;
  title: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="settings-group" data-tone={danger ? "danger" : undefined} aria-label={title}>
      <header className="settings-group-header">
        <span className="settings-group-icon" aria-hidden="true"><Icon size={15} /></span>
        {title}
      </header>
      {children}
    </section>
  );
}

function RowIcon({ icon: Icon, danger = false }: { icon: typeof Palette; danger?: boolean }) {
  return (
    <span className="settings-row-icon" data-tone={danger ? "danger" : undefined} aria-hidden="true">
      <Icon size={18} />
    </span>
  );
}

/** Linha que abre uma subtela (Temas, Reset). */
function SettingsLinkRow({ icon, title, description, value, onClick, danger = false }: {
  icon: typeof Palette;
  title: string;
  description: string;
  value?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className="settings-row">
      <RowIcon icon={icon} danger={danger} />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-bold">{title}</span>
        <span className="mt-0.5 block text-xs text-[color:var(--pc-text-soft)]">{description}</span>
      </span>
      {value && <span className="settings-row-value">{value}</span>}
      <ChevronRight size={17} className="shrink-0 text-[color:var(--pc-text-soft)]" aria-hidden="true" />
    </button>
  );
}

/** Claro / escuro: antes era o botão flutuante no canto superior direito. */
function ThemeModeRow() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const sync = () => setTheme(getCurrentTheme());
    sync();
    return subscribeTheme(sync);
  }, []);

  const choose = (next: Theme) => {
    applyTheme(next);
    setStoredTheme(next);
  };

  return (
    <div className="settings-row settings-row-wrap">
      <RowIcon icon={theme === "dark" ? Moon : Sun} />
      <div className="min-w-0 flex-1 basis-40">
        <p className="font-display text-sm font-bold">Modo de cor</p>
        <p className="mt-0.5 text-xs text-[color:var(--pc-text-soft)]">Claro ou escuro, independente do tema.</p>
      </div>
      <div className="settings-segment" role="group" aria-label="Modo de cor">
        <button type="button" aria-pressed={theme === "light"} aria-label="Modo claro" onClick={() => choose("light")}>
          <Sun size={14} aria-hidden="true" /> Claro
        </button>
        <button type="button" aria-pressed={theme === "dark"} aria-label="Modo escuro" onClick={() => choose("dark")}>
          <Moon size={14} aria-hidden="true" /> Escuro
        </button>
      </div>
    </div>
  );
}

/** Liga/desliga os sons: antes era o botão de volume flutuante. */
function SoundRow() {
  const { enabled, toggle } = useSoundEnabled();
  return (
    <div className="settings-row">
      <RowIcon icon={enabled ? Volume2 : VolumeX} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-bold">Sons do site</p>
        <p className="mt-0.5 text-xs text-[color:var(--pc-text-soft)]">
          {enabled ? "Ligados: efeitos dos jogos e do Cantinho." : "Desligados: o site fica em silêncio."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Sons do site"
        data-on={enabled}
        onClick={toggle}
        className="settings-switch"
      >
        <span className="settings-switch-knob" />
      </button>
    </div>
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

      <Section title="Testes — Fazendinhas">
        <ResetRow
          label="Moeda global compartilhada"
          confirmation="Tem certeza que deseja zerar a moeda global?"
          onConfirm={() => resetIdle("global", "andre").then(() => onChanged())}
        />
        <ResetRow
          label="Fazendinha completa"
          confirmation="Tem certeza que deseja resetar completamente a Fazendinha?"
          onConfirm={() => resetIdle("farm", "andre").then(() => onChanged())}
        />
        <ResetRow
          label="Mundo da Hello Kitty completo"
          confirmation="Tem certeza que deseja resetar completamente o Mundo da Hello Kitty?"
          onConfirm={() => resetIdle("kitty", "andre").then(() => onChanged())}
        />
      </Section>
      <Section title="Quartos dos pets — REAL">
        <ResetRow
          label="Resetar quartos da Nix e do Max"
          confirmation="Isso vai remover todas as decorações compradas e resetar os quartos reais de Nix e Max. Continuar?"
          onConfirm={() => resetRealPetRooms().then(() => onChanged())}
        />
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

function ResetRow({ label, confirmation, onConfirm }: { label: string; confirmation?: string; onConfirm: () => Promise<void> }) {
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
      <span className="text-sm text-ink">{confirming && confirmation ? confirmation : label}</span>
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
