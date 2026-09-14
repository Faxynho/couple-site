"use client";

import { useEffect, useState } from "react";
import { AccountId } from "@/lib/accountSession";
import { WorldAudioSettings } from "@/world/audio/WorldAudioManager";
import { WorldCameraZoomInfo } from "@/world/game/WorldGameApi";
import { WorldMobileControlMode } from "@/world/settings/WorldInputSettings";

type SettingsTab = "general" | "controls";

export default function WorldSettings({
  accountId,
  settings,
  onChange,
  camera,
  onCameraZoomChange,
  mobileControlMode,
  onMobileControlModeChange,
  showMobileControls,
  onClose,
}: {
  accountId: AccountId;
  settings: WorldAudioSettings;
  onChange: (settings: WorldAudioSettings) => void;
  camera: WorldCameraZoomInfo;
  onCameraZoomChange: (zoom: number) => void;
  mobileControlMode: WorldMobileControlMode;
  onMobileControlModeChange: (mode: WorldMobileControlMode) => void;
  showMobileControls: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<SettingsTab>("general");

  useEffect(() => {
    if (!showMobileControls && tab === "controls") setTab("general");
  }, [showMobileControls, tab]);

  // 1..8 são níveis de distância. O zoom bruto do Phaser permanece sempre
  // INTEIRO (2x/3x/4x) para não reabrir ghost/jitter de pixel art.
  const zoomStep = 1;
  const zoomValue = Math.min(camera.max, Math.max(camera.min, Math.round(camera.zoom)));

  return (
    <div className="world-modal-backdrop" role="dialog" aria-modal="true" aria-label="Configurações do Nosso Mundo">
      <section className="world-panel world-settings">
        <div className="world-panel-title"><span>Configurações</span><button onClick={onClose} aria-label="Fechar">×</button></div>

        {showMobileControls && (
          <div className="world-settings-tabs" role="tablist" aria-label="Categorias das configurações">
            <button className={tab === "general" ? "active" : ""} onClick={() => setTab("general")} role="tab" aria-selected={tab === "general"}>Geral</button>
            <button className={tab === "controls" ? "active" : ""} onClick={() => setTab("controls")} role="tab" aria-selected={tab === "controls"}>Controles</button>
          </div>
        )}

        {tab === "general" && (
          <div className="world-settings-section">
            <label>Distância da câmera <strong>Nível {zoomValue}/{camera.max}</strong></label>
            <input
              type="range"
              min={camera.min}
              max={camera.max}
              step={zoomStep}
              value={zoomValue}
              onChange={(event) => onCameraZoomChange(Number(event.target.value))}
              aria-label="Distância da câmera"
            />
            <div className="world-range-labels"><span>Mais longe</span><span>Mais perto</span></div>

            <label>Música <strong>{Math.round(settings.musicVolume * 100)}%</strong></label>
            <input type="range" min="0" max="100" value={Math.round(settings.musicVolume * 100)} onChange={(event) => onChange({ ...settings, musicVolume: Number(event.target.value) / 100 })} />
            <label>Efeitos sonoros <strong>{Math.round(settings.sfxVolume * 100)}%</strong></label>
            <input type="range" min="0" max="100" value={Math.round(settings.sfxVolume * 100)} onChange={(event) => onChange({ ...settings, sfxVolume: Number(event.target.value) / 100 })} />

            <div className="world-skin-card">
              <img src={`/world/characters/${accountId}/walk.png`} alt="Skin atual" />
              <div><small>Skin atual</small><strong>{accountId === "andre" ? "André clássico" : "Flávia clássica"}</strong><p>Novas skins poderão ser adicionadas aqui no futuro.</p></div>
            </div>
          </div>
        )}

        {showMobileControls && tab === "controls" && (
          <div className="world-settings-section world-controls-settings">
            <p className="world-settings-help">Escolha como você quer se movimentar no celular.</p>

            <button className={`world-control-option ${mobileControlMode === "dpad" ? "selected" : ""}`} onClick={() => onMobileControlModeChange("dpad")}>
              <span className="world-control-option-icon">✥</span>
              <span><strong>Botões — 8 direções</strong><small>Direcional com cima, baixo, lados e quatro diagonais.</small></span>
              <span className="world-control-check">{mobileControlMode === "dpad" ? "✓" : ""}</span>
            </button>

            <button className={`world-control-option ${mobileControlMode === "joystick" ? "selected" : ""}`} onClick={() => onMobileControlModeChange("joystick")}>
              <span className="world-control-option-icon">◉</span>
              <span><strong>Joystick</strong><small>Puxe o analógico virtual livremente para qualquer direção.</small></span>
              <span className="world-control-check">{mobileControlMode === "joystick" ? "✓" : ""}</span>
            </button>

            <button className={`world-control-option ${mobileControlMode === "tap" ? "selected" : ""}`} onClick={() => onMobileControlModeChange("tap")}>
              <span className="world-control-option-icon">☝</span>
              <span><strong>Toque para andar</strong><small>Sem botões. Toque no mapa para andar; toque em uma porta para ir até ela e interagir.</small></span>
              <span className="world-control-check">{mobileControlMode === "tap" ? "✓" : ""}</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
