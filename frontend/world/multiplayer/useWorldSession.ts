"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountId } from "@/lib/accountSession";
import { getSocket } from "@/lib/socket";
import { WorldAck, WorldDecoration, WorldDecorationEffectEvent, WorldDirection, WorldPlayerActionEvent, WorldPlayerState, WorldSceneId, WorldSnapshot, WorldTerrainCell } from "@/world/types";

interface JoinAck { ok: boolean; error?: string; snapshot?: WorldSnapshot }

export function useWorldSession(accountId: AccountId | null, roomReady: boolean) {
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [remoteAction, setRemoteAction] = useState<WorldPlayerActionEvent | null>(null);
  const [decorationEffect, setDecorationEffect] = useState<WorldDecorationEffectEvent | null>(null);
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
    const onTerrain = (terrain: WorldTerrainCell[]) => setSnapshot((current) => current ? { ...current, terrain } : current);
    const onDecorationEffect = (event: WorldDecorationEffectEvent) => setDecorationEffect(event);
    const onConnect = () => join();
    socket.on("world:players", onPlayers);
    socket.on("world:playerMoved", onMoved);
    socket.on("world:playerAction", onAction);
    socket.on("world:decorations", onDecorations);
    socket.on("world:terrain", onTerrain);
    socket.on("world:decorationEffect", onDecorationEffect);
    socket.on("connect", onConnect);
    join();
    return () => {
      socket.off("world:players", onPlayers);
      socket.off("world:playerMoved", onMoved);
      socket.off("world:playerAction", onAction);
      socket.off("world:decorations", onDecorations);
      socket.off("world:terrain", onTerrain);
      socket.off("world:decorationEffect", onDecorationEffect);
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

  const placeDecoration = useCallback((itemId: string, scene: WorldSceneId, gridX: number, gridY: number, rotation = 0) => new Promise<WorldAck>((resolve) => {
    getSocket().emit("world:decorationPlace", { itemId, scene, gridX, gridY, rotation }, (response: WorldAck) => resolve(response));
  }), []);

  const moveDecoration = useCallback((id: string, scene: WorldSceneId, gridX: number, gridY: number) => new Promise<WorldAck>((resolve) => {
    getSocket().emit("world:decorationMove", { id, scene, gridX, gridY }, (response: WorldAck) => resolve(response));
  }), []);

  const removeDecoration = useCallback((id: string) => new Promise<WorldAck>((resolve) => {
    getSocket().emit("world:decorationRemove", { id }, (response: WorldAck) => resolve(response));
  }), []);

  const paintTerrain = useCallback((terrainId: string, scene: WorldSceneId, gridX: number, gridY: number) => new Promise<WorldAck>((resolve) => {
    getSocket().emit("world:terrainPaint", { terrainId, scene, gridX, gridY }, (response: WorldAck) => resolve(response));
  }), []);

  const removeTerrain = useCallback((scene: WorldSceneId, gridX: number, gridY: number) => new Promise<WorldAck>((resolve) => {
    getSocket().emit("world:terrainRemove", { scene, gridX, gridY }, (response: WorldAck) => resolve(response));
  }), []);

  return { snapshot, remoteAction, decorationEffect, error, sendMovement, sendAction, changeScene, placeDecoration, moveDecoration, removeDecoration, paintTerrain, removeTerrain };
}
