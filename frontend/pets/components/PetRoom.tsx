"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRoomSession } from "@/hooks/useRoomSession";
import { getSocket } from "@/lib/socket";
import { PERSISTENT_DUO_ROOM_CODE } from "@/lib/persistentDuo";
import type { PetDefinition } from "../config";
import { PET_ROOM_DECORATIONS, type Decoration, type PetRoomSnapshot } from "../petRoomDecorations";
import PetRoomScene from "./PetRoomScene";
import PetRoomDrawer from "./PetRoomDrawer";
import styles from "../PetRoom.module.css";

export default function PetRoom({ pet }: { pet: PetDefinition }) {
  const { room } = useRoomSession(PERSISTENT_DUO_ROOM_CODE, "lobby");
  const [snapshot, setSnapshot] = useState<PetRoomSnapshot | null>(null);
  const [error, setError] = useState("");
  const selected = useMemo(() => PET_ROOM_DECORATIONS.filter((item) => snapshot?.slots[item.slot] === item.id), [snapshot?.slots]);

  useEffect(() => {
    setSnapshot(null);
    if (room?.code !== PERSISTENT_DUO_ROOM_CODE) return;
    const socket = getSocket();
    let active = true;
    const onChanged = (next: PetRoomSnapshot) => {
      if (active && next.petId === pet.id) setSnapshot((old) => !old || next.revision >= old.revision ? next : old);
    };
    socket.on("petRoom:changed", onChanged);
    socket.emit("petRoom:sync", { petId: pet.id }, (response: { ok: boolean; room?: PetRoomSnapshot; error?: string }) => {
      if (!active) return;
      if (response.ok && response.room) onChanged(response.room);
      else setError(response.error || "Não foi possível carregar as decorações.");
    });
    return () => {
      active = false;
      socket.off("petRoom:changed", onChanged);
    };
  }, [room?.code, pet.id]);

  const toggleDecoration = useCallback((decoration: Decoration) => {
    if (!snapshot) return;
    setError("");
    getSocket().emit("petRoom:toggle", { petId: pet.id, decorationId: decoration.id }, (response: { ok: boolean; room?: PetRoomSnapshot; error?: string }) => {
      if (response.ok && response.room) setSnapshot((old) => !old || response.room!.revision >= old.revision ? response.room! : old);
      else setError(response.error || "Não foi possível salvar. Tente novamente.");
    });
  }, [pet.id, snapshot]);

  return (
    <div className={styles.roomLayout}>
      <PetRoomScene pet={pet} decorations={selected} />
      <PetRoomDrawer pet={pet} slots={snapshot?.slots ?? {}} ready={Boolean(snapshot)} error={error} onToggle={toggleDecoration} />
    </div>
  );
}
