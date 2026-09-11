"use client";

import { AccountId } from "@/lib/accountSession";
import { WorldAudioSettings } from "@/world/audio/WorldAudioManager";

export default function WorldSettings({ accountId, settings, onChange, onClose }: { accountId: AccountId; settings: WorldAudioSettings; onChange: (settings: WorldAudioSettings) => void; onClose: () => void }) {
  return (
    <div className="world-modal-backdrop" role="dialog" aria-modal="true" aria-label="Configurações do Nosso Mundo">
      <section className="world-panel world-settings">
        <div className="world-panel-title"><span>Configurações</span><button onClick={onClose} aria-label="Fechar">×</button></div>
        <label>Música <strong>{Math.round(settings.musicVolume * 100)}%</strong></label>
        <input type="range" min="0" max="100" value={Math.round(settings.musicVolume * 100)} onChange={(event) => onChange({ ...settings, musicVolume: Number(event.target.value) / 100 })} />
        <label>Efeitos sonoros <strong>{Math.round(settings.sfxVolume * 100)}%</strong></label>
        <input type="range" min="0" max="100" value={Math.round(settings.sfxVolume * 100)} onChange={(event) => onChange({ ...settings, sfxVolume: Number(event.target.value) / 100 })} />
        <div className="world-skin-card">
          <img src={`/world/characters/${accountId}/walk.png`} alt="Skin atual" />
          <div><small>Skin atual</small><strong>{accountId === "andre" ? "André clássico" : "Flávia clássica"}</strong><p>Novas skins poderão ser adicionadas aqui no futuro.</p></div>
        </div>
      </section>
    </div>
  );
}
