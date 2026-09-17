"use client";

import { useEffect, useRef } from "react";
import { AccountId } from "@/lib/accountSession";
import { WorldDecorationEffectEvent, WorldPlayerActionEvent, WorldSnapshot } from "@/world/types";
import { WorldGameApi, WorldGameCallbacks } from "@/world/game/WorldGameApi";

export default function WorldCanvas({ accountId, snapshot, actionEvent, decorationEffect, callbacks, onApiReady }: { accountId: AccountId; snapshot: WorldSnapshot; actionEvent: WorldPlayerActionEvent | null; decorationEffect: WorldDecorationEffectEvent | null; callbacks: WorldGameCallbacks; onApiReady: (api: WorldGameApi | null) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<WorldGameApi | null>(null);
  const snapshotRef = useRef(snapshot);
  const callbacksRef = useRef(callbacks);
  const actionRef = useRef(actionEvent);
  const decorationEffectRef = useRef(decorationEffect);
  snapshotRef.current = snapshot;
  callbacksRef.current = callbacks;
  actionRef.current = actionEvent;
  decorationEffectRef.current = decorationEffect;

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let resizeFrame: number | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    const resizeGame = () => {
      const host = hostRef.current;
      const api = apiRef.current;
      if (!host || !api) return;

      const width = Math.max(1, Math.round(host.clientWidth));
      const height = Math.max(1, Math.round(host.clientHeight));

      // Mede o HUD real em vez de assumir um tamanho fixo. No mobile ele
      // ocupa uma fração bem maior da tela e a câmera precisa reservar essa
      // área para não esconder o personagem no limite norte do mapa.
      const hostRect = host.getBoundingClientRect();
      const topbar = host.parentElement?.querySelector<HTMLElement>(".world-topbar");
      const topbarRect = topbar?.getBoundingClientRect();
      const topInset = topbarRect
        ? Math.max(0, Math.min(height, Math.round(topbarRect.bottom - hostRect.top + 8)))
        : 0;

      api.resize(width, height, topInset);
    };

    const scheduleResize = () => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);

      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        resizeGame();

        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = setTimeout(resizeGame, 180);
      });
    };

    const handleViewportChange = () => scheduleResize();

    void import("@/world/game/createWorldGame").then(({ createWorldGame }) => {
      if (cancelled || !hostRef.current) return;

      const forwardingCallbacks: WorldGameCallbacks = {
        onMove: (...args) => callbacksRef.current.onMove(...args),
        onAction: (...args) => callbacksRef.current.onAction(...args),
        onChangeScene: (...args) => callbacksRef.current.onChangeScene(...args),
        onPlaceDecoration: (...args) => callbacksRef.current.onPlaceDecoration(...args),
        onMoveDecoration: (...args) => callbacksRef.current.onMoveDecoration(...args),
        onRemoveDecoration: (...args) => callbacksRef.current.onRemoveDecoration(...args),
        onPaintTerrain: (...args) => callbacksRef.current.onPaintTerrain(...args),
        onRemoveTerrain: (...args) => callbacksRef.current.onRemoveTerrain(...args),
        onHint: (...args) => callbacksRef.current.onHint(...args),
        onNotice: (...args) => callbacksRef.current.onNotice(...args),
        onDebug: (...args) => callbacksRef.current.onDebug(...args),
        onCameraZoomChange: (...args) => callbacksRef.current.onCameraZoomChange(...args),
        onReady: (...args) => callbacksRef.current.onReady(...args),
        onError: (...args) => callbacksRef.current.onError(...args),
      };

      apiRef.current = createWorldGame(hostRef.current, accountId, snapshotRef.current, forwardingCallbacks);
      onApiReady(apiRef.current);
      apiRef.current.updatePlayers(snapshotRef.current.players);
      apiRef.current.updateDecorations(snapshotRef.current.decorations);
      apiRef.current.updateTerrain(snapshotRef.current.terrain);
      if (actionRef.current) apiRef.current.playRemoteAction(actionRef.current);
      if (decorationEffectRef.current) apiRef.current.playDecorationEffect(decorationEffectRef.current);

      resizeObserver = new ResizeObserver(scheduleResize);
      resizeObserver.observe(hostRef.current);

      window.addEventListener("resize", handleViewportChange);
      window.addEventListener("orientationchange", handleViewportChange);
      document.addEventListener("fullscreenchange", handleViewportChange);
      window.visualViewport?.addEventListener("resize", handleViewportChange);

      scheduleResize();
    });

    return () => {
      cancelled = true;

      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      document.removeEventListener("fullscreenchange", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);

      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      if (settleTimer) clearTimeout(settleTimer);

      apiRef.current?.destroy();
      apiRef.current = null;
      onApiReady(null);
    };
  }, [accountId, onApiReady]);

  useEffect(() => { apiRef.current?.updatePlayers(snapshot.players); }, [snapshot.players]);
  useEffect(() => { apiRef.current?.updateDecorations(snapshot.decorations); }, [snapshot.decorations]);
  useEffect(() => { apiRef.current?.updateTerrain(snapshot.terrain); }, [snapshot.terrain]);
  useEffect(() => { if (actionEvent) apiRef.current?.playRemoteAction(actionEvent); }, [actionEvent]);
  useEffect(() => { if (decorationEffect) apiRef.current?.playDecorationEffect(decorationEffect); }, [decorationEffect]);

  // NÃO force h-full/w-full no canvas. Em Phaser.Scale.FIT o ScaleManager é
  // quem deve controlar o tamanho CSS do canvas; sobrescrever isso recria
  // escala fracionária/esticamento fora do controle do Phaser.
  return <div ref={hostRef} className="absolute inset-0 overflow-hidden [&>canvas]:block [&>canvas]:[image-rendering:pixelated]" aria-label="Nosso Mundo" />;
}
