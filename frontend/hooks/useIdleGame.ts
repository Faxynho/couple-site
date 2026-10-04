"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getActiveAccount } from "@/lib/accountSession";
import { enterIdleMode, fetchIdleSnapshot, idleClick, idleItemAction, idleRelicUpgrade, idleUpgradeBatch, recordIdleActivity } from "@/lib/idleApi";
import { GameEnvironment, IdleModeId, IdleSnapshot } from "@/lib/idleTypes";
import { getSocket } from "@/lib/socket";

export function useIdleGame(mode?: IdleModeId, environment: GameEnvironment = "real", activityEnabled = false) {
  const [snapshot, setSnapshot] = useState<IdleSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<{ count: number; bonus: number; key: number } | null>(null);
  const [pendingUpgrades, setPendingUpgrades] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const lastClickRef = useRef(0);
  const snapshotRef = useRef<IdleSnapshot | null>(null);
  const upgradeQueues = useRef(new Map<string, number>());
  const upgradeTimers = useRef(new Map<string, number>());
  const upgradeInFlight = useRef(new Set<string>());
  const active = useMemo(() => getActiveAccount(), []);
  const accountId = active?.type === "account" ? active.id : null;

  const applySnapshot = useCallback((next: IdleSnapshot) => {
    if (snapshotRef.current && next.revision < snapshotRef.current.revision) return;
    snapshotRef.current = next;
    setSnapshot((current) => !current || next.revision >= current.revision ? next : current);
  }, []);

  const load = useCallback(async () => {
    if (!accountId) {
      setError("Selecione André ou Flávia antes de entrar.");
      return;
    }
    if (environment === "dev" && accountId !== "andre") {
      setError("Acesso exclusivo da conta André.");
      return;
    }
    try {
      setError(null);
      const next = mode ? await enterIdleMode(accountId, mode, environment) : await fetchIdleSnapshot(accountId, environment);
      applySnapshot(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível abrir o cantinho.");
    }
  }, [accountId, applySnapshot, environment, mode]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 3_200);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    const socket = getSocket();
    const onState = (next: IdleSnapshot) => {
      if (next.environment === environment) applySnapshot(next);
    };
    socket.on("idle:state", onState);
    return () => { socket.off("idle:state", onState); };
  }, [applySnapshot, environment]);

  useEffect(() => {
    if (!mode || !accountId || !activityEnabled) return;
    let lastSentAt = Date.now();
    const send = () => {
      if (document.visibilityState !== "visible") { lastSentAt = Date.now(); return; }
      const current = Date.now();
      const elapsed = Math.min(10_000, current - lastSentAt);
      lastSentAt = current;
      void recordIdleActivity(accountId, mode, elapsed, environment).then(applySnapshot).catch(() => undefined);
    };
    const timer = window.setInterval(send, 5_000);
    return () => window.clearInterval(timer);
  }, [accountId, activityEnabled, applySnapshot, environment, mode]);

  useEffect(() => () => {
    upgradeTimers.current.forEach((timer) => window.clearTimeout(timer));
    upgradeTimers.current.clear();
  }, []);

  useEffect(() => {
    if (!mode) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, mode]);

  const displayedBalance = mode && snapshot
    ? snapshot.modes[mode].balance
      + snapshot.modes[mode].effectiveProduction * Math.max(0, now - snapshot.modes[mode].lastSettledAt) / 1_000
    : 0;

  const flushUpgrades = useCallback(async (itemId: string) => {
    if (!mode || !accountId || upgradeInFlight.current.has(itemId)) return;
    const count = Math.min(25, upgradeQueues.current.get(itemId) ?? 0);
    if (count <= 0) return;
    upgradeQueues.current.set(itemId, (upgradeQueues.current.get(itemId) ?? 0) - count);
    setPendingUpgrades((current) => ({ ...current, [itemId]: Math.max(0, (current[itemId] ?? 0) - count) }));
    upgradeInFlight.current.add(itemId);
    try {
      const result = await idleUpgradeBatch(accountId, mode, itemId, count, environment);
      applySnapshot(result.snapshot);
      setNow(Date.now());
      if (result.error || result.applied < result.requested) {
        upgradeQueues.current.set(itemId, 0);
        setPendingUpgrades((current) => ({ ...current, [itemId]: 0 }));
        setError(result.error ?? "Dinheiro interno insuficiente.");
      }
    } catch (reason) {
      upgradeQueues.current.set(itemId, 0);
      setPendingUpgrades((current) => ({ ...current, [itemId]: 0 }));
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir as melhorias.");
      if (accountId) void fetchIdleSnapshot(accountId, environment).then(applySnapshot).catch(() => undefined);
    } finally {
      upgradeInFlight.current.delete(itemId);
      if ((upgradeQueues.current.get(itemId) ?? 0) > 0) {
        const timer = window.setTimeout(() => void flushUpgrades(itemId), 35);
        upgradeTimers.current.set(itemId, timer);
      }
    }
  }, [accountId, applySnapshot, environment, mode]);

  const queueUpgrade = useCallback((itemId: string): boolean => {
    if (!mode || !accountId) return false;
    const current = snapshotRef.current;
    const modeState = current?.modes[mode];
    const item = modeState?.items.find((candidate) => candidate.definition.id === itemId);
    if (!current || !modeState || !item?.purchased) return false;
    if (modeState.balance < item.nextCost) {
      setError("Dinheiro interno insuficiente.");
      return false;
    }

    const nextProduction = item.production * item.definition.productionGrowth;
    const nextCost = Math.ceil(item.nextCost * item.definition.costGrowth);
    const optimistic: IdleSnapshot = {
      ...current,
      modes: {
        ...current.modes,
        [mode]: {
          ...modeState,
          balance: modeState.balance - item.nextCost,
          totalProduction: modeState.totalProduction - item.production + nextProduction,
          totalUpgrades: modeState.totalUpgrades + 1,
          items: modeState.items.map((candidate) => candidate.definition.id === itemId
            ? { ...candidate, level: candidate.level + 1, production: nextProduction, nextCost }
            : candidate),
        },
      },
    };
    snapshotRef.current = optimistic;
    setSnapshot(optimistic);
    upgradeQueues.current.set(itemId, (upgradeQueues.current.get(itemId) ?? 0) + 1);
    setPendingUpgrades((pending) => ({ ...pending, [itemId]: (pending[itemId] ?? 0) + 1 }));
    const existing = upgradeTimers.current.get(itemId);
    if (existing) window.clearTimeout(existing);
    upgradeTimers.current.set(itemId, window.setTimeout(() => void flushUpgrades(itemId), 70));
    return true;
  }, [accountId, flushUpgrades, mode]);

  const act = useCallback(async (itemId: string, action: "buy" | "upgrade"): Promise<boolean> => {
    if (action === "upgrade") return queueUpgrade(itemId);
    if (!mode || !accountId || busyItemId) return false;
    setBusyItemId(itemId);
    setError(null);
    try {
      applySnapshot(await idleItemAction(accountId, mode, itemId, action, environment));
      setNow(Date.now());
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a compra.");
      return false;
    } finally {
      setBusyItemId(null);
    }
  }, [accountId, applySnapshot, busyItemId, environment, mode, queueUpgrade]);

  const clickItem = useCallback(async (itemId: string, source: "home" | "upgrades" = "home"): Promise<number | null> => {
    if (!mode || !accountId) return null;
    const clickedAt = Date.now();
    if (clickedAt - lastClickRef.current < 125) return null;
    lastClickRef.current = clickedAt;
    try {
      const result = await idleClick(accountId, mode, itemId, environment, source);
      applySnapshot(result.snapshot);
      if (result.milestone) setMilestone({ count: result.milestone, bonus: result.bonus, key: Date.now() });
      setNow(Date.now());
      return result.reward;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Não foi possível coletar agora.";
      if (!message.includes("rápido demais")) setError(message);
      return null;
    }
  }, [accountId, applySnapshot, environment, mode]);

  const upgradeRelic = useCallback(async (relicId: string): Promise<boolean> => {
    if (mode !== "kitty" || !accountId || busyItemId) return false;
    setBusyItemId(relicId);
    try {
      applySnapshot(await idleRelicUpgrade(accountId, relicId, environment));
      setNow(Date.now());
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível melhorar a relíquia.");
      return false;
    } finally {
      setBusyItemId(null);
    }
  }, [accountId, applySnapshot, busyItemId, environment, mode]);

  const buyUpgrades = useCallback(async (itemId: string, count: 1 | 10 | "max"): Promise<boolean> => {
    if (!mode || !accountId || busyItemId) return false;
    setBusyItemId(itemId);
    setError(null);
    try {
      const result = await idleUpgradeBatch(accountId, mode, itemId, count, environment);
      applySnapshot(result.snapshot);
      setNow(Date.now());
      if (result.error && result.applied === 0) setError(result.error);
      return result.applied > 0;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir as melhorias.");
      return false;
    } finally {
      setBusyItemId(null);
    }
  }, [accountId, applySnapshot, busyItemId, environment, mode]);

  return { snapshot, error, loading: !snapshot && !error, accountId, displayedBalance, busyItemId, pendingUpgrades, act, buyUpgrades, clickItem, milestone, upgradeRelic, reload: load, applySnapshot };
}
