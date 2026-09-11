import { WORLD_CONFIG } from "@/world/config/worldConfig";

const STORAGE_KEY = "couple-site:world-audio";
const EVENT_NAME = "couple-site:world-audio-change";

export interface WorldAudioSettings { musicVolume: number; sfxVolume: number }

function clamp(value: number) { return Math.max(0, Math.min(1, value)); }

export function getWorldAudioSettings(): WorldAudioSettings {
  const fallback = { musicVolume: WORLD_CONFIG.audio.defaultMusicVolume, sfxVolume: WORLD_CONFIG.audio.defaultSfxVolume };
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    return {
      musicVolume: Number.isFinite(parsed?.musicVolume) ? clamp(parsed.musicVolume) : fallback.musicVolume,
      sfxVolume: Number.isFinite(parsed?.sfxVolume) ? clamp(parsed.sfxVolume) : fallback.sfxVolume,
    };
  } catch { return fallback; }
}

export function setWorldAudioSettings(settings: WorldAudioSettings) {
  if (typeof window === "undefined") return;
  const next = { musicVolume: clamp(settings.musicVolume), sfxVolume: clamp(settings.sfxVolume) };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
}

export function subscribeWorldAudioSettings(listener: (settings: WorldAudioSettings) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => listener((event as CustomEvent<WorldAudioSettings>).detail ?? getWorldAudioSettings());
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

/** Categoria única para todos os sons do mundo. Sem arquivos de áudio nesta
 * versão, os ganhos já ficam prontos para músicas e efeitos futuros. */
export class WorldAudioManager {
  private settings = getWorldAudioSettings();
  private music: HTMLAudioElement | null = null;

  setMusicTrack(url: string | null) {
    this.music?.pause();
    this.music = url ? new Audio(url) : null;
    if (this.music) { this.music.loop = true; this.music.volume = this.settings.musicVolume; }
  }

  apply(settings: WorldAudioSettings) {
    this.settings = settings;
    if (this.music) this.music.volume = settings.musicVolume;
  }

  playSfx(audio: HTMLAudioElement) {
    audio.volume = this.settings.sfxVolume;
    void audio.play().catch(() => {});
  }

  destroy() { this.music?.pause(); this.music = null; }
}
