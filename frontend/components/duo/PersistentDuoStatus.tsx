"use client";

import { useEffect, useState } from "react";
import AccountAvatar from "@/components/account/AccountAvatar";
import { fetchAccounts } from "@/lib/accountApi";
import { PublicAccountProfile } from "@/lib/accountTypes";
import { PersistentDuoPresence } from "@/lib/types";
import { PERSISTENT_DUO_ACCOUNT_IDS, PERSISTENT_DUO_DEFAULT_NAMES } from "@/lib/persistentDuo";

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
        const isOnline = presence[accountId] !== "offline";
        return (
          <div key={accountId} className="rounded-[22px] border border-white/20 bg-black/35 px-3 py-2.5 text-left shadow-[0_12px_30px_-18px_rgba(0,0,0,0.85)] backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <AccountAvatar
                name={profile?.name ?? PERSISTENT_DUO_DEFAULT_NAMES[accountId]}
                photo={profile?.photo}
                accountId={accountId}
                size={42}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {profile?.name ?? PERSISTENT_DUO_DEFAULT_NAMES[accountId]}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-white/75">
                  <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-white/35"}`} />\n                  {isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

