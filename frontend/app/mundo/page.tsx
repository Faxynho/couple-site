"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveAccount, AccountId } from "@/lib/accountSession";
import { useRoomSession } from "@/hooks/useRoomSession";
import { PERSISTENT_DUO_ROOM_CODE } from "@/lib/persistentDuo";
import { DecorationCategory, DECORATION_CATEGORIES, getCatalogItems } from "@/world/config/decorationCatalog";
import { getWorldAudioSettings, setWorldAudioSettings, WorldAudioSettings } from "@/world/audio/WorldAudioManager";
import WorldCanvas from "@/world/components/WorldCanvas";
import WorldSettings from "@/world/components/WorldSettings";
import MobileControls from "@/world/components/MobileControls";
import { WorldCameraZoomInfo, WorldGameApi, WorldGameCallbacks } from "@/world/game/WorldGameApi";
import { useWorldSession } from "@/world/multiplayer/useWorldSession";
import { DEFAULT_WORLD_INPUT_SETTINGS, getWorldInputSettings, setWorldInputSettings, WorldInputSettings, WorldMobileControlMode } from "@/world/settings/WorldInputSettings";
import { DecorationTool, WorldDebugInfo } from "@/world/types";
import styles from "./World.module.css";

async function requestWorldFullscreen() {
  if (typeof document === "undefined" || document.fullscreenElement) return;

  try {
    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
  } catch {
    // Alguns navegadores mobile só permitem fullscreen durante um gesto direto.
  }
}

async function exitWorldFullscreen() {
  if (typeof document === "undefined" || !document.fullscreenElement) return;

  try {
    await document.exitFullscreen();
  } catch {
    // Sair do fullscreen não deve impedir a volta ao lobby.
  }
}

const DEFAULT_CAMERA_INFO: WorldCameraZoomInfo = {
  zoom: DEFAULT_WORLD_INPUT_SETTINGS.cameraZoom,
  min: 1,
  max: 4,
};

const CATEGORY_LABELS: Record<DecorationCategory, string> = {
  plants: "Plantas",
  decorations: "Decorações",
  furniture: "Móveis",
  paths: "Caminhos",
  nature: "Natureza",
  terrain: "Terreno",
};

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
  const [decorationCategory, setDecorationCategory] = useState<DecorationCategory>("plants");
  const [tool, setTool] = useState<DecorationTool>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [debug, setDebug] = useState<WorldDebugInfo | null>(null);
  const [audioSettings, setAudioSettingsState] = useState<WorldAudioSettings>(() => getWorldAudioSettings());
  const [inputSettings, setInputSettingsState] = useState<WorldInputSettings>(DEFAULT_WORLD_INPUT_SETTINGS);
  const [cameraInfo, setCameraInfo] = useState<WorldCameraZoomInfo>(DEFAULT_CAMERA_INFO);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const active = getActiveAccount();
    if (active?.type === "account") setAccountId(active.id);
    else router.replace("/");
    setCheckedAccount(true);
  }, [router]);

  useEffect(() => {
    setInputSettingsState(getWorldInputSettings());

    const media = window.matchMedia("(pointer: coarse)");
    const updatePointerMode = () => setCoarsePointer(media.matches);
    updatePointerMode();
    media.addEventListener?.("change", updatePointerMode);
    return () => media.removeEventListener?.("change", updatePointerMode);
  }, []);

  useEffect(() => {
    void requestWorldFullscreen();

    const retryFullscreen = () => {
      void requestWorldFullscreen();
    };

    document.addEventListener("pointerdown", retryFullscreen, { once: true, capture: true });

    return () => {
      document.removeEventListener("pointerdown", retryFullscreen, true);
    };
  }, []);

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

  useEffect(() => {
    if (!api) return;
    api.setTapToMoveEnabled(coarsePointer && inputSettings.mobileControlMode === "tap");
    const info = api.setCameraZoom(inputSettings.cameraZoom);
    setCameraInfo(info);
  }, [api, coarsePointer, inputSettings.cameraZoom, inputSettings.mobileControlMode]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  }, []);

  const onApiReady = useCallback((next: WorldGameApi | null) => setApi(next), []);
  const callbacks = useMemo<WorldGameCallbacks>(() => ({
    onMove: world.sendMovement,
    onAction: world.sendAction,
    onChangeScene: world.changeScene,
    onPlaceDecoration: world.placeDecoration,
    onMoveDecoration: world.moveDecoration,
    onRemoveDecoration: world.removeDecoration,
    onPaintTerrain: world.paintTerrain,
    onRemoveTerrain: world.removeTerrain,
    onHint: setHint,
    onNotice: showNotice,
    onDebug: setDebug,
    onCameraZoomChange: setCameraInfo,
    onReady: () => setReady(true),
    onError: setFatalError,
  }), [showNotice, world.changeScene, world.moveDecoration, world.paintTerrain, world.placeDecoration, world.removeDecoration, world.removeTerrain, world.sendAction, world.sendMovement]);

  const chooseTool = (next: DecorationTool) => {
    setTool(next);
    api?.setDecorationTool(next);
  };

  const toggleDecorationMode = () => {
    if (decorateOpen) {
      chooseTool(null);
      setDecorateOpen(false);
      return;
    }
    setDecorateOpen(true);
  };

  const changeAudio = (next: WorldAudioSettings) => {
    setAudioSettingsState(next);
    setWorldAudioSettings(next);
  };

  const saveInputSettings = (next: WorldInputSettings) => {
    setInputSettingsState(next);
    setWorldInputSettings(next);
  };

  const changeCameraZoom = (zoom: number) => {
    saveInputSettings({ ...inputSettings, cameraZoom: zoom });
    const info = api?.setCameraZoom(zoom);
    if (info) setCameraInfo(info);
  };

  const changeMobileControlMode = (mode: WorldMobileControlMode) => {
    saveInputSettings({ ...inputSettings, mobileControlMode: mode });
  };

  const returnToLobby = async () => {
    await exitWorldFullscreen();
    router.push(`/sala/${PERSISTENT_DUO_ROOM_CODE}`);
  };

  const currentScene = world.snapshot?.players.find((player) => player.accountId === accountId)?.scene ?? "exterior";
  const visibleCatalogItems = getCatalogItems(decorationCategory, currentScene);

  if (!checkedAccount || !accountId || !roomSession.room || !world.snapshot) {
    return (
      <main className={styles.root}>
        <div className="world-loading"><span>🏡</span><strong>Entrando no Nosso Mundo…</strong><small>{world.error ?? (roomSession.notFound ? "Este mundo só pode ser aberto pelo lobby de André e Flávia." : "Carregando o mundo compartilhado")}</small></div>
      </main>
    );
  }

  return (
    <main className={styles.root}>
      <WorldCanvas accountId={accountId} snapshot={world.snapshot} actionEvent={world.remoteAction} decorationEffect={world.decorationEffect} callbacks={callbacks} onApiReady={onApiReady} />

      <header className="world-topbar">
        <button onClick={() => void returnToLobby()}>← Lobby</button>
        <div><strong>Nosso Mundo</strong><small>{debug?.scene === "house-interior" ? "Nossa casa" : "Vale das Duas Árvores"}</small></div>
        <button onClick={() => setSettingsOpen(true)} aria-label="Abrir configurações">⚙</button>
      </header>

      <div className="world-actions">
        <button
          type="button"
          className={decorateOpen ? "active" : ""}
          onClick={toggleDecorationMode}
          aria-label="Modo decoração"
          aria-pressed={decorateOpen}
          title="Modo decoração"
        >
          🔨
        </button>
      </div>

      {decorateOpen && (
        <section className="world-decoration-panel" aria-label="Ferramentas de decoração" onPointerDown={(event) => event.stopPropagation()}>
          <nav className="world-decoration-tabs" aria-label="Categorias de decoração">
            {DECORATION_CATEGORIES.map((category) => (
              <button type="button" key={category} className={decorationCategory === category ? "active" : ""} onClick={() => { setDecorationCategory(category); chooseTool(null); }}>
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </nav>
          <div className="world-decoration-content">
            <div className="world-decoration-items">
              {visibleCatalogItems.map((item) => (
                <button type="button" key={item.id} className={tool?.kind === "place" && tool.itemId === item.id ? "selected" : ""} onClick={() => chooseTool({ kind: "place", itemId: item.id })}>
                  <span>{item.icon}</span>{item.name}
                </button>
              ))}
              {visibleCatalogItems.length === 0 && <p>Nenhum item confirmado para esta área.</p>}
            </div>
            <div className="world-decoration-tools" aria-label="Ações de decoração">
              <button type="button" className={tool?.kind === "move" ? "selected" : ""} onClick={() => chooseTool({ kind: "move" })} aria-label="Mover decoração" title="Mover decoração">
                <span aria-hidden="true">✥</span>
              </button>
              <button type="button" className={tool?.kind === "remove" ? "selected danger" : "danger"} onClick={() => chooseTool({ kind: "remove" })} aria-label="Remover decoração" title="Remover decoração">
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {hint && <div className="world-hint">{hint}</div>}
      {notice && <div className="world-notice" role="status">{notice}</div>}
      {debug && <div className="world-debug">FPS {debug.fps}<br />X {debug.x} · Y {debug.y}<br />{debug.scene}</div>}
      {!ready && !fatalError && <div className="world-curtain">Preparando o mapa…</div>}
      {(fatalError || world.error) && <div className="world-error"><strong>O mundo não carregou</strong><p>{fatalError ?? world.error}</p><button onClick={() => window.location.reload()}>Tentar novamente</button></div>}

      <MobileControls api={api} mode={inputSettings.mobileControlMode} />
      <div className="world-rotate"><span>↻</span><strong>Gire o dispositivo</strong><p>Nosso Mundo funciona no celular em modo paisagem.</p></div>
      {settingsOpen && (
        <WorldSettings
          accountId={accountId}
          settings={audioSettings}
          onChange={changeAudio}
          camera={cameraInfo}
          onCameraZoomChange={changeCameraZoom}
          mobileControlMode={inputSettings.mobileControlMode}
          onMobileControlModeChange={changeMobileControlMode}
          showMobileControls={coarsePointer}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}
