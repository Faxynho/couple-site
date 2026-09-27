"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRoomSession } from "@/hooks/useRoomSession";
import { getSocket } from "@/lib/socket";
import { PERSISTENT_DUO_ROOM_CODE } from "@/lib/persistentDuo";
import { getActiveAccountId } from "@/lib/accountSession";
import { fetchPetEconomy, petDevAction, purchasePetDecoration } from "@/lib/petApi";
import { GameEnvironment, IdleSnapshot } from "@/lib/idleTypes";
import type { PetDefinition } from "../config";
import { PET_ROOM_DECORATIONS, type Decoration, type PetRoomSnapshot } from "../petRoomDecorations";
import PetRoomScene from "./PetRoomScene";
import PetRoomDrawer from "./PetRoomDrawer";
import styles from "../PetRoom.module.css";

export default function PetRoom({ pet, environment = "real" }: { pet: PetDefinition; environment?: GameEnvironment }) {
  const { room } = useRoomSession(PERSISTENT_DUO_ROOM_CODE, "lobby");
  const [snapshot, setSnapshot] = useState<PetRoomSnapshot | null>(null);
  const [error, setError] = useState("");
  const [coins, setCoins] = useState(0);
  const [purchased, setPurchased] = useState<string[]>([]);
  const accountId = getActiveAccountId();
  const selected = useMemo(() => PET_ROOM_DECORATIONS.filter((item) => snapshot?.slots[item.slot] === item.id), [snapshot?.slots]);

  useEffect(() => {
    setSnapshot(null);
    if (environment === "dev" && accountId !== "andre") return;
    if (room?.code !== PERSISTENT_DUO_ROOM_CODE) return;
    const socket = getSocket();
    let active = true;
    const onChanged = (next: PetRoomSnapshot) => {
      if (active && next.petId === pet.id && next.environment === environment) setSnapshot((old) => !old || next.revision >= old.revision ? next : old);
    };
    const onIdleState = (next: IdleSnapshot) => {
      if (!active || next.environment !== environment) return;
      setCoins(next.globalCoins);
      setPurchased(next.purchasedPetDecorations);
    };
    socket.on("petRoom:changed", onChanged);
    socket.on("idle:state", onIdleState);
    socket.emit("petRoom:sync", { petId: pet.id, environment }, (response: { ok: boolean; room?: PetRoomSnapshot; globalCoins?: number; purchasedDecorations?: string[]; error?: string }) => {
      if (!active) return;
      if (response.ok && response.room) {
        onChanged(response.room);
        setCoins(response.globalCoins ?? 0);
        setPurchased(response.purchasedDecorations ?? []);
      }
      else setError(response.error || "Não foi possível carregar as decorações.");
    });
    return () => {
      active = false;
      socket.off("petRoom:changed", onChanged);
      socket.off("idle:state", onIdleState);
    };
  }, [accountId, environment, room?.code, pet.id]);

  const toggleDecoration = useCallback((decoration: Decoration) => {
    if (!snapshot) return;
    setError("");
    getSocket().emit("petRoom:toggle", { petId: pet.id, decorationId: decoration.id, environment }, (response: { ok: boolean; room?: PetRoomSnapshot; error?: string }) => {
      if (response.ok && response.room) setSnapshot((old) => !old || response.room!.revision >= old.revision ? response.room! : old);
      else setError(response.error || "Não foi possível salvar. Tente novamente.");
    });
  }, [environment, pet.id, snapshot]);

  const buyDecoration = useCallback(async (decoration: Decoration) => {
    if (!accountId) return;
    setError("");
    try {
      const result = await purchasePetDecoration(accountId, decoration.id, environment);
      setCoins(result.snapshot.globalCoins);
      setPurchased(result.snapshot.purchasedPetDecorations);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível comprar agora.");
    }
  }, [accountId, environment]);

  const runDevAction = useCallback(async (payload: Record<string, unknown>) => {
    if (environment !== "dev" || accountId !== "andre") return;
    try {
      await petDevAction(payload);
      const next = await fetchPetEconomy(accountId, pet.id, environment);
      setSnapshot(next.room);
      setCoins(next.globalCoins);
      setPurchased(next.purchasedDecorations);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A ferramenta DEV falhou.");
    }
  }, [accountId, environment, pet.id]);

  if (environment === "dev" && accountId !== "andre") return <div className={styles.petDevDenied} role="alert">Acesso exclusivo da conta André.</div>;

  return (
    <div className={styles.roomLayout}>
      <PetRoomScene pet={pet} decorations={selected} />
      <PetRoomDrawer pet={pet} slots={snapshot?.slots ?? {}} ready={Boolean(snapshot)} error={error} onToggle={toggleDecoration} onBuy={buyDecoration} coins={coins} purchased={purchased} environment={environment} onDevAction={runDevAction} />
    </div>
  );
}
