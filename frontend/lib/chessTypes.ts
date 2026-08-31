export type ChessDifficulty = "easy" | "medium" | "hard";
export type ChessColor = "w" | "b";
export type ChessPromotion = "q" | "r" | "b" | "n";

export interface ChessMove {
  from: string;
  to: string;
  promotion?: ChessPromotion;
  captured?: string;
}

export interface ChessState {
  mode: "solo" | "duel";
  difficulty: ChessDifficulty;
  colorByPlayerId: Record<string, ChessColor>;
  humanPlayerIds: string[];
  fen: string;
  turn: ChessColor;
  startedAt: number;
  finishedAt: number | null;
  moveCount: number;
  history: string[];
  lastMove: { from: string; to: string; color: ChessColor; piece: string; captured?: string; promotion?: string; san: string } | null;
  captured: { w: string[]; b: string[] };
  inCheck: ChessColor | null;
  result: { winnerId: string | null; reason: "checkmate" | "stalemate" | "threefold" | "insufficient-material" | "fifty-move" | "draw" } | null;
  legalMoves: ChessMove[];
}

export const CHESS_DIFFICULTIES: Record<ChessDifficulty, { label: string; emoji: string; hint: string }> = {
  easy: { label: "Fácil", emoji: "🌷", hint: "mais leve e permissivo" },
  medium: { label: "Médio", emoji: "✨", hint: "bom desafio" },
  hard: { label: "Difícil", emoji: "🔥", hint: "pensa alguns lances à frente" },
};

export const PIECE_NAME: Record<string, string> = { q: "Rainha", r: "Torre", b: "Bispo", n: "Cavalo" };
