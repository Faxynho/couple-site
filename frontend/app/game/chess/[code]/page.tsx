"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, Sparkles } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import ChessBoard from "@/components/chess/ChessBoard";
import ChessPromotionModal from "@/components/chess/ChessPromotionModal";
import ChessResultModal from "@/components/chess/ChessResultModal";
import { useChessGame } from "@/hooks/useChessGame";
import { useRoomSession } from "@/hooks/useRoomSession";
import { useAccountPhotos } from "@/hooks/useAccountPhotos";
import AccountAvatar from "@/components/account/AccountAvatar";
import { ChessMove, ChessPromotion } from "@/lib/chessTypes";
import { playSoundEffect } from "@/lib/sound";
import { Player } from "@/lib/types";

function elapsed(startedAt: number, finishedAt: number | null, now: number) {
  const total = Math.max(0, Math.floor(((finishedAt ?? now) - startedAt) / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function PlayerPanel({ name, team, active, bot, captured, player, photo }: { name: string; team: "Rosa" | "Azul"; active: boolean; bot?: boolean; captured: string[]; player?: Player; photo?: string | null }) {
  const suffix = team === "Rosa" ? "pink" : "blue";
  const names: Record<string, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen" };
  const avatarRing = team === "Rosa" ? "ring-2 ring-rose/75" : "ring-2 ring-sky-400/75 dark:ring-sky-300/65";
  return <div className={`glass-panel flex min-w-0 items-center gap-3 rounded-xl2 px-3 py-2.5 transition-all ${active ? "ring-2 ring-rose/80 shadow-glow" : "opacity-80"}`}>{bot ? <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-base">🤖</span> : <AccountAvatar name={name} photo={photo} accountId={player?.accountId} fallbackColor={player?.color} size={36} className={avatarRing}/>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{name}</p><p className="text-[11px] text-ink-soft">Time {team}{active ? " · sua vez" : ""}</p></div><div className="flex -space-x-1">{captured.slice(-7).map((piece, index) => names[piece] ? <img key={`${piece}-${index}`} src={`/images/chess/${names[piece]}_${suffix}.png`} alt="" className="h-5 w-5 object-contain"/> : null)}</div></div>;
}

export default function ChessGamePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();
  const { room, selfId, notFound, kicked, backToConfig, backToGameSelect } = useRoomSession(code);
  const { state, move, newGame } = useChessGame(code);
  const photos = useAccountPhotos();
  const [selected, setSelected] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const previousMoveSan = useRef<string | null>(null);

  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => {
    if (!room) return;
    if (room.gameId !== "chess" || (room.status !== "playing" && room.status !== "finished")) router.push(room.roomMode === "duo" ? `/sala/${room.code}` : "/solo");
  }, [room, router]);
  useEffect(() => {
    if (!state?.lastMove || previousMoveSan.current === state.lastMove.san) return;
    previousMoveSan.current = state.lastMove.san;
    playSoundEffect(state.lastMove.promotion ? "chessPromotion" : state.lastMove.captured ? "chessCapture" : state.inCheck ? "chessCheck" : "chessMove");
  }, [state?.lastMove, state?.inCheck]);
  useEffect(() => { if (state?.result) playSoundEffect(state.result.winnerId === selfId ? "victory" : "chessDefeat"); }, [state?.result, selfId]);

  if (kicked) return null;
  if (notFound) return <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center"><Logo size={44}/><p className="text-ink-soft">Não encontramos essa sala.</p><Button onClick={() => router.push("/")}>Voltar ao início</Button></main>;
  if (!room || !state || !selfId || room.gameId !== "chess") return <LoadingScreen label="Preparando o tabuleiro..."/>;

  const ownColor = state.colorByPlayerId[selfId] ?? "w";
  const pinkPlayer = room.players.find((player) => state.colorByPlayerId[player.id] === "w");
  const bluePlayer = room.players.find((player) => state.colorByPlayerId[player.id] === "b");
  const isMyTurn = state.turn === ownColor && !state.result;
  const opponentName = state.mode === "solo" ? `BOT · ${({ easy: "Fácil", medium: "Médio", hard: "Difícil" }[state.difficulty])}` : bluePlayer?.name ?? "Adversário";
  const topIsBlue = ownColor === "w";
  const top = topIsBlue ? { name: opponentName, team: "Azul" as const, active: state.turn === "b", bot: state.mode === "solo", captured: state.captured.w, player: bluePlayer, photo: bluePlayer?.accountId ? photos[bluePlayer.accountId] : undefined } : { name: pinkPlayer?.name ?? "Adversário", team: "Rosa" as const, active: state.turn === "w", captured: state.captured.b, player: pinkPlayer, photo: pinkPlayer?.accountId ? photos[pinkPlayer.accountId] : undefined };
  const bottom = topIsBlue ? { name: pinkPlayer?.name ?? "Você", team: "Rosa" as const, active: state.turn === "w", captured: state.captured.b, player: pinkPlayer, photo: pinkPlayer?.accountId ? photos[pinkPlayer.accountId] : undefined } : { name: bluePlayer?.name ?? "Você", team: "Azul" as const, active: state.turn === "b", captured: state.captured.w, player: bluePlayer, photo: bluePlayer?.accountId ? photos[bluePlayer.accountId] : undefined };

  const handleSquare = (square: string, targetOptions: ChessMove[]) => {
    if (!isMyTurn) return;
    const ownPiece = (() => {
      const rows = state.fen.split(" ")[0].split("/"); let result = "";
      for (let row = 0; row < 8; row++) { let file = 0; for (const char of rows[row]) { if (/\d/.test(char)) { file += Number(char); continue; } if (`${String.fromCharCode(97 + file)}${8 - row}` === square) result = char; file++; } } return result;
    })();
    if (ownPiece && (ownColor === "w" ? ownPiece === ownPiece.toUpperCase() : ownPiece === ownPiece.toLowerCase())) { setSelected(square); return; }
    if (selected && targetOptions.length) {
      const requiresPromotion = targetOptions.some((option) => option.promotion);
      if (requiresPromotion) setPromotion({ from: selected, to: square });
      else move(selected, square);
      setSelected(null);
      return;
    }
    setSelected(null);
  };
  const back = () => room.roomMode === "duo" ? backToConfig() : router.push("/solo/chess");

  return <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-3 py-5 sm:px-5 sm:py-8"><header className="mx-auto flex w-full max-w-[43rem] items-center justify-between"><button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface/60 hover:text-ink" aria-label="Voltar"><ArrowLeft size={19}/></button><div className="flex items-center gap-2"><Logo size={34}/><span className="font-display text-sm font-semibold text-ink">Xadrez</span></div><div className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-ink-soft"><Clock3 size={15}/>{elapsed(state.startedAt, state.finishedAt, now)}</div></header><section className="mx-auto mt-5 grid w-full max-w-[43rem] gap-3"><PlayerPanel {...top}/><div className="relative"><ChessBoard state={state} ownColor={ownColor} selected={selected} onSelect={handleSquare}/>{state.inCheck === ownColor && <div className="pointer-events-none absolute inset-x-0 -bottom-9 flex justify-center"><span className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow-soft">Seu rei está em xeque</span></div>}</div><PlayerPanel {...bottom}/></section><div className="mx-auto mt-5 flex max-w-[43rem] items-center justify-center gap-2 text-center text-xs text-ink-soft"><Sparkles size={14}/>{state.result ? "Partida encerrada" : isMyTurn ? "Escolha uma peça e uma casa destacada." : state.mode === "solo" ? "O BOT está pensando..." : "Aguardando o outro jogador."}</div><ChessPromotionModal open={Boolean(promotion)} color={ownColor} onChoose={(piece: ChessPromotion) => { if (promotion) move(promotion.from, promotion.to, piece); setPromotion(null); }}/><ChessResultModal state={state} selfId={selfId} onNewGame={newGame} onBack={back}/></main>;
}
