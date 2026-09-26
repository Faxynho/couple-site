"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getActiveAccount } from "@/lib/accountSession";
import { enterIdleMode, fetchIdleSnapshot, idleItemAction } from "@/lib/idleApi";
import { IdleModeId, IdleSnapshot } from "@/lib/idleTypes";
import { getSocket } from "@/lib/socket";

export function useIdleGame(mode?: IdleModeId) {
  const [snapshot, setSnapshot] = useState<IdleSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const active = useMemo(() => getActiveAccount(), []);
  const accountId = active?.type === "account" ? active.id : null;

  const load = useCallback(async () => {
    if (!accountId) {
      setError("Selecione André ou Flávia antes de entrar.");
      return;
    }
    try {
      setError(null);
      const next = mode ? await enterIdleMode(accountId, mode) : await fetchIdleSnapshot(accountId);
      setSnapshot(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível abrir o cantinho.");
    }
  }, [accountId, mode]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const onState = (next: IdleSnapshot) => setSnapshot((current) => !current || next.revision >= current.revision ? next : current);
    socket.on("idle:state", onState);
    return () => { socket.off("idle:state", onState); };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const displayedBalance = mode && snapshot
    ? snapshot.modes[mode].balance
      + snapshot.modes[mode].totalProduction * Math.max(0, now - snapshot.modes[mode].lastSettledAt) / 1_000
    : 0;

  const act = useCallback(async (itemId: string, action: "buy" | "upgrade") => {
    if (!mode || !accountId || busyItemId) return;
    setBusyItemId(itemId);
    setError(null);
    try {
      setSnapshot(await idleItemAction(accountId, mode, itemId, action));
      setNow(Date.now());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a compra.");
      await load();
    } finally {
      setBusyItemId(null);
    }
  }, [accountId, busyItemId, load, mode]);

  return { snapshot, error, loading: !snapshot && !error, accountId, displayedBalance, busyItemId, act, reload: load };
}
