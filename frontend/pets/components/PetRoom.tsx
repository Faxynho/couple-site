"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRoomSession } from "@/hooks/useRoomSession";
import { getSocket } from "@/lib/socket";
import { PERSISTENT_DUO_ROOM_CODE } from "@/lib/persistentDuo";
import { getActiveAccountId } from "@/lib/accountSession";
import { feedPet, fetchPetEconomy, petDevAction, purchasePetDecoration } from "@/lib/petApi";
import { GameEnvironment, IdleSnapshot } from "@/lib/idleTypes";
import type { PetAnimation, PetDefinition } from "../config";
import type { PetFood } from "../food";
import { usePetCare } from "../usePetCare";
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
  const [feedback, setFeedback] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const [action, setAction] = useState<PetAnimation>("idle");
  const busy = useRef(false);
  const actionTimer = useRef<number | null>(null);
  const feedbackTimer = useRef<number | null>(null);
  const { care, setCare, stroke } = usePetCare(pet.id, environment);
  const accountId = getActiveAccountId();
  const selected = useMemo(() => PET_ROOM_DECORATIONS.filter((item) => snapshot?.slots[item.slot] === item.id), [snapshot?.slots]);
  useEffect(() => () => {
    if (actionTimer.current) window.clearTimeout(actionTimer.current);
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
  }, []);

  const showFeedback = useCallback((message: string) => {
    setFeedback(message);
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(""), 2600);
  }, []);

  const onFeed = useCallback(async (food: PetFood) => {
    if (!accountId || !care || busy.current) return false;
    if (care.satiety >= 100) { showFeedback(pet.id === "nix" ? "Nix já está satisfeita ♡" : "Max já está satisfeito ♡"); return false; }
    busy.current = true;
    try {
      const result = await feedPet(accountId, pet.id, food.id, environment);
      setCare((old) => !old || result.care.revision >= old.revision ? result.care : old);
      setCoins(result.globalCoins);
      setFeedback("");
      setAction("eating");
      if (actionTimer.current) window.clearTimeout(actionTimer.current);
      actionTimer.current = window.setTimeout(() => setAction("idle"), 900);
      return true;
    } catch (reason) {
      showFeedback(reason instanceof Error ? reason.message : "Não foi possível alimentar agora.");
      return false;
    } finally { busy.current = false; }
  }, [accountId, care, environment, pet.id, setCare, showFeedback]);

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
      setCare(next.care);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A ferramenta DEV falhou.");
    }
  }, [accountId, environment, pet.id, setCare]);

  if (environment === "dev" && accountId !== "andre") return <div className={styles.petDevDenied} role="alert">Acesso exclusivo da conta André.</div>;

  return (
    <div className={styles.roomLayout}>
      <PetRoomScene pet={pet} decorations={selected} coins={coins} environment={environment} mood={care?.mood ?? "happy"} action={action} onStroke={stroke} dropActive={dropActive} />
      <PetRoomDrawer pet={pet} slots={snapshot?.slots ?? {}} ready={Boolean(snapshot)} error={error} onToggle={toggleDecoration} onBuy={buyDecoration} coins={coins} purchased={purchased} environment={environment} onDevAction={runDevAction} care={care} onFeed={onFeed} onFoodHover={setDropActive} feedback={feedback} />
    </div>
  );
}
