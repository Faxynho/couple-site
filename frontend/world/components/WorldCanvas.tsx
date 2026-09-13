"use client";

import { useEffect, useRef } from "react";
import { AccountId } from "@/lib/accountSession";
import { WorldPlayerActionEvent, WorldSnapshot } from "@/world/types";
import { WorldGameApi, WorldGameCallbacks } from "@/world/game/WorldGameApi";

export default function WorldCanvas({ accountId, snapshot, actionEvent, callbacks, onApiReady }: { accountId: AccountId; snapshot: WorldSnapshot; actionEvent: WorldPlayerActionEvent | null; callbacks: WorldGameCallbacks; onApiReady: (api: WorldGameApi | null) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<WorldGameApi | null>(null);
  const initialRef = useRef(snapshot);
  const callbacksRef = useRef(callbacks);
  const actionRef = useRef(actionEvent);
  callbacksRef.current = callbacks;
  actionRef.current = actionEvent;

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
      api.resize(width, height);
    };

    const scheduleResize = () => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);

      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        resizeGame();

        // Android pode terminar fullscreen/orientação alguns ms depois do primeiro resize.
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
        onHint: (...args) => callbacksRef.current.onHint(...args),
        onNotice: (...args) => callbacksRef.current.onNotice(...args),
        onDebug: (...args) => callbacksRef.current.onDebug(...args),
        onReady: (...args) => callbacksRef.current.onReady(...args),
        onError: (...args) => callbacksRef.current.onError(...args),
      };

      apiRef.current = createWorldGame(hostRef.current, accountId, initialRef.current, forwardingCallbacks);
      onApiReady(apiRef.current);
      if (actionRef.current) apiRef.current.playRemoteAction(actionRef.current);

      resizeObserver = new ResizeObserver(scheduleResize);
      resizeObserver.observe(hostRef.current);

      window.addEventListener("resize", handleViewportChange);
      window.addEventListener("orientationchange", handleViewportChange);
      document.addEventListener("fullscreenchange", handleViewportChange);
      window.visualViewport?.addEventListener("resize", handleViewportChange);

      // Sincroniza também o tamanho inicial real do container.
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
  useEffect(() => { if (actionEvent) apiRef.current?.playRemoteAction(actionEvent); }, [actionEvent]);

  return <div ref={hostRef} className="absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full [&>canvas]:[image-rendering:pixelated]" aria-label="Nosso Mundo" />;
}
