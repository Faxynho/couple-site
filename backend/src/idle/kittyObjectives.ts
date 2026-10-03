import { KITTY_OBJECTIVE_POOL, KittyObjectiveDefinition } from "./idleConfig";

export type ObjectivePeriodName = "daily" | "weekly";

/** Peso de um grupo/missão que NÃO apareceu no período anterior (favorece variedade sem ser previsível). */
const FRESH_WEIGHT = 3;
const REPEAT_WEIGHT = 1;

function weightedPick<T>(entries: Array<{ value: T; weight: number }>, random: () => number): number {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;
  for (let index = 0; index < entries.length; index += 1) {
    roll -= entries[index].weight;
    if (roll < 0) return index;
  }
  return entries.length - 1;
}

/**
 * Sorteia `count` missões do pool para o período.
 * - no máximo uma missão por grupo (as 4 diárias / 3 semanais nunca são "parecidas");
 * - grupos e missões que apareceram no período anterior têm menos chance de repetir;
 * - missões com `minDaysLeft` só entram se ainda houver dias suficientes no período.
 */
export function pickKittyObjectives(
  period: ObjectivePeriodName,
  count: number,
  options: { random?: () => number; previousIds?: readonly string[]; daysLeft?: number; pool?: readonly KittyObjectiveDefinition[] } = {},
): string[] {
  const random = options.random ?? Math.random;
  const previous = new Set(options.previousIds ?? []);
  const daysLeft = options.daysLeft ?? Number.POSITIVE_INFINITY;
  const pool = options.pool ?? KITTY_OBJECTIVE_POOL;
  const eligible = pool.filter((item) => item.period === period && (item.minDaysLeft ?? 0) <= daysLeft);

  const byGroup = new Map<string, KittyObjectiveDefinition[]>();
  for (const item of eligible) byGroup.set(item.group, [...(byGroup.get(item.group) ?? []), item]);

  const groups = [...byGroup.entries()].map(([group, items]) => ({
    value: { group, items },
    weight: items.some((item) => previous.has(item.id)) ? REPEAT_WEIGHT : FRESH_WEIGHT,
  }));

  const chosen: string[] = [];
  while (chosen.length < count && groups.length > 0) {
    const [{ value }] = groups.splice(weightedPick(groups, random), 1);
    const candidates = value.items.map((item) => ({ value: item, weight: previous.has(item.id) ? REPEAT_WEIGHT : FRESH_WEIGHT }));
    chosen.push(candidates[weightedPick(candidates, random)].value.id);
  }
  return chosen;
}
