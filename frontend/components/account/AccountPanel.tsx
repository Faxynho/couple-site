"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Settings, Trophy, User, X } from "lucide-react";
import { AccountId } from "@/lib/accountSession";
import { fetchAccountsOverview } from "@/lib/accountApi";
import { AccountsOverview, PublicAccountProfile } from "@/lib/accountTypes";
import ProfileTab from "./ProfileTab";
import StatsTab from "./StatsTab";
import RecordsTab from "./RecordsTab";
import SettingsTab from "./SettingsTab";

type TabId = "perfil" | "estatisticas" | "recordes" | "configuracoes";

const BASE_TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "estatisticas", label: "Estatísticas", icon: BarChart3 },
  { id: "recordes", label: "Recordes", icon: Trophy },
];

interface AccountPanelProps {
  accountId: AccountId;
  profile: PublicAccountProfile;
  onClose: () => void;
  onProfileUpdated?: (profile: PublicAccountProfile) => void;
  onSwitchAccount?: () => void;
  /** Remove os controles de edição quando o painel mostra outra conta. */
  readOnly?: boolean;
}

/**
 * Painel aberto pelo botão de conta (canto superior esquerdo, fora das telas
 * de jogo) — abas: editar nome/foto, estatísticas da dupla e de cada um, os
 * recordes por jogo/dificuldade e as preferências locais. Dentro de
 * Configurações, apenas o ID estável "andre" recebe o acesso adicional ao
 * reset de estatísticas/recordes. Os painéis de dados compartilham o mesmo
 * resumo (`GET /api/accounts/overview`).
 */
export default function AccountPanel({ accountId, profile, onClose, onProfileUpdated, onSwitchAccount, readOnly = false }: AccountPanelProps) {
  const [tab, setTab] = useState<TabId>("perfil");
  const [overview, setOverview] = useState<AccountsOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const loadOverview = useCallback(() => {
    fetchAccountsOverview()
      .then((data) => setOverview(data))
      .catch(() => setOverviewError("Não foi possível carregar as estatísticas agora."));
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Contas fixas podem personalizar a interface. A autorização do reset
  // continua sendo decidida dentro de Configurações pelo ID estável "andre".
  const tabs = !readOnly ? [...BASE_TABS, { id: "configuracoes" as const, label: "Configurações", icon: Settings }] : BASE_TABS;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 py-8 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="account-panel glass-panel relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl3"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface/60 hover:text-ink"
          >
            <X size={18} />
          </button>

          <div className="account-tabs flex items-center gap-1.5 overflow-x-auto border-b border-ink/10 px-5 pb-3 pt-5 no-scrollbar sm:px-7">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:px-4 ${
                    active ? "bg-rose text-white shadow-glow" : "text-ink-soft hover:bg-surface/60 hover:text-ink"
                  }`}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            {tab === "perfil" && (
              <ProfileTab
                accountId={accountId}
                profile={profile}
                overview={overview}
                onProfileUpdated={onProfileUpdated}
                onSwitchAccount={onSwitchAccount}
                readOnly={readOnly}
              />
            )}
            {tab === "estatisticas" && <StatsTab overview={overview} error={overviewError} />}
            {tab === "recordes" && <RecordsTab overview={overview} error={overviewError} />}
            {tab === "configuracoes" && !readOnly && (
              <SettingsTab accountId={accountId} overview={overview} onChanged={loadOverview} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
