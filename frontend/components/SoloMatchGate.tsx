"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import SoloMatchModal from "@/components/SoloMatchModal";
import { getActiveAccount, subscribeToActiveAccountChange } from "@/lib/accountSession";
import { getSocket } from "@/lib/socket";
import {
  clearSoloMatch,
  getSoloMatch,
  resumeSoloMatch,
  saveSoloState,
  SoloMatchSave,
  SoloStatePayload,
} from "@/lib/soloMatch";

export default function SoloMatchGate() {
  const router = useRouter();
  const pathname = usePathname();
  const [save, setSave] = useState<SoloMatchSave | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Somente saves que já existiam ao abrir o app pedem retomada. Saves criados
  // durante esta execução continuam silenciosos enquanto a partida está viva.
  const resumableOwners = useRef(new Set<string>());

  useEffect(() => {
    for (const ownerId of ["andre", "flavia"] as const) {
      if (getSoloMatch(ownerId)) resumableOwners.current.add(ownerId);
    }

    const refreshForAccount = () => {
      const active = getActiveAccount();
      if (active?.type !== "account" || !resumableOwners.current.has(active.id)) {
        setSave(null);
        return;
      }
      setSave(getSoloMatch(active.id));
    };
    refreshForAccount();
    return subscribeToActiveAccountChange(refreshForAccount);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const onSoloState = (payload: SoloStatePayload) => {
      saveSoloState(payload);
      if (payload.room.status === "finished") {
        resumableOwners.current.delete(payload.ownerId);
        setSave((current) => current?.ownerId === payload.ownerId ? null : current);
      }
    };
    socket.on("solo:state", onSoloState);
    return () => { socket.off("solo:state", onSoloState); };
  }, []);

  if (!save || pathname === "/mundo") return null;

  const cancel = () => {
    clearSoloMatch(save.ownerId);
    resumableOwners.current.delete(save.ownerId);
    setSave(null);
    setError(null);
  };

  const resume = async () => {
    setBusy(true);
    setError(null);
    const response = await resumeSoloMatch(save);
    setBusy(false);
    if (!response.ok || !response.room?.gameId) {
      setError(response.error || "Não foi possível restaurar a partida.");
      return;
    }
    resumableOwners.current.delete(save.ownerId);
    setSave(null);
    router.push(`/game/${response.room.gameId}/${response.room.code}`);
  };

  return <SoloMatchModal save={save} busy={busy} error={error} onContinue={resume} onCancel={cancel} />;
}
