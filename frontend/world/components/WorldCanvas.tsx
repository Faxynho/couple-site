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
    });
    return () => { cancelled = true; apiRef.current?.destroy(); apiRef.current = null; onApiReady(null); };
  }, [accountId, onApiReady]);

  useEffect(() => { apiRef.current?.updatePlayers(snapshot.players); }, [snapshot.players]);
  useEffect(() => { apiRef.current?.updateDecorations(snapshot.decorations); }, [snapshot.decorations]);
  useEffect(() => { if (actionEvent) apiRef.current?.playRemoteAction(actionEvent); }, [actionEvent]);

  return <div ref={hostRef} className="absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full [&>canvas]:[image-rendering:pixelated]" aria-label="Nosso Mundo" />;
}
