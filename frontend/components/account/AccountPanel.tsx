"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, ChevronLeft, Settings, Trophy, User } from "lucide-react";
import Logo from "@/components/Logo";
import { AccountId } from "@/lib/accountSession";
import { fetchAccountsOverview } from "@/lib/accountApi";
import { AccountsOverview, PublicAccountProfile } from "@/lib/accountTypes";
import ProfileTab from "./ProfileTab";
import StatsTab from "./StatsTab";
import RecordsTab from "./RecordsTab";
import SettingsTab from "./SettingsTab";
import { ProfileEars, ProfileFootClouds, ProfileSparkles } from "./ProfileCardDecor";
import "./profile-card.css";

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
  /** Mostra somente o perfil: sem a barra de abas, então sem Estatísticas,
   *  Recordes nem Configurações (usado ao abrir o perfil do outro jogador no lobby). */
  profileOnly?: boolean;
}

/**
 * Painel aberto pelo botão de conta (canto superior esquerdo, fora das telas
 * de jogo) — abas: perfil (nome, foto, borda, vitórias em duelo e nível),
 * estatísticas da dupla e de cada um, os recordes por jogo/dificuldade e as
 * preferências locais. As abas ficam embaixo, como um app. Dentro de
 * Configurações, apenas o ID estável "andre" recebe o acesso adicional ao
 * reset de estatísticas/recordes. Os painéis de dados compartilham o mesmo
 * resumo (`GET /api/accounts/overview`).
 *
 * O visual (cores por tema e modo claro/escuro) está em ./profile-card.css.
 */
export default function AccountPanel({ accountId, profile, onClose, onProfileUpdated, onSwitchAccount, readOnly = false, profileOnly = false }: AccountPanelProps) {
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
  const tabs = profileOnly
    ? []
    : !readOnly
      ? [...BASE_TABS, { id: "configuracoes" as const, label: "Configurações", icon: Settings }]
      : BASE_TABS;
  // Com `profileOnly` a única tela possível é o perfil, mesmo que `tab` tenha ficado em outra.
  const activeTab: TabId = profileOnly ? "perfil" : tab;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-3 py-3 backdrop-blur-sm sm:px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="profile-shell flex max-h-full w-full max-w-[32rem] flex-col gap-3"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex shrink-0 items-center justify-between px-1">
            <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar" className="profile-shell-btn">
              <ChevronLeft size={22} />
            </button>
            <div className="profile-shell-pill">
              <Logo size={30} />
            </div>
            <span className="h-10 w-10 shrink-0" aria-hidden="true" />
          </header>

          <section className="profile-card mt-3 flex min-h-0 flex-1 flex-col" aria-label="Perfil do jogador">
            <ProfileEars />
            <ProfileSparkles />
            <ProfileFootClouds />

            <div className={`relative z-[1] min-h-0 flex-1 overflow-y-auto px-5 pt-9 sm:px-7 ${profileOnly ? "pb-8" : "pb-4"}`}>
              {activeTab === "perfil" && (
                <ProfileTab
                  accountId={accountId}
                  profile={profile}
                  overview={overview}
                  onProfileUpdated={onProfileUpdated}
                  onSwitchAccount={onSwitchAccount}
                  readOnly={readOnly}
                />
              )}
              {activeTab === "estatisticas" && <StatsTab overview={overview} error={overviewError} />}
              {activeTab === "recordes" && <RecordsTab overview={overview} error={overviewError} />}
              {activeTab === "configuracoes" && !readOnly && (
                <SettingsTab accountId={accountId} overview={overview} onChanged={loadOverview} />
              )}
            </div>

            {!profileOnly && (
              <nav className="profile-tabs shrink-0" aria-label="Seções do perfil" data-count={tabs.length}>
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const active = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      data-active={active}
                      aria-current={active ? "page" : undefined}
                      className="profile-tab"
                    >
                      <Icon size={17} />
                      <span className="profile-tab-label">{t.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </section>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
