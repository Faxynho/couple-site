"use client";

import { useEffect, useState } from "react";
import AccountAvatar from "@/components/account/AccountAvatar";
import { fetchAccounts } from "@/lib/accountApi";
import { PublicAccountProfile } from "@/lib/accountTypes";
import { PersistentDuoPresence } from "@/lib/types";
import { PERSISTENT_DUO_ACCOUNT_IDS, PERSISTENT_DUO_DEFAULT_NAMES } from "@/lib/persistentDuo";

const PRESENCE_LABELS: Record<PersistentDuoPresence, { label: string; detail: string; dot: string }> = {
  offline: { label: "Offline", detail: "Ainda não entrou", dot: "bg-ink-soft/35" },
  lobby: { label: "Na sala", detail: "Disponível para jogar", dot: "bg-emerald-500" },
  world: { label: "Nosso Mundo", detail: "Explorando o mundo", dot: "bg-amber-400" },
  minigame: { label: "Minijogo", detail: "Jogando agora", dot: "bg-sky-500" },
};

export default function PersistentDuoStatus({
  presence,
}: {
  presence: Record<"andre" | "flavia", PersistentDuoPresence>;
}) {
  const [profiles, setProfiles] = useState<PublicAccountProfile[]>([]);

  useEffect(() => {
    let alive = true;
    fetchAccounts().then((items) => alive && setProfiles(items)).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="grid w-full grid-cols-2 gap-3" aria-label="Presença no lobby">
      {PERSISTENT_DUO_ACCOUNT_IDS.map((accountId) => {
        const profile = profiles.find((item) => item.id === accountId);
        const state = PRESENCE_LABELS[presence[accountId]];
        return (
          <div key={accountId} className="rounded-[22px] border border-rose/20 bg-surface/65 px-3 py-2.5 text-left shadow-soft backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <AccountAvatar
                name={profile?.name ?? PERSISTENT_DUO_DEFAULT_NAMES[accountId]}
                photo={profile?.photo}
                accountId={accountId}
                size={42}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {profile?.name ?? PERSISTENT_DUO_DEFAULT_NAMES[accountId]}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-ink-soft">
                  <span className={`h-2 w-2 rounded-full ${state.dot}`} />
                  {state.label}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-ink-soft/80">{state.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

