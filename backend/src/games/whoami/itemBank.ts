import { WHOAMI_ITEMS } from "./items";
import {
  WhoAmICategory,
  WhoAmIDifficulty,
  WhoAmIItem,
  isValidWhoAmICategory,
  isValidWhoAmIDifficulty,
} from "./types";

const BY_ID = new Map(WHOAMI_ITEMS.map((item) => [item.id, item] as const));

export function getWhoAmIItem(id: string): WhoAmIItem | null {
  return BY_ID.get(id) ?? null;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function selectWhoAmIItems(
  difficultyInput: unknown,
  categoryInput: unknown,
  count: number,
  excludeIds: string[] = []
): WhoAmIItem[] {
  const difficulty: WhoAmIDifficulty = isValidWhoAmIDifficulty(difficultyInput) ? difficultyInput : "medium";
  const category: WhoAmICategory = isValidWhoAmICategory(categoryInput) ? categoryInput : "all";
  const excluded = new Set(excludeIds);

  const strictPool = WHOAMI_ITEMS.filter(
    (item) =>
      item.difficulty === difficulty &&
      (category === "all" || item.category === category) &&
      !excluded.has(item.id)
  );

  // Categoria específica é uma regra rígida: NUNCA mistura itens de outra
  // categoria. Se faltarem itens naquela dificuldade, o fallback relaxa apenas
  // a dificuldade, mantendo a categoria escolhida pelo host. Em "all", aí sim
  // qualquer categoria pode entrar.
  const fallbackPool = WHOAMI_ITEMS.filter(
    (item) =>
      !excluded.has(item.id) &&
      (category === "all" || item.category === category) &&
      !strictPool.some((strict) => strict.id === item.id)
  );

  return shuffle([...strictPool, ...fallbackPool]).slice(0, Math.max(1, count));
}

export function normalizeWhoAmIGuess(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function isWhoAmIAnswerCorrect(item: WhoAmIItem, rawGuess: string): boolean {
  const guess = normalizeWhoAmIGuess(rawGuess);
  if (!guess) return false;
  const accepted = [item.answer, ...(item.aliases ?? [])].map(normalizeWhoAmIGuess);
  return accepted.includes(guess);
}
