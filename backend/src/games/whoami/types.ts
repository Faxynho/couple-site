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

export interface WhoAmIItem {
  id: string;
  answer: string;
  aliases?: string[];
  category: Exclude<WhoAmICategory, "all">;
  difficulty: WhoAmIDifficulty;
  hints: [string, string, string, string, string];
}

export const WHOAMI_DIFFICULTIES: WhoAmIDifficulty[] = ["easy", "medium", "hard"];
export const WHOAMI_MODES: WhoAmIMode[] = ["duelHints", "classicDuel", "togetherHints"];

export const WHOAMI_CATEGORIES: WhoAmICategory[] = [
  "all",
  "moviesSeries",
  "games",
  "characters",
  "animeCartoons",
  "famous",
  "animals",
  "places",
  "food",
  "objects",
  "general",
];

export function isValidWhoAmIDifficulty(value: unknown): value is WhoAmIDifficulty {
  return typeof value === "string" && (WHOAMI_DIFFICULTIES as string[]).includes(value);
}

export function isValidWhoAmIMode(value: unknown): value is WhoAmIMode {
  return typeof value === "string" && (WHOAMI_MODES as string[]).includes(value);
}

export function isValidWhoAmICategory(value: unknown): value is WhoAmICategory {
  return typeof value === "string" && (WHOAMI_CATEGORIES as string[]).includes(value);
}
