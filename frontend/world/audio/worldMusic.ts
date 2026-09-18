export interface WorldMusicTrack {
  id: string;
  title: string;
  url: string;
}

/**
 * Catálogo único da trilha do mundo. Para adicionar uma música nova no futuro,
 * basta colocar o arquivo em public/world/audio/music e registrar uma entrada aqui.
 */
export const WORLD_MUSIC_TRACKS: readonly WorldMusicTrack[] = [
  { id: "ocarina-title-theme", title: "Ocarina Title Theme", url: "/world/audio/music/ocarina-title-theme.mp3" },
  { id: "lake-hylia", title: "Lake Hylia", url: "/world/audio/music/lake-hylia.mp3" },
  { id: "ocarina-of-time", title: "Ocarina of Time", url: "/world/audio/music/ocarina-of-time.mp3" },
  { id: "midnas-lament", title: "Midna's Lament", url: "/world/audio/music/midnas-lament.mp3" },
  { id: "zeldas-lullaby-rain", title: "Zelda's Lullaby (Rain)", url: "/world/audio/music/zeldas-lullaby-rain.mp3" },
];

export const WORLD_AMBIENCE_TRACK = {
  id: "winter-morning",
  title: "Winter Morning",
  url: "/world/audio/ambience/winter-morning.mp3",
} as const;
