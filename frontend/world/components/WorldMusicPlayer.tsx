"use client";

import { useEffect, useState } from "react";
import { WorldAudioManager } from "@/world/audio/WorldAudioManager";

function formatTime(value: number) {
  const total = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function WorldMusicPlayer({ manager }: { manager: WorldAudioManager }) {
  const [playback, setPlayback] = useState(() => manager.getPlaybackState());

  useEffect(() => manager.subscribePlayback(setPlayback), [manager]);

  const duration = Math.max(0, playback.duration);
  const currentTime = Math.min(Math.max(0, playback.currentTime), duration || playback.currentTime);

  return (
    <section className="world-music-player" aria-label="Player de música" onPointerDown={(event) => event.stopPropagation()}>
      <div className="world-music-player-head">
        <span aria-hidden="true">♫</span>
        <div>
          <small>Tocando agora</small>
          <strong title={playback.track?.title}>{playback.track?.title ?? "Carregando música…"}</strong>
        </div>
      </div>

      <div className="world-music-controls">
        <button type="button" onClick={() => manager.previous()} aria-label="Música anterior" title="Anterior">⏮</button>
        <button type="button" className="primary" onClick={() => manager.toggleMusic()} aria-label={playback.isPlaying ? "Pausar música" : "Tocar música"} title={playback.isPlaying ? "Pausar" : "Tocar"}>
          {playback.isPlaying ? "❚❚" : "▶"}
        </button>
        <button type="button" onClick={() => manager.next()} aria-label="Próxima música" title="Próxima">⏭</button>
      </div>

      <div className="world-music-progress">
        <span>{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={Math.max(1, duration)}
          step="0.1"
          value={Math.min(currentTime, Math.max(1, duration))}
          onChange={(event) => manager.seek(Number(event.target.value))}
          aria-label="Progresso da música"
          disabled={duration <= 0}
        />
        <span>{formatTime(duration)}</span>
      </div>
    </section>
  );
}
