import { WORLD_CONFIG } from "@/world/config/worldConfig";
import { WORLD_AMBIENCE_TRACK, WORLD_MUSIC_TRACKS, WorldMusicTrack } from "@/world/audio/worldMusic";

const STORAGE_KEY = "couple-site:world-audio";
const EVENT_NAME = "couple-site:world-audio-change";

export interface WorldAudioSettings { musicVolume: number; sfxVolume: number }

export interface WorldMusicPlaybackState {
  trackIndex: number;
  track: WorldMusicTrack | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

type PlaybackListener = (state: WorldMusicPlaybackState) => void;

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

/**
 * Controla toda a camada de áudio do mundo no nível da página. Como o manager
 * não pertence às cenas do Phaser, trocar exterior/casa não reinicia música
 * nem ambience.
 */
export class WorldAudioManager {
  private settings = getWorldAudioSettings();
  private readonly music: HTMLAudioElement;
  private readonly ambience: HTMLAudioElement;
  private readonly listeners = new Set<PlaybackListener>();
  private trackIndex = 0;
  private wantsMusicPlayback = true;
  private destroyed = false;

  constructor(
    private readonly playlist: readonly WorldMusicTrack[] = WORLD_MUSIC_TRACKS,
    ambienceUrl = WORLD_AMBIENCE_TRACK.url,
  ) {
    this.music = new Audio();
    this.music.preload = "metadata";
    this.music.volume = this.settings.musicVolume;

    this.ambience = new Audio(ambienceUrl);
    this.ambience.preload = "auto";
    this.ambience.loop = true;
    this.ambience.volume = this.settings.sfxVolume;

    if (this.playlist[0]) this.music.src = this.playlist[0].url;

    this.music.addEventListener("loadedmetadata", this.handlePlaybackChange);
    this.music.addEventListener("durationchange", this.handlePlaybackChange);
    this.music.addEventListener("timeupdate", this.handlePlaybackChange);
    this.music.addEventListener("play", this.handlePlaybackChange);
    this.music.addEventListener("pause", this.handlePlaybackChange);
    this.music.addEventListener("ended", this.handleEnded);
  }

  private handlePlaybackChange = () => this.emitPlaybackState();
  private handleEnded = () => this.next();

  getPlaybackState(): WorldMusicPlaybackState {
    const track = this.playlist[this.trackIndex] ?? null;
    const currentTime = Number.isFinite(this.music.currentTime) ? this.music.currentTime : 0;
    const duration = Number.isFinite(this.music.duration) ? this.music.duration : 0;
    return { trackIndex: this.trackIndex, track, currentTime, duration, isPlaying: !this.music.paused && !this.music.ended };
  }

  subscribePlayback(listener: PlaybackListener) {
    this.listeners.add(listener);
    listener(this.getPlaybackState());
    return () => this.listeners.delete(listener);
  }

  /** Tenta iniciar trilha + ambience. Em navegadores que bloqueiam autoplay,
   * resumeFromGesture() conclui a inicialização no primeiro toque/clique. */
  async start() {
    this.wantsMusicPlayback = true;
    await Promise.allSettled([this.tryPlayMusic(), this.tryPlayAmbience()]);
  }

  resumeFromGesture() {
    if (this.destroyed) return;
    if (this.wantsMusicPlayback && this.music.paused) void this.tryPlayMusic();
    if (this.ambience.paused) void this.tryPlayAmbience();
  }

  playMusic() {
    this.wantsMusicPlayback = true;
    void this.tryPlayMusic();
  }

  pauseMusic() {
    this.wantsMusicPlayback = false;
    this.music.pause();
    this.emitPlaybackState();
  }

  toggleMusic() {
    if (this.music.paused || this.music.ended) this.playMusic();
    else this.pauseMusic();
  }

  next() {
    if (this.playlist.length === 0) return;
    this.setTrack((this.trackIndex + 1) % this.playlist.length);
  }

  previous() {
    if (this.playlist.length === 0) return;
    this.setTrack((this.trackIndex - 1 + this.playlist.length) % this.playlist.length);
  }

  seek(seconds: number) {
    if (!Number.isFinite(seconds)) return;
    const duration = Number.isFinite(this.music.duration) ? this.music.duration : 0;
    const target = Math.max(0, duration > 0 ? Math.min(duration, seconds) : seconds);
    try { this.music.currentTime = target; } catch { return; }
    this.emitPlaybackState();
  }

  apply(settings: WorldAudioSettings) {
    this.settings = { musicVolume: clamp(settings.musicVolume), sfxVolume: clamp(settings.sfxVolume) };
    this.music.volume = this.settings.musicVolume;
    this.ambience.volume = this.settings.sfxVolume;
  }

  playSfx(audio: HTMLAudioElement) {
    audio.volume = this.settings.sfxVolume;
    void audio.play().catch(() => {});
  }

  destroy() {
    this.destroyed = true;
    this.listeners.clear();
    this.music.removeEventListener("loadedmetadata", this.handlePlaybackChange);
    this.music.removeEventListener("durationchange", this.handlePlaybackChange);
    this.music.removeEventListener("timeupdate", this.handlePlaybackChange);
    this.music.removeEventListener("play", this.handlePlaybackChange);
    this.music.removeEventListener("pause", this.handlePlaybackChange);
    this.music.removeEventListener("ended", this.handleEnded);
    this.music.pause();
    this.ambience.pause();
  }

  private setTrack(index: number) {
    const track = this.playlist[index];
    if (!track) return;
    this.trackIndex = index;
    this.music.src = track.url;
    this.music.load();
    this.emitPlaybackState();
    if (this.wantsMusicPlayback) void this.tryPlayMusic();
  }

  private async tryPlayMusic() {
    if (this.destroyed || !this.playlist[this.trackIndex]) return;
    try { await this.music.play(); } catch { /* autoplay pode exigir gesto do usuário */ }
    this.emitPlaybackState();
  }

  private async tryPlayAmbience() {
    if (this.destroyed) return;
    try { await this.ambience.play(); } catch { /* autoplay pode exigir gesto do usuário */ }
  }

  private emitPlaybackState() {
    if (this.destroyed) return;
    const state = this.getPlaybackState();
    for (const listener of this.listeners) listener(state);
  }
}
