import type { AccountId } from "@/lib/accountSession";

/**
 * Nível e XP exibidos no perfil.
 *
 * O site AINDA NÃO TEM sistema de nível: este arquivo existe só para o selo e a
 * barra de XP do perfil já terem onde ler os dados. Quando o sistema de nível
 * for criado, é só trocar o corpo de `getPlayerLevel` para ler o nível real
 * (do `overview` do servidor, por exemplo) — o visual não precisa mudar.
 *
 * Para VER o selo preenchido como na imagem de referência enquanto isso, troque
 * PLACEHOLDER_LEVEL por `{ level: 8, xp: 650, xpToNext: 1000 }`.
 */
export interface PlayerLevelInfo {
  level: number;
  /** XP acumulado dentro do nível atual. */
  xp: number;
  /** XP necessário para chegar ao próximo nível. */
  xpToNext: number;
}

export const PLACEHOLDER_LEVEL: PlayerLevelInfo = { level: 1, xp: 0, xpToNext: 100 };

export function getPlayerLevel(accountId: AccountId): PlayerLevelInfo {
  void accountId; // ainda não usado: o placeholder é igual para todas as contas
  return PLACEHOLDER_LEVEL;
}

/** Fração (0–1) da barra de XP, sempre segura contra divisão por zero e valores fora da faixa. */
export function levelProgress(info: PlayerLevelInfo): number {
  if (!Number.isFinite(info.xp) || !Number.isFinite(info.xpToNext) || info.xpToNext <= 0) return 0;
  return Math.min(1, Math.max(0, info.xp / info.xpToNext));
}
