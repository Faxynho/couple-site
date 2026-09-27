"use client";

import { useCallback, useEffect, useState } from "react";
import { getActiveAccountId } from "@/lib/accountSession";
import { getSocket } from "@/lib/socket";
import { fetchPetCare, strokePet, type PetCareSnapshot } from "@/lib/petApi";
import type { PetId } from "./petRoomDecorations";
import type { GameEnvironment } from "@/lib/idleTypes";

export function usePetCare(petId: PetId, environment: GameEnvironment = "real") {
  const [care, setCare] = useState<PetCareSnapshot | null>(null);
  useEffect(() => {
    const accountId = getActiveAccountId();
    if (!accountId || (environment === "dev" && accountId !== "andre")) return;
    let active = true;
    const refresh = () => {
      if (document.hidden) return;
      void fetchPetCare(accountId, petId, environment).then(({ care: next }) => {
        if (active) setCare((old) => !old || next.revision >= old.revision ? next : old);
      }).catch(() => {});
    };
    const changed = (next: PetCareSnapshot) => {
      if (active && next.petId === petId && next.environment === environment) {
        setCare((old) => !old || next.revision >= old.revision ? next : old);
      }
    };
    setCare(null);
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    getSocket().on("petCare:changed", changed);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      getSocket().off("petCare:changed", changed);
    };
  }, [petId, environment]);

  const stroke = useCallback(async () => {
    const accountId = getActiveAccountId();
    if (!accountId || (environment === "dev" && accountId !== "andre")) return false;
    try {
      const result = await strokePet(accountId, petId, environment);
      setCare((old) => !old || result.care.revision >= old.revision ? result.care : old);
      return result.accepted;
    } catch { return false; }
  }, [petId, environment]);

  return { care, setCare, stroke };
}
