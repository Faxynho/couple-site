export type MemoryDifficulty = "easy" | "medium" | "hard";
export type MemoryMode = "solo" | "duel" | "together";

export interface MemoryPublicSlot {
  id: string;
  /** Só chega ao cliente quando esta carta está visível para ele. */
  imageSrc: string | null;
  empty: boolean;
}

export interface MemoryPlayerProgress {
  matchedSlotIds: string[];
  openSlotIds: string[];
  score: number;
  combo: number;
  pairsFound: number;
  mistakes: number;
  mismatchUntil: number | null;
  finished: boolean;
  completed: boolean;
  finishedAt: number | null;
  timeUsedMs: number | null;
}

export interface MemoryResultEntry {
  playerId: string;
  place: number;
  score: number;
  pairsFound: number;
  timeUsedMs: number;
  completed: boolean;
}

export interface MemoryState {
  difficulty: MemoryDifficulty;
  mode: MemoryMode;
  rows: number;
  cols: number;
  pairCount: number;
  slots: MemoryPublicSlot[];
  expectedPlayers: string[];
  progress: Record<string, MemoryPlayerProgress>;
  startedAt: number;
  previewEndsAt: number;
  playStartedAt: number | null;
  deadlineAt: number | null;
  finished: boolean;
  finishedAt: number | null;
  results: MemoryResultEntry[];
}

export const MEMORY_DIFFICULTIES = {
  easy: { label: "Fácil", emoji: "🟢", hint: "4 pares · grade 3×3" },
  medium: { label: "Médio", emoji: "🟡", hint: "8 pares · grade 4×4" },
  hard: { label: "Difícil", emoji: "🔴", hint: "12 pares · grade 5×5" },
} as const;

export const MEMORY_MODES = {
  solo: { label: "Solo", emoji: "🙋", hint: "encontre todos os pares" },
  together: { label: "Juntos", emoji: "🤝", hint: "uma grade e um placar compartilhados" },
  duel: { label: "Duelo", emoji: "⚔️", hint: "mesma disposição, progresso independente" },
} as const;
