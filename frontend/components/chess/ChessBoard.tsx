"use client";

import { motion } from "framer-motion";
import { ChessColor, ChessMove, ChessState } from "@/lib/chessTypes";

type BoardPiece = { color: ChessColor; type: string };

function parseFen(fen: string): Record<string, BoardPiece> {
  const board: Record<string, BoardPiece> = {};
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, index) => {
    let file = 0;
    for (const char of row) {
      if (/\d/.test(char)) { file += Number(char); continue; }
      const square = `${String.fromCharCode(97 + file)}${8 - index}`;
      board[square] = { color: char === char.toUpperCase() ? "w" : "b", type: char.toLowerCase() };
      file += 1;
    }
  });
  return board;
}

const PIECE_FILE: Record<string, string> = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };

export default function ChessBoard({
  state,
  ownColor,
  selected,
  onSelect,
}: {
  state: ChessState;
  ownColor: ChessColor;
  selected: string | null;
  onSelect: (square: string, options: ChessMove[]) => void;
}) {
  const pieces = parseFen(state.fen);
  const files = ownColor === "w" ? ["a", "b", "c", "d", "e", "f", "g", "h"] : ["h", "g", "f", "e", "d", "c", "b", "a"];
  const ranks = ownColor === "w" ? ["8", "7", "6", "5", "4", "3", "2", "1"] : ["1", "2", "3", "4", "5", "6", "7", "8"];
  const moves = selected ? state.legalMoves.filter((move) => move.from === selected) : [];
  const moveByTarget = new Map<string, ChessMove[]>();
  for (const move of moves) moveByTarget.set(move.to, [...(moveByTarget.get(move.to) ?? []), move]);
  const checkedKing = state.inCheck ? Object.entries(pieces).find(([, piece]) => piece.color === state.inCheck && piece.type === "k")?.[0] : null;

  return (
    <div className="rounded-[1.65rem] bg-gradient-to-br from-rose/35 via-surface to-sky-200/35 p-2 shadow-[0_22px_70px_rgba(68,49,62,0.22)] ring-1 ring-white/40 dark:ring-white/10">
      <div className="grid aspect-square h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-[1.2rem] border border-white/40 shadow-inner dark:border-white/10">
        {ranks.flatMap((rank, row) => files.map((file, col) => {
          const square = `${file}${rank}`;
          const piece = pieces[square];
          const options = moveByTarget.get(square) ?? [];
          const isLight = (row + col) % 2 === 0;
          const isLast = state.lastMove?.from === square || state.lastMove?.to === square;
          const isCapture = options.some((move) => move.captured) || Boolean(piece && options.length);
          const selectable = state.turn === ownColor && !state.result && (Boolean(piece && piece.color === ownColor) || options.length > 0);
          return (
            <button
              key={square}
              type="button"
              onClick={() => onSelect(square, options)}
              disabled={!selectable && !selected}
              aria-label={square}
              className={`relative flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden transition-colors duration-150 ${isLight ? "bg-[#f8e8e8] dark:bg-[#765c68]" : "bg-[#bb899a] dark:bg-[#453949]"} ${isLast ? "after:absolute after:inset-0 after:bg-amber-300/25" : ""} ${selected === square ? "ring-inset ring-4 ring-rose-deep/70" : ""} ${checkedKing === square ? "bg-red-400/70 animate-pulse" : ""}`}
            >
              {options.length > 0 && !piece && <span className="absolute h-[18%] w-[18%] rounded-full bg-rose-deep/45 shadow-sm" />}
              {options.length > 0 && isCapture && <span className="absolute inset-[7%] rounded-full border-[min(0.45vw,4px)] border-rose-deep/70" />}
              {piece && (
                <motion.img
                  key={`${square}-${piece.type}-${piece.color}`}
                  initial={{ opacity: 0, scale: 0.72 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 25 }}
                  src={`/images/chess/${PIECE_FILE[piece.type]}_${piece.color === "w" ? "pink" : "blue"}.png`}
                  alt=""
                  draggable={false}
                  className="relative z-10 h-[88%] w-[88%] max-h-[88%] max-w-[88%] shrink select-none object-contain drop-shadow-[0_4px_4px_rgba(32,17,31,0.28)]"
                />
              )}
              {(row === 7 || col === 0) && <span className="pointer-events-none absolute bottom-0.5 left-1 text-[8px] font-bold opacity-55 sm:text-[10px]">{col === 0 ? rank : ""}{row === 7 ? file : ""}</span>}
            </button>
          );
        }))}
      </div>
    </div>
  );
}
