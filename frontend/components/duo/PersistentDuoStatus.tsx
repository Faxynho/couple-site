"use client";

import { useEffect, useState } from "react";
import AccountAvatar from "@/components/account/AccountAvatar";
import { fetchAccounts } from "@/lib/accountApi";
import { PublicAccountProfile } from "@/lib/accountTypes";
import { PersistentDuoPresence } from "@/lib/types";
import { PERSISTENT_DUO_ACCOUNT_IDS, PERSISTENT_DUO_DEFAULT_NAMES } from "@/lib/persistentDuo";

export default function PersistentDuoStatus({
  presence,
  variant = "default",
}: {
  presence: Record<"andre" | "flavia", PersistentDuoPresence>;
  variant?: "default" | "minigames";
}) {
  const [profiles, setProfiles] = useState<PublicAccountProfile[]>([]);

  useEffect(() => {
    let alive = true;
    fetchAccounts().then((items) => alive && setProfiles(items)).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className={variant === "minigames" ? "grid w-full grid-cols-2 gap-2" : "grid w-full grid-cols-2 gap-3"} aria-label="Presença no lobby">
      {PERSISTENT_DUO_ACCOUNT_IDS.map((accountId) => {
        const profile = profiles.find((item) => item.id === accountId);
        const isOnline = presence[accountId] !== "offline";
        return (
          <div
            key={accountId}
            className={
              variant === "minigames"
                ? "rounded-[18px] border border-[#ff8bbb]/45 px-2 py-1.5 text-left shadow-[0_8px_22px_rgba(0,0,0,0.34),0_0_14px_rgba(255,92,157,0.14)] backdrop-blur-md"
                : "rounded-[22px] border border-white/20 bg-black/35 px-3 py-2.5 text-left shadow-[0_12px_30px_-18px_rgba(0,0,0,0.85)] backdrop-blur-md"
            }
            style={variant === "minigames" ? {
              background: accountId === "andre"
                ? "linear-gradient(135deg, rgba(46,21,54,0.9), rgba(108,38,87,0.72))"
                : "linear-gradient(135deg, rgba(55,24,61,0.9), rgba(84,47,112,0.72))",
            } : undefined}
          >
            <div className={variant === "minigames" ? "flex items-center gap-2" : "flex items-center gap-2.5"}>
              <AccountAvatar
                name={profile?.name ?? PERSISTENT_DUO_DEFAULT_NAMES[accountId]}
                photo={profile?.photo}
                accountId={accountId}
                size={variant === "minigames" ? 32 : 42}
              />
              <div className="min-w-0">
                <p className={variant === "minigames" ? "truncate text-[11px] font-semibold text-white sm:text-xs" : "truncate text-sm font-semibold text-white"}>
                  {profile?.name ?? PERSISTENT_DUO_DEFAULT_NAMES[accountId]}
                </p>
                <p className={variant === "minigames" ? "mt-0.5 flex items-center gap-1.5 text-[9px] font-semibold text-white/75 sm:text-[10px]" : "mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-white/75"}>
                  <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-white/35"}`} />
                  {isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

