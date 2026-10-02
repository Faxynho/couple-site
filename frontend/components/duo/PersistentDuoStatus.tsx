"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AccountAvatar from "@/components/account/AccountAvatar";
import AccountPanel from "@/components/account/AccountPanel";
import { SparkleIcon } from "@/components/account/ProfileCardDecor";
import {
  applyAccountProfileUpdate,
  ensureAccountProfilesLoaded,
  getAccountProfilesSnapshot,
  getServerAccountProfilesSnapshot,
  subscribeAccountProfiles,
} from "@/lib/accountProfilesStore";
import { AccountId, clearActiveAccount } from "@/lib/accountSession";
import { PublicAccountProfile } from "@/lib/accountTypes";
import { PERSISTENT_DUO_DEFAULT_NAMES } from "@/lib/persistentDuo";
import { PersistentDuoPresence } from "@/lib/types";
import "./lobby-player-card.css";

/** Diâmetro da foto nos cards do topo, em px (era 32–42 antes). */
const LOBBY_AVATAR_SIZE = 54;

interface PersistentDuoStatusProps {
  /** Conta de quem está olhando a tela: o card dela fica à esquerda. */
  selfId: AccountId;
  presence: Record<AccountId, PersistentDuoPresence>;
}

/**
 * HUD do topo do lobby persistente: à esquerda o card de quem está jogando (abre
 * o próprio perfil completo) e à direita o card do outro jogador (abre só o
 * perfil dele, sem estatísticas, recordes nem configurações). Cada card mostra
 * foto com a borda equipada, nome e se a pessoa está online.
 */
export default function PersistentDuoStatus({ selfId, presence }: PersistentDuoStatusProps) {
  const router = useRouter();
  const profiles = useSyncExternalStore(subscribeAccountProfiles, getAccountProfilesSnapshot, getServerAccountProfilesSnapshot);
  const [openPanel, setOpenPanel] = useState<"self" | "partner" | null>(null);

  useEffect(() => {
    ensureAccountProfilesLoaded();
  }, []);

  const partnerId: AccountId = selfId === "andre" ? "flavia" : "andre";
  const profileOf = (id: AccountId): PublicAccountProfile =>
    profiles[id] ?? { id, name: PERSISTENT_DUO_DEFAULT_NAMES[id], photo: null, border: null };
  const selfProfile = profileOf(selfId);
  const partnerProfile = profileOf(partnerId);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between gap-2 px-3 pt-[max(0.6rem,env(safe-area-inset-top))] sm:px-4" aria-label="Jogadores do lobby">
        <LobbyPlayerCard
          side="left"
          profile={selfProfile}
          online={presence[selfId] !== "offline"}
          label="Abrir meu perfil"
          onClick={() => setOpenPanel("self")}
        />
        <LobbyPlayerCard
          side="right"
          profile={partnerProfile}
          online={presence[partnerId] !== "offline"}
          label={`Ver perfil de ${partnerProfile.name}`}
          onClick={() => setOpenPanel("partner")}
        />
      </div>

      {/* Fora do contêiner acima de propósito: ele tem pointer-events: none e os painéis precisam receber cliques. */}
      {openPanel === "self" && (
        <AccountPanel
          accountId={selfId}
          profile={selfProfile}
          onClose={() => setOpenPanel(null)}
          onProfileUpdated={applyAccountProfileUpdate}
          onSwitchAccount={() => {
            clearActiveAccount();
            setOpenPanel(null);
            router.push("/");
          }}
        />
      )}
      {openPanel === "partner" && (
        <AccountPanel accountId={partnerId} profile={partnerProfile} readOnly profileOnly onClose={() => setOpenPanel(null)} />
      )}
    </>
  );
}

function LobbyPlayerCard({ side, profile, online, label, onClick }: {
  side: "left" | "right";
  profile: PublicAccountProfile;
  online: boolean;
  label: string;
  onClick: () => void;
}) {
  const border = profile.border ?? null;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label={label}
      title={label}
      data-side={side}
      data-online={online}
      data-testid={`lobby-card-${profile.id}`}
      className="lobby-player-card pointer-events-auto"
    >
      <span className="lobby-player-avatar" data-framed={border ? "true" : "false"}>
        {border ? (
          <AccountAvatar name={profile.name} photo={profile.photo} accountId={profile.id} size={LOBBY_AVATAR_SIZE} border={border} />
        ) : (
          <span className="lobby-player-ring">
            <span className="lobby-player-ring-gap">
              <AccountAvatar name={profile.name} photo={profile.photo} accountId={profile.id} size={LOBBY_AVATAR_SIZE} border={null} className="!ring-0" />
            </span>
          </span>
        )}
      </span>
      <span className="lobby-player-text">
        <span className="lobby-player-name">{profile.name}</span>
        <span className="lobby-player-status" data-online={online}>
          <span className="lobby-player-dot" aria-hidden="true" />
          {online ? "Online" : "Offline"}
        </span>
      </span>
      <SparkleIcon size={10} className="lobby-player-spark" />
    </motion.button>
  );
}
