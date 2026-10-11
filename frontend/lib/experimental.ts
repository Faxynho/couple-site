import type { IdleSnapshot } from "./idleTypes";

/**
 * Recurso experimental ligado neste snapshot? Só o ambiente DEV recebe ids (lista do backend em
 * backend/src/idle/experimental.ts); no jogo normal a lista é sempre vazia. Use para esconder UI "só DEV".
 * As mecânicas `kittyDev*` (constelações, estrelas, despertar...) NÃO são experimentais: valem nos dois.
 */
export function isExperimental(snapshot: Pick<IdleSnapshot, "experimentalFeatures"> | null | undefined, feature: string): boolean {
  return Boolean(snapshot?.experimentalFeatures?.includes(feature));
}
