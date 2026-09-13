"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountId } from "@/lib/accountSession";
import { getSocket } from "@/lib/socket";
import { WorldAck, WorldDecoration, WorldDecorationType, WorldDirection, WorldPlayerActionEvent, WorldPlayerState, WorldSceneId, WorldSnapshot } from "@/world/types";

interface JoinAck { ok: boolean; error?: string; snapshot?: WorldSnapshot }

export function useWorldSession(accountId: AccountId | null, roomReady: boolean) {
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [remoteAction, setRemoteAction] = useState<WorldPlayerActionEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const join = useCallback(() => {
    if (!accountId || !roomReady) return;
    getSocket().emit("world:join", {}, (response: JoinAck) => {
      if (response.ok && response.snapshot) { setSnapshot(response.snapshot); setError(null); }
      else setError(response.error ?? "Não foi possível entrar no Nosso Mundo.");
    });
  }, [accountId, roomReady]);

  useEffect(() => {
    if (!accountId || !roomReady) return;
    const socket = getSocket();
    const onPlayers = (players: WorldPlayerState[]) => setSnapshot((current) => current ? { ...current, players } : current);
    const onMoved = (player: WorldPlayerState) => setSnapshot((current) => current ? { ...current, players: [...current.players.filter((item) => item.accountId !== player.accountId), player] } : current);
    const onAction = (event: WorldPlayerActionEvent) => setRemoteAction(event);
    const onDecorations = (decorations: WorldDecoration[]) => setSnapshot((current) => current ? { ...current, decorations } : current);
    const onConnect = () => join();
    socket.on("world:players", onPlayers);
    socket.on("world:playerMoved", onMoved);
    socket.on("world:playerAction", onAction);
    socket.on("world:decorations", onDecorations);
    socket.on("connect", onConnect);
    join();
    return () => {
      socket.off("world:players", onPlayers);
      socket.off("world:playerMoved", onMoved);
      socket.off("world:playerAction", onAction);
      socket.off("world:decorations", onDecorations);
      socket.off("connect", onConnect);
      socket.emit("world:leave");
    };
  }, [accountId, join, roomReady]);

  const sendMovement = useCallback((state: { scene: WorldSceneId; x: number; y: number; direction: WorldDirection; moving: boolean }) => {
    getSocket().emit("world:move", state);
  }, []);

  const sendAction = useCallback((action: string, direction: WorldDirection) => {
    getSocket().emit("world:action", { action, direction });
  }, []);

  const changeScene = useCallback((scene: WorldSceneId) => new Promise<WorldAck>((resolve) => {
    getSocket().emit("world:changeScene", { scene }, (response: WorldAck) => resolve(response));
  }), []);

  const placeDecoration = useCallback((type: WorldDecorationType, scene: WorldSceneId, gridX: number, gridY: number) => new Promise<WorldAck>((resolve) => {
    getSocket().emit("world:decorationPlace", { type, scene, gridX, gridY }, (response: WorldAck) => resolve(response));
  }), []);

  const moveDecoration = useCallback((id: string, scene: WorldSceneId, gridX: number, gridY: number) => new Promise<WorldAck>((resolve) => {
    getSocket().emit("world:decorationMove", { id, scene, gridX, gridY }, (response: WorldAck) => resolve(response));
  }), []);

  const removeDecoration = useCallback((id: string) => new Promise<WorldAck>((resolve) => {
    getSocket().emit("world:decorationRemove", { id }, (response: WorldAck) => resolve(response));
  }), []);

  return { snapshot, remoteAction, error, sendMovement, sendAction, changeScene, placeDecoration, moveDecoration, removeDecoration };
}
