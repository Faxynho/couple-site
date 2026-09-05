export type WhoAmIDifficulty = "easy" | "medium" | "hard";
export type WhoAmIMode = "duelHints" | "classicDuel" | "togetherHints";
export type WhoAmICategory =
  | "all"
  | "moviesSeries"
  | "games"
  | "characters"
  | "animeCartoons"
  | "famous"
  | "animals"
  | "places"
  | "food"
  | "objects"
  | "general";

export interface WhoAmIPlayerProgress {
  hintsRevealed: number;
  attempts: number;
  correct: boolean;
  gaveUp: boolean;
  answerTimeMs: number | null;
}

export interface WhoAmIState {
  difficulty: WhoAmIDifficulty;
  mode: WhoAmIMode;
  category: WhoAmICategory;
  expectedPlayers: string[];
  startedAt: number;
  finished: boolean;
  finishedAt: number | null;
  winnerId: string | null;
  resultReason: "duelHints" | "classicFirst" | "togetherSolved" | "giveUp" | "togetherGiveUp" | null;
  revealedHintCount: number;
  hints: (string | null)[];
  answer: string | null;
  playerProgress: Record<string, WhoAmIPlayerProgress>;
  ownLastGuessCorrect: boolean | null;
  ownLastGuessAt: number | null;
  teamAttempts: number;
  teamLastGuessCorrect: boolean | null;
  teamLastGuessAt: number | null;
  classicPartnerIdentity: { answer: string; category: WhoAmICategory } | null;
  classicOwnIdentity: { answer: string; category: WhoAmICategory } | null;
  classicRevealedIdentities: Record<string, string> | null;
}

export const WHOAMI_DIFFICULTIES = {
  easy: { label: "Fácil", emoji: "🟢", hint: "só coisas muito conhecidas" },
  medium: { label: "Médio", emoji: "🟡", hint: "conhecido, mas exige um pouco mais" },
  hard: { label: "Difícil", emoji: "🔴", hint: "para quando quiserem sofrer um pouquinho" },
} as const;

export const WHOAMI_MODES = {
  duelHints: { label: "Duelo · Pistas", emoji: "⚔️", hint: "mesma resposta; menos pistas vence" },
  classicDuel: { label: "Duelo · Clássico", emoji: "🎭", hint: "vocês mesmos dão as pistas" },
  togetherHints: { label: "Juntos · Pistas", emoji: "💞", hint: "mesmas pistas e uma resposta da dupla" },
} as const;

export const WHOAMI_CATEGORIES = {
  all: { label: "Tudo misturado", emoji: "🎲" },
  moviesSeries: { label: "Filmes e séries", emoji: "🎬" },
  games: { label: "Games", emoji: "🎮" },
  characters: { label: "Personagens", emoji: "🦸" },
  animeCartoons: { label: "Anime e desenhos", emoji: "🧙" },
  famous: { label: "Famosos", emoji: "🌟" },
  animals: { label: "Animais", emoji: "🐾" },
  places: { label: "Lugares", emoji: "🌎" },
  food: { label: "Comidas", emoji: "🍕" },
  objects: { label: "Objetos", emoji: "📦" },
  general: { label: "Geral", emoji: "🧠" },
} as const;

export function formatWhoAmITime(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const seconds = Math.max(0, ms) / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
