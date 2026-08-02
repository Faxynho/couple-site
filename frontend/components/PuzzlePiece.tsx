"use client";

import { motion } from "framer-motion";
import { PIECE_SIZE, TAB_MARGIN, PIECE_BOX, getPieceSigns, buildPiecePath } from "@/lib/jigsawShapes";

interface PuzzlePieceProps {
  pieceId: number;
  gridSize: number;
  edgeSignsH: number[];
  edgeSignsV: number[];
  imageSrc: string;
  /** Posição absoluta (unidades do quadro) do canto superior esquerdo do quadrado-núcleo da peça. */
  x: number;
  y: number;
  isHeld: boolean;
  isOwnHold: boolean;
  holderColor?: string;
  isSolved: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export default function PuzzlePiece({
  pieceId,
  gridSize,
  edgeSignsH,
  edgeSignsV,
  imageSrc,
  x,
  y,
  isHeld,
  isOwnHold,
  holderColor,
  isSolved,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: PuzzlePieceProps) {
  const row = Math.floor(pieceId / gridSize);
  const col = pieceId % gridSize;
  const signs = getPieceSigns(pieceId, gridSize, edgeSignsH, edgeSignsV);
  const path = buildPiecePath(signs);
  const fullImageSize = gridSize * PIECE_SIZE;
  const bgX = TAB_MARGIN - col * PIECE_SIZE;
  const bgY = TAB_MARGIN - row * PIECE_SIZE;

  const shadow = isOwnHold
    ? "drop-shadow(0 20px 26px rgba(74,63,69,0.38)) drop-shadow(0 2px 4px rgba(74,63,69,0.25))"
    : isHeld
    ? `drop-shadow(0 6px 14px ${holderColor}77)`
    : "drop-shadow(0 3px 6px rgba(74,63,69,0.16))";

  const strokeColor = isOwnHold ? "#D9758F" : isHeld ? holderColor : "rgba(255,255,255,0.7)";

  return (
    <motion.div
      onPointerDown={isSolved ? undefined : onPointerDown}
      onPointerMove={isSolved ? undefined : onPointerMove}
      onPointerUp={isSolved ? undefined : onPointerUp}
      onPointerCancel={isSolved ? undefined : onPointerUp}
      initial={false}
      animate={{
        left: x - TAB_MARGIN,
        top: y - TAB_MARGIN,
        scale: isOwnHold ? 1.07 : 1,
        rotate: isOwnHold ? -2.2 : 0,
      }}
      transition={
        isOwnHold
          ? { type: "spring", stiffness: 1100, damping: 48 }
          : { type: "spring", stiffness: 320, damping: 26 }
      }
      style={{
        position: "absolute",
        width: PIECE_BOX,
        height: PIECE_BOX,
        zIndex: isOwnHold ? 500 : isHeld ? 300 : 10 + row * gridSize + col,
        touchAction: "none",
        cursor: isSolved ? "default" : isHeld && !isOwnHold ? "not-allowed" : isOwnHold ? "grabbing" : "grab",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${imageSrc})`,
          backgroundSize: `${fullImageSize}px ${fullImageSize}px`,
          backgroundPosition: `${bgX}px ${bgY}px`,
          backgroundRepeat: "no-repeat",
          clipPath: `path('${path}')`,
          filter: shadow,
        }}
      />
      {/* leve brilho para dar profundidade/iluminação discreta */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `path('${path}')`,
          background:
            "linear-gradient(160deg, rgba(255,255,255,0.32), rgba(255,255,255,0) 45%, rgba(74,63,69,0.05) 100%)",
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />
      <svg
        width={PIECE_BOX}
        height={PIECE_BOX}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
      >
        <path d={path} fill="none" stroke={strokeColor} strokeWidth={isOwnHold || isHeld ? 2.5 : 1.5} />
      </svg>
    </motion.div>
  );
}
