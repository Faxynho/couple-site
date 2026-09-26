"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getActiveAccount } from "@/lib/accountSession";
import { enterIdleMode, fetchIdleSnapshot, idleClick, idleItemAction } from "@/lib/idleApi";
import { IdleModeId, IdleSnapshot } from "@/lib/idleTypes";
import { getSocket } from "@/lib/socket";

export function useIdleGame(mode?: IdleModeId) {
  const [snapshot, setSnapshot] = useState<IdleSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const lastClickRef = useRef(0);
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
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 3_200);
    return () => window.clearTimeout(timer);
  }, [error]);

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

  const act = useCallback(async (itemId: string, action: "buy" | "upgrade"): Promise<boolean> => {
    if (!mode || !accountId || busyItemId) return false;
    setBusyItemId(itemId);
    setError(null);
    try {
      setSnapshot(await idleItemAction(accountId, mode, itemId, action));
      setNow(Date.now());
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a compra.");
      return false;
    } finally {
      setBusyItemId(null);
    }
  }, [accountId, busyItemId, mode]);

  const clickItem = useCallback(async (itemId: string): Promise<number | null> => {
    if (!mode || !accountId) return null;
    const clickedAt = Date.now();
    if (clickedAt - lastClickRef.current < 125) return null;
    lastClickRef.current = clickedAt;
    try {
      const result = await idleClick(accountId, mode, itemId);
      setSnapshot(result.snapshot);
      setNow(Date.now());
      return result.reward;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Não foi possível coletar agora.";
      if (!message.includes("rápido demais")) setError(message);
      return null;
    }
  }, [accountId, mode]);

  return { snapshot, error, loading: !snapshot && !error, accountId, displayedBalance, busyItemId, act, clickItem, reload: load };
}
