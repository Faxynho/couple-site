/**
 * Modo de partida compartilhado pelo Palavras Cruzadas e pelo Caça-Palavras:
 * "together" (Juntos, cooperativo) ou "duel" (um contra o outro).
 */
export const MATCH_MODES = {
  together: { label: "Juntos", emoji: "🤝", hint: "a mesma grade, preenchida em equipe" },
  duel: { label: "Duelo", emoji: "⚔️", hint: "mesma grade, progresso separado — quem termina primeiro vence" },
} as const;

export type MatchMode = keyof typeof MATCH_MODES;
