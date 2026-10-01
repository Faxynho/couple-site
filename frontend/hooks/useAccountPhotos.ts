"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  ensureAccountProfilesLoaded,
  getAccountProfilesSnapshot,
  getServerAccountProfilesSnapshot,
  subscribeAccountProfiles,
} from "@/lib/accountProfilesStore";
import { AccountId } from "@/lib/accountSession";

/**
 * Mapa accountId -> foto (base64) das duas contas fixas — usado em qualquer
 * lugar que mostra o "perfil" de um jogador (bolha de conexão da sala, chip
 * dentro dos jogos) para exibir a foto de verdade em vez de só a inicial
 * quando a pessoa tem uma salva.
 *
 * Os dados vêm do cache compartilhado de perfis (lib/accountProfilesStore.ts),
 * o mesmo que o AccountAvatar usa para descobrir a borda equipada — então a
 * foto e a borda sempre andam juntas e há uma só busca no servidor.
 */
export function useAccountPhotos(): Partial<Record<AccountId, string | null>> {
  const profiles = useSyncExternalStore(
    subscribeAccountProfiles,
    getAccountProfilesSnapshot,
    getServerAccountProfilesSnapshot,
  );

  useEffect(() => {
    ensureAccountProfilesLoaded();
  }, []);

  return useMemo(() => {
    const map: Partial<Record<AccountId, string | null>> = {};
    for (const profile of Object.values(profiles)) {
      if (profile) map[profile.id] = profile.photo;
    }
    return map;
  }, [profiles]);
}
