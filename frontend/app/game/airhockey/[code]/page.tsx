"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, HelpCircle, Trophy } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import AirHockeyArena from "@/components/airhockey/AirHockeyArena";
import AirHockeyResultModal from "@/components/airhockey/AirHockeyResultModal";
import AirHockeyScorePanel from "@/components/airhockey/AirHockeyScorePanel";
import { useAirHockeyGame } from "@/hooks/useAirHockeyGame";
import { useAccountPhotos } from "@/hooks/useAccountPhotos";
import { useRoomSession } from "@/hooks/useRoomSession";
import { playSoundEffect } from "@/lib/sound";

const label: Record<string, string> = { easy: "Fácil", medium: "Médio", hard: "Difícil" };

export default function AirHockeyGamePage({ params }: { params: { code: string } }) {
  const router = useRouter(); const code=params.code.toUpperCase();
  const { room, selfId, notFound, kicked, backToConfig, backToGameSelect } = useRoomSession(code);
  const { stateRef, localIntentRef, meta, move, newGame } = useAirHockeyGame(code);
  const photos = useAccountPhotos();
  const [showResult,setShowResult]=useState(false); const [finalCelebrating,setFinalCelebrating]=useState(false); const [portrait,setPortrait]=useState(false); const [viewport,setViewport]=useState({width:0,height:0}); const finished = useRef(false); const lastCollisionSound=useRef(0);
  const handleEffect=useCallback((effect:"wall"|"hit"|"goal"|"countdown")=>{ const now=performance.now(); if((effect==="wall"||effect==="hit")&&now-lastCollisionSound.current<80)return; if(effect==="wall"||effect==="hit")lastCollisionSound.current=now; playSoundEffect(effect==="hit"?"airHockeyHit":effect==="wall"?"airHockeyWall":effect==="goal"?"airHockeyGoal":"airHockeyCountdown"); },[]);
  useEffect(()=>{ const update=()=>{setPortrait(window.innerHeight>window.innerWidth||window.innerWidth<640);setViewport({width:window.innerWidth,height:window.innerHeight});}; update(); window.addEventListener("resize",update); return()=>window.removeEventListener("resize",update); },[]);
  useEffect(()=>{ if(!room) return; if(room.gameId!=="airhockey" || (room.status!=="playing"&&room.status!=="finished")) router.push(room.roomMode==="duo"?`/sala/${room.code}`:"/solo"); },[room,router]);
  useEffect(()=>{ if(!meta?.phase || meta.phase!=="finished" || finished.current) { if(meta?.phase!=="finished"){finished.current=false;setShowResult(false);setFinalCelebrating(false);} return; } finished.current=true;setFinalCelebrating(true); const own=meta.results.find((r)=>r.playerId===selfId); playSoundEffect(meta.mode==="solo"?(own?.score??0)>(own?.conceded??0)?"victory":"airHockeyDefeat":own?.outcome==="win"?"victory":"airHockeyDefeat"); const timer=window.setTimeout(()=>{setFinalCelebrating(false);setShowResult(true);},2100); return()=>window.clearTimeout(timer); },[meta?.finishedAt,meta?.phase,selfId]);
  if(kicked) return null;
  if(notFound) return <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center"><Logo size={44}/><p className="text-ink-soft">Não encontramos essa sala.</p><Button onClick={()=>router.push("/")}>Voltar ao início</Button></main>;
  if(!room||!selfId||!meta||room.gameId!=="airhockey") return <LoadingScreen label="Preparando a mesa..."/>;
  const [left,right]=meta.playerIds; const leftPlayer=room.players.find((p)=>p.id===left); const rightPlayer=room.players.find((p)=>p.id===right); const isLeft=left===selfId;
  const arenaWidth = viewport.width ? Math.min(1080, viewport.width * .96, Math.max(220, (viewport.height - 142) * (portrait ? 5 / 8 : 8 / 5))) : undefined;
  const handleBack=()=>{ if(room.roomMode==="duo"){backToConfig();router.push(`/sala/${room.code}`);} else router.push("/solo"); };
  const handleGames=()=>{ if(room.roomMode==="duo"){backToGameSelect();router.push(`/sala/${room.code}`);} else router.push("/solo"); };
  return <main className="flex min-h-[100dvh] flex-col items-center overflow-x-hidden bg-cozy-gradient px-2 py-2 sm:px-4 sm:py-3">
    <header className="flex w-full max-w-[min(96vw,1120px)] items-center justify-between gap-2 px-1"><button onClick={handleBack} className="rounded-full p-2 text-ink-soft hover:bg-surface/60" aria-label="Voltar"><ArrowLeft size={19}/></button><div className="text-center"><h1 className="font-display text-lg font-semibold text-ink">🏒 Air Hockey</h1><p className="text-[10px] uppercase tracking-[.14em] text-ink-soft">{meta.mode==="solo"?`BOT · ${label[meta.difficulty]}`:"Duelo"}</p></div><details className="relative"><summary className="flex cursor-pointer list-none items-center gap-1 rounded-full bg-surface/70 px-2 py-1 text-xs text-ink-soft"><HelpCircle size={14}/> Como jogar</summary><div className="glass-panel absolute right-0 top-8 z-30 w-64 rounded-xl2 p-3 text-left text-xs leading-relaxed text-ink-soft shadow-soft">Arraste sua raquete pela sua metade da mesa, acerte o disco e coloque-o no gol adversário. No PC a mesa é horizontal; no celular ela vira vertical. Primeiro a 7 vence.</div></details></header>
    <section className="mt-1 grid w-full max-w-[min(96vw,900px)] grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-4"><AirHockeyScorePanel player={leftPlayer??null} score={meta.scores[left]??0} local={isLeft} photo={leftPlayer?.accountId?photos[leftPlayer.accountId]:undefined}/><span className="rounded-full bg-surface/70 px-2 py-1 text-[10px] font-semibold tracking-widest text-ink-soft">VS</span><div className="justify-self-stretch"><AirHockeyScorePanel player={rightPlayer??null} isBot={right==="BOT"} score={meta.scores[right]??0} local={!isLeft} photo={rightPlayer?.accountId?photos[rightPlayer.accountId]:undefined}/></div></section>
    <section style={{ aspectRatio: portrait ? "5 / 8" : "8 / 5", width: arenaWidth ? `${arenaWidth}px` : undefined }} className={`mt-2 h-auto w-[96vw] max-w-[96vw] overflow-hidden rounded-[1.7rem] shadow-[0_18px_42px_rgba(31,21,41,.28)] transition-transform duration-700 sm:mt-3 ${finalCelebrating?"scale-[1.018]":"scale-100"}`}><AirHockeyArena stateRef={stateRef} localIntentRef={localIntentRef} selfId={selfId} onMove={move} onEffect={handleEffect}/></section>
    <p className="mt-2 flex items-center gap-1 text-[11px] text-ink-soft"><Trophy size={13}/> {meta.phase==="playing"?"Jogo em andamento":meta.phase==="goal"?"Preparando a próxima saída...":meta.phase==="countdown"?"Prepare-se!": "Partida encerrada"}</p>
    <AirHockeyResultModal open={showResult} results={meta.results} players={room.players} selfId={selfId} mode={meta.mode} onBack={handleGames} onNewGame={()=>{setShowResult(false);newGame();}}/>
  </main>;
}
