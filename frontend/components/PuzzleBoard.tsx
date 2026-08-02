"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PuzzlePiece from "./PuzzlePiece";
import { Player, PuzzleState } from "@/lib/types";

interface PuzzleBoardProps {
  state: PuzzleState;
  imageSrc: string;
  selfId: string | null;
  players: Player[];
  remoteDrags: Record<string, { x: number; y: number }>;
  onPickup: (groupId: string) => void;
  onDrag: (groupId: string, x: number, y: number) => void;
  onDrop: (groupId: string, x: number, y: number) => void;
}

interface LocalDrag {
  groupId: string;
  pointerId: number;
  x: number;
  y: number;
}

interface DragStart {
  pointerX: number;
  pointerY: number;
  originX: number;
  originY: number;
}

export default function PuzzleBoard({
  state,
  imageSrc,
  selfId,
  players,
  remoteDrags,
  onPickup,
  onDrag,
  onDrop,
}: PuzzleBoardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [localDrag, setLocalDrag] = useState<LocalDrag | null>(null);
  const dragStartRef = useRef<DragStart | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      if (el.clientWidth > 0) setScale(el.clientWidth / state.boardWidth);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state.boardWidth]);

  const colorByPlayer = Object.fromEntries(players.map((p) => [p.id, p.color]));

  const handlePointerDown = useCallback(
    (groupId: string, e: React.PointerEvent<HTMLDivElement>) => {
      if (state.solved) return;
      const group = state.groups[groupId];
      if (!group || (group.heldBy && group.heldBy !== selfId)) return;

      e.currentTarget.setPointerCapture(e.pointerId);
      dragStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        originX: group.originX,
        originY: group.originY,
      };
      setLocalDrag({ groupId, pointerId: e.pointerId, x: group.originX, y: group.originY });
      onPickup(groupId);
    },
    [state, selfId, onPickup]
  );

  const handlePointerMove = useCallback(
    (groupId: string, e: React.PointerEvent<HTMLDivElement>) => {
      if (!localDrag || localDrag.groupId !== groupId || localDrag.pointerId !== e.pointerId) return;
      const start = dragStartRef.current;
      if (!start || scale <= 0) return;

      const dx = (e.clientX - start.pointerX) / scale;
      const dy = (e.clientY - start.pointerY) / scale;
      const x = start.originX + dx;
      const y = start.originY + dy;

      setLocalDrag((current) => (current && current.groupId === groupId ? { ...current, x, y } : current));
      onDrag(groupId, x, y);
    },
    [localDrag, scale, onDrag]
  );

  const handlePointerUp = useCallback(
    (groupId: string, e: React.PointerEvent<HTMLDivElement>) => {
      if (!localDrag || localDrag.groupId !== groupId || localDrag.pointerId !== e.pointerId) return;
      onDrop(groupId, localDrag.x, localDrag.y);
      setLocalDrag(null);
      dragStartRef.current = null;
    },
    [localDrag, onDrop]
  );

  return (
    <div
      ref={wrapperRef}
      className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-xl3 glass-panel"
      style={{ aspectRatio: `${state.boardWidth} / ${state.boardHeight}` }}
    >
      {/* superfície da mesa: textura sutil e aconchegante */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.55), rgba(241,228,211,0.35) 60%), repeating-linear-gradient(135deg, rgba(74,63,69,0.03) 0px, rgba(74,63,69,0.03) 2px, transparent 2px, transparent 14px)",
          boxShadow: "inset 0 2px 28px rgba(74,63,69,0.10)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: state.boardWidth,
          height: state.boardHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* moldura-guia: mostra onde a imagem final se monta */}
        <div
          className="absolute rounded-2xl border-2 border-dashed border-white/70"
          style={{
            left: state.targetX,
            top: state.targetY,
            width: state.gridSize * state.pieceSize,
            height: state.gridSize * state.pieceSize,
            background: "rgba(255,255,255,0.10)",
          }}
        />

        {Object.values(state.groups).flatMap((group) => {
          const isOwnHold = localDrag?.groupId === group.id;
          const remote = remoteDrags[group.id];
          const originX = isOwnHold ? localDrag!.x : remote ? remote.x : group.originX;
          const originY = isOwnHold ? localDrag!.y : remote ? remote.y : group.originY;
          const isHeld = Boolean(group.heldBy);
          const holderColor = group.heldBy ? colorByPlayer[group.heldBy] : undefined;

          return group.pieceIds.map((pieceId) => {
            const row = Math.floor(pieceId / state.gridSize);
            const col = pieceId % state.gridSize;
            return (
              <PuzzlePiece
                key={pieceId}
                pieceId={pieceId}
                gridSize={state.gridSize}
                edgeSignsH={state.edgeSignsH}
                edgeSignsV={state.edgeSignsV}
                imageSrc={imageSrc}
                x={originX + col * state.pieceSize}
                y={originY + row * state.pieceSize}
                isHeld={isHeld}
                isOwnHold={isOwnHold}
                holderColor={holderColor}
                isSolved={state.solved}
                onPointerDown={(e) => handlePointerDown(group.id, e)}
                onPointerMove={(e) => handlePointerMove(group.id, e)}
                onPointerUp={(e) => handlePointerUp(group.id, e)}
              />
            );
          });
        })}
      </div>
    </div>
  );
}
