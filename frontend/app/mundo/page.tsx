"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveAccount, AccountId } from "@/lib/accountSession";
import { useRoomSession } from "@/hooks/useRoomSession";
import { PERSISTENT_DUO_ROOM_CODE } from "@/lib/persistentDuo";
import { DECORATION_ASSETS } from "@/world/config/worldConfig";
import { getWorldAudioSettings, setWorldAudioSettings, WorldAudioSettings } from "@/world/audio/WorldAudioManager";
import WorldCanvas from "@/world/components/WorldCanvas";
import WorldSettings from "@/world/components/WorldSettings";
import MobileControls from "@/world/components/MobileControls";
import { WorldGameApi, WorldGameCallbacks } from "@/world/game/WorldGameApi";
import { useWorldSession } from "@/world/multiplayer/useWorldSession";
import { DecorationTool, WorldDebugInfo, WorldDecorationType } from "@/world/types";
import styles from "./World.module.css";

export default function WorldPage() {
  const router = useRouter();
  const [accountId, setAccountId] = useState<AccountId | null>(null);
  const [checkedAccount, setCheckedAccount] = useState(false);
  const roomSession = useRoomSession(PERSISTENT_DUO_ROOM_CODE, "world");
  const world = useWorldSession(accountId, Boolean(roomSession.room));
  const [api, setApi] = useState<WorldGameApi | null>(null);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [decorateOpen, setDecorateOpen] = useState(false);
  const [tool, setTool] = useState<DecorationTool>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [debug, setDebug] = useState<WorldDebugInfo | null>(null);
  const [audioSettings, setAudioSettingsState] = useState<WorldAudioSettings>(() => getWorldAudioSettings());
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const active = getActiveAccount();
    if (active?.type === "account") setAccountId(active.id);
    else router.replace("/");
    setCheckedAccount(true);
  }, [router]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (tool) { setTool(null); setDecorateOpen(false); api?.cancelDecoration(); }
      else setSettingsOpen((open) => !open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, tool]);

  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  }, []);

  const onApiReady = useCallback((next: WorldGameApi | null) => setApi(next), []);
  const callbacks = useMemo<WorldGameCallbacks>(() => ({
    onMove: world.sendMovement,
    onChangeScene: world.changeScene,
    onPlaceDecoration: world.placeDecoration,
    onMoveDecoration: world.moveDecoration,
    onRemoveDecoration: world.removeDecoration,
    onHint: setHint,
    onNotice: showNotice,
    onDebug: setDebug,
    onReady: () => setReady(true),
    onError: setFatalError,
  }), [showNotice, world.changeScene, world.moveDecoration, world.placeDecoration, world.removeDecoration, world.sendMovement]);

  const chooseTool = (next: DecorationTool) => {
    setTool(next);
    api?.setDecorationTool(next);
  };

  const changeAudio = (next: WorldAudioSettings) => {
    setAudioSettingsState(next);
    setWorldAudioSettings(next);
  };

  if (!checkedAccount || !accountId || !roomSession.room || !world.snapshot) {
    return (
      <main className={styles.root}>
        <div className="world-loading"><span>🏡</span><strong>Entrando no Nosso Mundo…</strong><small>{world.error ?? (roomSession.notFound ? "Este mundo só pode ser aberto pelo lobby de André e Flávia." : "Carregando o mundo compartilhado")}</small></div>
      </main>
    );
  }

  return (
    <main className={styles.root}>
      <WorldCanvas accountId={accountId} snapshot={world.snapshot} callbacks={callbacks} onApiReady={onApiReady} />

      <header className="world-topbar">
        <button onClick={() => router.push(`/sala/${PERSISTENT_DUO_ROOM_CODE}`)}>← Lobby</button>
        <div><strong>Nosso Mundo</strong><small>{debug?.scene === "house-interior" ? "Nossa casa" : "Vale das Duas Árvores"}</small></div>
        <button onClick={() => setSettingsOpen(true)} aria-label="Abrir configurações">⚙</button>
      </header>

      <div className="world-actions">
        <button className={decorateOpen ? "active" : ""} onClick={() => { const open = !decorateOpen; setDecorateOpen(open); if (!open) chooseTool(null); }}>🔨 <span>Modo Decorar</span></button>
      </div>

      {decorateOpen && (
        <section className="world-decoration-bar" aria-label="Ferramentas de decoração">
          {(Object.keys(DECORATION_ASSETS) as WorldDecorationType[]).map((type) => (
            <button key={type} className={tool?.kind === "place" && tool.type === type ? "selected" : ""} onClick={() => chooseTool({ kind: "place", type })}>
              <span>{type === "chair" ? "🪑" : type === "table" ? "▦" : type === "plant" ? "🪴" : type === "chest" ? "▰" : "╫"}</span>{DECORATION_ASSETS[type].label}
            </button>
          ))}
          <button className={tool?.kind === "move" ? "selected" : ""} onClick={() => chooseTool({ kind: "move" })}><span>✥</span>Mover</button>
          <button className={tool?.kind === "remove" ? "selected danger" : "danger"} onClick={() => chooseTool({ kind: "remove" })}><span>✕</span>Remover</button>
          <button onClick={() => { chooseTool(null); setDecorateOpen(false); }}><span>↩</span>Sair</button>
        </section>
      )}

      {hint && <div className="world-hint">{hint}</div>}
      {notice && <div className="world-notice" role="status">{notice}</div>}
      {debug && <div className="world-debug">FPS {debug.fps}<br />X {debug.x} · Y {debug.y}<br />{debug.scene}</div>}
      {!ready && !fatalError && <div className="world-curtain">Preparando o mapa…</div>}
      {(fatalError || world.error) && <div className="world-error"><strong>O mundo não carregou</strong><p>{fatalError ?? world.error}</p><button onClick={() => window.location.reload()}>Tentar novamente</button></div>}

      <MobileControls api={api} />
      <div className="world-rotate"><span>↻</span><strong>Gire o dispositivo</strong><p>Nosso Mundo funciona no celular em modo paisagem.</p></div>
      {settingsOpen && <WorldSettings accountId={accountId} settings={audioSettings} onChange={changeAudio} onClose={() => setSettingsOpen(false)} />}
    </main>
  );
}
