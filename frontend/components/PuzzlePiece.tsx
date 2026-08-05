"use client";

import { memo, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { getTabMargin, getPieceBox, getPieceSigns, buildPiecePath } from "@/lib/jigsawShapes";

interface PuzzlePieceProps {
  groupId: string;
  pieceId: number;
  rows: number;
  cols: number;
  pieceSize: number;
  edgeSignsH: number[];
  edgeSignsV: number[];
  /** Muda só quando uma partida nova começa (reset/nova imagem) — usado para
   *  o cache do path saber quando realmente precisa recalcular a forma. */
  shapeVersion: number;
  imageSrc: string;
  /** Dimensão real da imagem original e o retângulo (nela) usado no quebra-cabeça —
   *  igual à imagem inteira, a menos que um corte mínimo tenha sido necessário. */
  imageWidth: number;
  imageHeight: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  /** Posição absoluta (unidades do quadro) do canto superior esquerdo do quadrado-núcleo da peça. */
  x: number;
  y: number;
  isHeld: boolean;
  isOwnHold: boolean;
  holderColor?: string;
  isSolved: boolean;
  onPointerDown: (groupId: string, e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (groupId: string, e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (groupId: string, e: React.PointerEvent<HTMLDivElement>) => void;
}

function PuzzlePieceImpl({
  groupId,
  pieceId,
  rows,
  cols,
  pieceSize,
  edgeSignsH,
  edgeSignsV,
  shapeVersion,
  imageSrc,
  imageWidth,
  imageHeight,
  cropX,
  cropY,
  cropWidth,
  cropHeight,
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
  const row = Math.floor(pieceId / cols);
  const col = pieceId % cols;

  // O path (curvas bézier da saliência/reentrância) só depende da geometria da
  // peça, não da posição/estado de arrasto — não precisa ser recalculado a
  // cada render (drag da câmera, drag de outra peça, etc.).
  const path = useMemo(
    () => buildPiecePath(getPieceSigns(pieceId, rows, cols, edgeSignsH, edgeSignsV), pieceSize),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pieceId, rows, cols, pieceSize, shapeVersion]
  );

  const tabMargin = getTabMargin(pieceSize);
  const pieceBox = getPieceBox(pieceSize);

  // A imagem inteira é escalada de forma que só a região cortada (cropWidth x
  // cropHeight, igual à imagem inteira quando não há corte) preencha a grade —
  // é assim que a proporção real da imagem nunca é esticada, com ou sem corte.
  const scale = (cols * pieceSize) / cropWidth;
  const bgFullWidth = imageWidth * scale;
  const bgFullHeight = imageHeight * scale;
  const bgX = tabMargin - (cropX * scale + col * pieceSize);
  const bgY = tabMargin - (cropY * scale + row * pieceSize);

  // Identidade estável por peça: permite que React.memo funcione de verdade
  // (senão o componente pai recriaria uma função nova a cada render e a
  // memoização não teria efeito nenhum).
  const handleDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => onPointerDown(groupId, e), [groupId, onPointerDown]);
  const handleMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => onPointerMove(groupId, e), [groupId, onPointerMove]);
  const handleUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => onPointerUp(groupId, e), [groupId, onPointerUp]);

  const shadow = isOwnHold
    ? "drop-shadow(0 20px 26px rgba(74,63,69,0.38)) drop-shadow(0 2px 4px rgba(74,63,69,0.25))"
    : isHeld
    ? `drop-shadow(0 6px 14px ${holderColor}77)`
    : "drop-shadow(0 3px 6px rgba(74,63,69,0.16))";

  const strokeColor = isOwnHold ? "#D9758F" : isHeld ? holderColor : "rgba(255,255,255,0.7)";

  return (
    <motion.div
      onPointerDown={isSolved ? undefined : handleDown}
      onPointerMove={isSolved ? undefined : handleMove}
      onPointerUp={isSolved ? undefined : handleUp}
      onPointerCancel={isSolved ? undefined : handleUp}
      initial={false}
      // x/y (não left/top!) fazem o Framer Motion mover a peça via
      // transform: translate(...), que roda no compositor da GPU sem
      // disparar reflow de layout — é o que realmente pesa com 150 peças.
      animate={{
        x: x - tabMargin,
        y: y - tabMargin,
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
        left: 0,
        top: 0,
        width: pieceBox,
        height: pieceBox,
        zIndex: isOwnHold ? 500 : isHeld ? 300 : 10 + row * cols + col,
        touchAction: "none",
        willChange: isOwnHold || isHeld ? "transform" : "auto",
        cursor: isSolved ? "default" : isHeld && !isOwnHold ? "not-allowed" : isOwnHold ? "grabbing" : "grab",
      }}
    >
      {/* imagem + brilho combinados num único elemento (duas camadas de
          background-image), em vez de dois <div> com clip-path separados */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(160deg, rgba(255,255,255,0.32), rgba(255,255,255,0) 45%, rgba(74,63,69,0.05) 100%), url(${imageSrc})`,
          backgroundBlendMode: "overlay, normal",
          backgroundSize: `100% 100%, ${bgFullWidth}px ${bgFullHeight}px`,
          backgroundPosition: `0 0, ${bgX}px ${bgY}px`,
          backgroundRepeat: "no-repeat, no-repeat",
          clipPath: `path('${path}')`,
          filter: shadow,
        }}
      />
      <svg
        width={pieceBox}
        height={pieceBox}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
      >
        <path d={path} fill="none" stroke={strokeColor} strokeWidth={isOwnHold || isHeld ? 2.5 : 1.5} />
      </svg>
    </motion.div>
  );
}

// React.memo só funciona de fato porque handleDown/Move/Up (acima) e as props
// vindas do pai agora têm identidade estável entre renders não relacionados.
export default memo(PuzzlePieceImpl);
