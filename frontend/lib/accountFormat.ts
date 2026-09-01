import { GameId } from "@/lib/types";
import { GAMES, DIFFICULTIES } from "@/lib/games";
import { SUDOKU_DIFFICULTIES } from "@/lib/sudokuTypes";
import { COLOR_DIFFICULTIES } from "@/lib/colorTypes";
import { CROSSWORD_DIFFICULTIES } from "@/lib/crosswordTypes";
import { WORDSEARCH_DIFFICULTIES } from "@/lib/wordsearchTypes";
import { QUIZ_DIFFICULTIES } from "@/lib/quizTypes";
import { MEMORY_DIFFICULTIES } from "@/lib/memoryTypes";
import { TERMO_VARIANTS } from "@/lib/termoTypes";
import { AIR_HOCKEY_DIFFICULTIES } from "@/lib/airHockeyTypes";
import { CHESS_DIFFICULTIES } from "@/lib/chessTypes";
import { NO_RANK } from "@/lib/accountTypes";
import type { AccountId, AccountsOverview } from "@/lib/accountTypes";

type RankInfo = { label: string; emoji: string };

/** Cada jogo (menos o Mini RPG) já tem seu próprio mapa de dificuldades em
 *  lib/<jogo>Types.ts — reaproveitados aqui em vez de duplicar rótulos. */
const RANK_MAPS: Partial<Record<GameId, Record<string, RankInfo>>> = {
  puzzle: DIFFICULTIES,
  sudoku: SUDOKU_DIFFICULTIES,
  colors: COLOR_DIFFICULTIES,
  crossword: CROSSWORD_DIFFICULTIES,
  wordsearch: WORDSEARCH_DIFFICULTIES,
  quiz: QUIZ_DIFFICULTIES,
  memory: MEMORY_DIFFICULTIES,
  termo: TERMO_VARIANTS,
  airhockey: AIR_HOCKEY_DIFFICULTIES,
  chess: CHESS_DIFFICULTIES,
};

/** Ordem de exibição dos ranks de cada jogo nas abas de Estatísticas/Recordes. */
export const GAME_RANKS: Record<GameId, string[]> = {
  puzzle: ["easy", "medium", "hard"],
  sudoku: ["easy", "medium", "hard"],
  colors: ["easy", "hard"],
  crossword: ["easy", "medium", "hard"],
  wordsearch: ["easy", "medium", "hard"],
  quiz: ["easy", "medium", "hard"],
  memory: ["easy", "medium", "hard"],
  termo: ["one", "dueto", "quarteto"],
  rpg: [NO_RANK],
  airhockey: ["easy", "medium", "hard"],
  chess: ["easy", "medium", "hard"],
};

/** O Quebra-cabeça é o único jogo sem nenhum modo de Duelo — usado pela aba
 *  de Recordes para explicar por que ele nunca tem uma marca ali. */
export const GAMES_WITHOUT_DUEL: GameId[] = ["puzzle"];

export function rankLabel(gameId: GameId, rank: string): string {
  if (rank === NO_RANK) return "Geral";
  return RANK_MAPS[gameId]?.[rank]?.label ?? rank;
}

const GENERIC_RANK_LABELS: Record<string, string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
  [NO_RANK]: "Geral",
};

/** Usado quando a dificuldade é somada entre jogos diferentes (ex.: "dificuldade
 *  mais jogada no modo Duo" no geral) — não tem mais um jogo específico para
 *  puxar o rótulo, então usa esse mapa genérico. */
export function genericRankLabel(rank: string): string {
  return GENERIC_RANK_LABELS[rank] ?? rank;
}

export function gameName(gameId: GameId): string {
  return GAMES.find((g) => g.id === gameId)?.name ?? gameId;
}

export function gameEmoji(gameId: GameId): string {
  return GAMES.find((g) => g.id === gameId)?.emoji ?? "🎮";
}

/** "1h 20min", "45min 10s", "32s" — para totais acumulados (tempo no site). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min ${seconds}s`;
  return `${seconds}s`;
}

/** Tempo de UMA partida (recorde), em mm:ss.d — precisão que faz diferença
 *  para comparar recordes de tempo curto. */
export function formatRecordTime(ms: number): string {
  const totalSeconds = Math.max(0, ms) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(1);
  return `${String(minutes).padStart(2, "0")}:${seconds.padStart(4, "0")}`;
}

export function formatRecordValue(value: number, scoreType: "time" | "points"): string {
  return scoreType === "time" ? formatRecordTime(value) : `${value} pts`;
}

/** Deriva a conquista do perfil apenas das vitórias pessoais em Duelo. A
 * ordem de GAMES é deliberadamente usada como desempate determinístico. */
export function duoCompetitiveTitle(accountId: AccountId, overview: AccountsOverview | null): string | null {
  if (!overview) return null;
  const wins = overview.duoPerAccount[accountId]?.gameWinCounts ?? {};
  let bestGame: GameId | null = null;
  let bestWins = 0;
  for (const game of GAMES) {
    const gameWins = wins[game.id] ?? 0;
    if (gameWins > bestWins) {
      bestWins = gameWins;
      bestGame = game.id;
    }
  }
  if (!bestGame) return null;
  return `${accountId === "andre" ? "Rei" : "Rainha"} do ${gameName(bestGame)}`;
}

/** Acha a chave com maior contagem num mapa de contagens (ex.: qual jogo mais
 *  jogado, qual dificuldade mais jogada) — ignora chaves zeradas/ausentes. */
export function pickTopEntry<T extends string>(
  counts: Partial<Record<T, number>> | undefined
): { key: T; count: number } | null {
  if (!counts) return null;
  let best: { key: T; count: number } | null = null;
  for (const key of Object.keys(counts) as T[]) {
    const count = counts[key] ?? 0;
    if (count > 0 && (!best || count > best.count)) best = { key, count };
  }
  return best;
}
