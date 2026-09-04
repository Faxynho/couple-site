"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronsDown,
  ChevronsUp,
  CircleHelp,
  Crown,
  Flag,
  Gamepad2,
  Gift,
  Heart,
  LockKeyhole,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { BOARD_SPACE_INFO, BoardSpaceType, BoardRaceState } from "@/lib/boardRaceTypes";
import { Player } from "@/lib/types";
import { getBoardRaceLayoutPoint } from "./boardRaceLayout";
import styles from "./BoardRaceVisual.module.css";

interface Props {
  state: BoardRaceState;
  players: Player[];
  selfId: string | null;
}

const DICE_REVEAL_MS = 650;
const MOVE_STEP_MS = 420;
const NORMAL_FEEDBACK_MS = 750;
const SPECIAL_FEEDBACK_MS = 1_350;

const TILE_CLASS: Record<BoardSpaceType, string> = {
  start: styles.tileStart,
  normal: "",
  advance: styles.tileAdvance,
  retreat: styles.tileRetreat,
  prison: styles.tilePrison,
  quiz: styles.tileQuiz,
  minigame: styles.tileMinigame,
  surprise: styles.tileSurprise,
  treasure: styles.tileTreasure,
  finish: styles.tileFinish,
};

const TILE_ICON: Partial<Record<BoardSpaceType, LucideIcon>> = {
  start: Flag,
  advance: ChevronsUp,
  retreat: ChevronsDown,
  prison: LockKeyhole,
  quiz: CircleHelp,
  minigame: Gamepad2,
  surprise: Sparkles,
  treasure: Gift,
  finish: Crown,
};

function transitionIsVisible(state: BoardRaceState) {
  return Boolean(
    state.lastMove
    && state.phaseReadyAt > Date.now()
    && (state.phase === "turnStart" || state.phase === "moving" || state.phase === "finished")
  );
}

function initialDisplayedPositions(state: BoardRaceState) {
  const positions = Object.fromEntries(Object.entries(state.players).map(([id, player]) => [id, player.position]));
  if (transitionIsVisible(state) && state.lastMove) positions[state.lastMove.playerId] = state.lastMove.from;
  return positions;
}

export default function BoardRaceBoard({ state, players, selfId }: Props) {
  const [displayedPositions, setDisplayedPositions] = useState<Record<string, number>>(() => initialDisplayedPositions(state));
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(() => transitionIsVisible(state) ? state.lastMove?.playerId ?? null : null);
  const animatedSerial = useRef<number | null>(null);

  useEffect(() => {
    const move = state.lastMove;
    const canPresent = move && state.phaseReadyAt > Date.now()
      && (state.phase === "turnStart" || state.phase === "moving" || state.phase === "finished");
    if (!move || !canPresent || animatedSerial.current === move.serial) {
      if (!canPresent) {
        setMovingPlayerId(null);
        setDisplayedPositions(Object.fromEntries(Object.entries(state.players).map(([id, player]) => [id, player.position])));
      }
      return;
    }

    animatedSerial.current = move.serial;
    setMovingPlayerId(move.playerId);
    let cancelled = false;
    const timers: number[] = [];
    const landing = state.spaces[move.to];
    const feedbackMs = landing && landing.type !== "normal" ? SPECIAL_FEEDBACK_MS : NORMAL_FEEDBACK_MS;
    const moveEndsAt = state.phaseReadyAt - feedbackMs;
    const moveStartsAt = moveEndsAt - DICE_REVEAL_MS - move.path.length * MOVE_STEP_MS;
    const elapsed = Math.max(0, Date.now() - moveStartsAt);
    const completedSteps = elapsed <= DICE_REVEAL_MS
      ? 0
      : Math.min(move.path.length, Math.floor((elapsed - DICE_REVEAL_MS) / MOVE_STEP_MS));
    const initialPosition = completedSteps > 0 ? move.path[completedSteps - 1] : move.from;
    setDisplayedPositions((current) => ({ ...current, [move.playerId]: initialPosition }));

    move.path.slice(completedSteps).forEach((position, offset) => {
      const stepIndex = completedSteps + offset + 1;
      const dueIn = Math.max(0, DICE_REVEAL_MS + stepIndex * MOVE_STEP_MS - elapsed);
      timers.push(window.setTimeout(() => {
        if (!cancelled) setDisplayedPositions((current) => ({ ...current, [move.playerId]: position }));
      }, dueIn));
    });
    const finishIn = Math.max(0, moveEndsAt - Date.now());
    timers.push(window.setTimeout(() => {
      if (cancelled) return;
      setDisplayedPositions(Object.fromEntries(Object.entries(state.players).map(([id, player]) => [id, player.position])));
      setMovingPlayerId(null);
    }, finishIn));

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  // O serial identifica uma jogada completa. Snapshots intermediários do
  // Socket.IO não reiniciam nem aceleram o percurso visual.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastMove?.serial]);

  const playerInfo = (id: string) => players.find((player) => player.id === id);
  const colorByPlayer = useMemo(() => Object.fromEntries(state.playerOrder.map((id, index) => [
    id,
    id === "BOT" ? "#8c75d6" : index === 0 ? "#f25d97" : "#6f71d8",
  ])), [state.playerOrder]);
  const focusPlayerId = movingPlayerId ?? state.currentPlayerId;
  const focusPosition = displayedPositions[focusPlayerId] ?? state.players[focusPlayerId]?.position ?? 0;

  return (
    <section aria-label={"Tabuleiro com " + state.lastPosition + " casas"} className={styles.boardFrame}>
      <div className={styles.boardCanvas}>
        {state.spaces.map((space) => {
          const info = BOARD_SPACE_INFO[space.type];
          const desktop = getBoardRaceLayoutPoint(space.index, state.spaces.length);
          const portrait = getBoardRaceLayoutPoint(space.index, state.spaces.length, true);
          const Icon = TILE_ICON[space.type];
          const style = {
            "--tile-left": String(desktop.x) + "%",
            "--tile-top": String(desktop.y) + "%",
            "--tile-rotation": String(desktop.rotation) + "deg",
            "--tile-left-portrait": String(portrait.x) + "%",
            "--tile-top-portrait": String(portrait.y) + "%",
            "--tile-rotation-portrait": String(portrait.rotation) + "deg",
          } as CSSProperties;
          return (
            <div
              key={space.index}
              title={space.index + ". " + info.short}
              className={[styles.tile, TILE_CLASS[space.type], focusPosition === space.index && state.phase !== "finished" ? styles.activeTile : ""].join(" ")}
              style={style}
            >
              <span className={styles.tileDepth} />
              <span className={styles.tileFace}>
                <span className={styles.tileNumber}>{space.index}</span>
                {Icon && <Icon className={styles.tileIcon} aria-hidden="true" />}
                {space.type !== "normal" && <span className={styles.tileLabel}>{info.short}</span>}
              </span>
            </div>
          );
        })}

        <div className={styles.pieceLayer}>
          {state.playerOrder.map((id, index) => {
            const player = playerInfo(id);
            const position = displayedPositions[id] ?? state.players[id]?.position ?? 0;
            const desktop = getBoardRaceLayoutPoint(position, state.spaces.length);
            const portrait = getBoardRaceLayoutPoint(position, state.spaces.length, true);
            const sharingSpace = state.playerOrder.filter((playerId) => displayedPositions[playerId] === position).length > 1;
            const pieceStyle = {
              "--pawn-color": colorByPlayer[id] ?? player?.color ?? "#8c75d6",
              "--pawn-offset": sharingSpace ? (index === 0 ? "-10px" : "10px") : "0px",
              "--pawn-left": String(desktop.x) + "%",
              "--pawn-top": String(desktop.y) + "%",
              "--pawn-left-portrait": String(portrait.x) + "%",
              "--pawn-top-portrait": String(portrait.y) + "%",
            } as CSSProperties;
            return (
              <span
                key={id}
                aria-label={id === selfId ? "Sua peça" : id === "BOT" ? "Peça do BOT" : "Peça de " + (player?.name ?? "oponente")}
                className={[styles.pawn, movingPlayerId === id ? styles.pawnMoving : ""].join(" ")}
                style={pieceStyle}
              >
                <span className={styles.pawnShadow} />
                <span className={styles.pawnBody} />
                <span className={styles.pawnHead} />
                <Heart className={styles.pawnHeart} fill="currentColor" aria-hidden="true" />
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
