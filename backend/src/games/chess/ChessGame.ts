import { Chess, Color, Move, PieceSymbol, Square } from "chess.js";
import { GameEngine } from "../../types";

export type ChessDifficulty = "easy" | "medium" | "hard";
export type ChessMode = "solo" | "duel";
export type ChessColor = "w" | "b";
export type ChessPromotion = "q" | "r" | "b" | "n";

export interface ChessLastMove {
  from: string;
  to: string;
  color: ChessColor;
  piece: string;
  captured?: string;
  promotion?: string;
  san: string;
}

export interface ChessResult {
  winnerId: string | null;
  reason: "checkmate" | "stalemate" | "threefold" | "insufficient-material" | "fifty-move" | "draw";
}

export interface ChessState {
  mode: ChessMode;
  difficulty: ChessDifficulty;
  /** Rosa sempre abre a partida (brancas); azul joga de pretas. */
  colorByPlayerId: Record<string, ChessColor>;
  humanPlayerIds: string[];
  fen: string;
  turn: ChessColor;
  startedAt: number;
  finishedAt: number | null;
  moveCount: number;
  history: string[];
  lastMove: ChessLastMove | null;
  captured: { w: string[]; b: string[] };
  inCheck: ChessColor | null;
  result: ChessResult | null;
  /** Lista gerada no servidor para a UI destacar somente lances legais. */
  legalMoves: { from: string; to: string; promotion?: ChessPromotion; captured?: string }[];
}

export type ChessAction =
  | { type: "move"; from: string; to: string; promotion?: ChessPromotion }
  | { type: "botMove" };

const DIFFICULTIES: ChessDifficulty[] = ["easy", "medium", "hard"];
const MODES: ChessMode[] = ["solo", "duel"];
const PIECE_VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const PROMOTIONS: ChessPromotion[] = ["q", "r", "b", "n"];

export function isValidChessDifficulty(value: string): value is ChessDifficulty { return DIFFICULTIES.includes(value as ChessDifficulty); }
export function isValidChessMode(value: string): value is ChessMode { return MODES.includes(value as ChessMode); }

function opposite(color: ChessColor): ChessColor { return color === "w" ? "b" : "w"; }

function toLastMove(move: Move): ChessLastMove {
  return { from: move.from, to: move.to, color: move.color, piece: move.piece, captured: move.captured, promotion: move.promotion, san: move.san };
}

function finishResult(chess: Chess, lastMover: ChessColor, players: Record<string, ChessColor>): ChessResult | null {
  if (chess.isCheckmate()) {
    const winnerColor = lastMover;
    return { winnerId: Object.entries(players).find(([, color]) => color === winnerColor)?.[0] ?? null, reason: "checkmate" };
  }
  if (chess.isStalemate()) return { winnerId: null, reason: "stalemate" };
  if (chess.isThreefoldRepetition()) return { winnerId: null, reason: "threefold" };
  if (chess.isInsufficientMaterial()) return { winnerId: null, reason: "insufficient-material" };
  if (chess.isDrawByFiftyMoves()) return { winnerId: null, reason: "fifty-move" };
  if (chess.isDraw()) return { winnerId: null, reason: "draw" };
  return null;
}

function materialScore(chess: Chess, perspective: ChessColor) {
  let score = 0;
  for (const row of chess.board()) for (const square of row) {
    if (!square) continue;
    const base = PIECE_VALUE[square.type] ?? 0;
    const file = square.square.charCodeAt(0) - 97;
    const rank = Number(square.square[1]) - 1;
    const center = 3.5 - Math.abs(3.5 - rank) + 3.5 - Math.abs(3.5 - file);
    const positional = square.type === "p" || square.type === "n" || square.type === "b" ? center * 3 : center;
    score += (square.color === perspective ? 1 : -1) * (base + positional);
  }
  return score;
}

function negamax(chess: Chess, depth: number, alpha: number, beta: number, perspective: ChessColor): number {
  if (chess.isCheckmate()) return -100000 - depth;
  if (chess.isDraw() || depth === 0) return materialScore(chess, perspective);
  let best = -Infinity;
  const moves = chess.moves({ verbose: true }) as Move[];
  for (const move of moves) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, -beta, -alpha, opposite(perspective));
    chess.undo();
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}

function chooseBotMove(chess: Chess, difficulty: ChessDifficulty): Move | null {
  const moves = chess.moves({ verbose: true }) as Move[];
  if (!moves.length) return null;
  if (difficulty === "easy") {
    // Um pouco de preferência por capturas, mas erros deliberados continuam comuns.
    const shuffled = [...moves].sort(() => Math.random() - 0.5);
    return shuffled[Math.floor(Math.random() * Math.min(shuffled.length, 6))] ?? shuffled[0];
  }
  const depth = difficulty === "hard" ? 3 : 2;
  const color = chess.turn() as ChessColor;
  let best = -Infinity;
  let choices: Move[] = [];
  for (const move of moves) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, -Infinity, Infinity, opposite(color));
    chess.undo();
    if (score > best + 0.1) { best = score; choices = [move]; }
    else if (Math.abs(score - best) <= 0.1) choices.push(move);
  }
  return choices[Math.floor(Math.random() * choices.length)] ?? moves[0];
}

function buildState(previous: ChessState, chess: Chess, move: Move | null): ChessState {
  const movingColor = move?.color as ChessColor | undefined;
  const captured = move?.captured && movingColor
    ? { ...previous.captured, [movingColor]: [...previous.captured[movingColor], move.captured] }
    : previous.captured;
  const result = move ? finishResult(chess, move.color, previous.colorByPlayerId) : null;
  const legalMoves = chess.moves({ verbose: true }).map((legal) => ({
    from: legal.from,
    to: legal.to,
    ...(legal.promotion ? { promotion: legal.promotion as ChessPromotion } : {}),
    ...(legal.captured ? { captured: legal.captured } : {}),
  }));
  return {
    ...previous,
    fen: chess.fen(),
    turn: chess.turn() as ChessColor,
    moveCount: chess.history().length,
    history: chess.history(),
    lastMove: move ? toLastMove(move) : previous.lastMove,
    captured,
    inCheck: chess.isCheck() ? (chess.turn() as ChessColor) : null,
    result,
    finishedAt: result ? Date.now() : null,
    legalMoves,
  };
}

export class ChessGame implements GameEngine<ChessState, ChessAction> {
  readonly id = "chess" as const;

  createInitialState(options: Record<string, unknown> = {}): ChessState {
    const mode: ChessMode = options.mode === "duel" ? "duel" : "solo";
    const difficulty: ChessDifficulty = isValidChessDifficulty(String(options.difficulty)) ? String(options.difficulty) as ChessDifficulty : "medium";
    const playerIds = Array.isArray(options.playerIds) ? options.playerIds.filter((id): id is string => typeof id === "string") : [];
    const first = playerIds[0] ?? "PLAYER";
    const second = playerIds[1] ?? "BOT";
    const requestedPink = typeof options.pinkPlayerId === "string" && playerIds.includes(options.pinkPlayerId) ? options.pinkPlayerId : first;
    const pink = mode === "duel" ? requestedPink : first;
    const blue = pink === first ? second : first;
    const colorByPlayerId: Record<string, ChessColor> = mode === "duel" ? { [pink]: "w", [blue]: "b" } : { [first]: "w", BOT: "b" };
    const chess = new Chess();
    return {
      mode, difficulty, colorByPlayerId, humanPlayerIds: mode === "duel" ? [first, second] : [first],
      fen: chess.fen(), turn: "w", startedAt: Date.now(), finishedAt: null, moveCount: 0, history: [], lastMove: null,
      captured: { w: [], b: [] }, inCheck: null, result: null,
      legalMoves: chess.moves({ verbose: true }).map((move) => ({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion as ChessPromotion } : {}), ...(move.captured ? { captured: move.captured } : {}) })),
    };
  }

  applyAction(state: ChessState, action: ChessAction, playerId: string): ChessState {
    if (state.result) return state;
    const chess = new Chess(state.fen);
    if (action.type === "botMove") {
      if (state.mode !== "solo" || playerId !== "BOT" || chess.turn() !== "b") return state;
      const botMove = chooseBotMove(chess, state.difficulty);
      if (!botMove) return buildState(state, chess, null);
      const applied = chess.move(botMove);
      return buildState(state, chess, applied);
    }
    if (!state.humanPlayerIds.includes(playerId) || state.colorByPlayerId[playerId] !== chess.turn()) return state;
    if (!/^[a-h][1-8]$/.test(action.from) || !/^[a-h][1-8]$/.test(action.to)) return state;
    const promotion = action.promotion && PROMOTIONS.includes(action.promotion) ? action.promotion : undefined;
    try {
      const applied = chess.move({ from: action.from as Square, to: action.to as Square, promotion: promotion as PieceSymbol | undefined });
      return buildState(state, chess, applied);
    } catch {
      return state;
    }
  }

  isSolved(state: ChessState) { return state.result !== null; }
  reset(state: ChessState) { return this.createInitialState({ mode: state.mode, difficulty: state.difficulty, playerIds: state.humanPlayerIds, pinkPlayerId: Object.entries(state.colorByPlayerId).find(([, color]) => color === "w")?.[0] }); }
}
