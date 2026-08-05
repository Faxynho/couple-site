"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animate } from "framer-motion";
import PuzzlePiece from "./PuzzlePiece";
import ZoomControls from "./ZoomControls";
import ReferencePanel from "./ReferencePanel";
import { Player, PieceGroup, PuzzleState } from "@/lib/types";
import { Camera, clampCamera, computeFitCamera, computeZoomBounds, zoomAtPoint } from "@/lib/camera";

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

interface PanDrag {
  pointerId: number;
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
}

interface PinchState {
  initialDist: number;
  initialZoom: number;
  initialMid: { x: number; y: number };
  initialPan: { x: number; y: number };
}

type PiecePointerHandler = (groupId: string, e: React.PointerEvent<HTMLDivElement>) => void;

interface PieceLayerProps {
  groups: Record<string, PieceGroup>;
  rows: number;
  cols: number;
  pieceSize: number;
  edgeSignsH: number[];
  edgeSignsV: number[];
  shapeVersion: number;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  solved: boolean;
  colorByPlayer: Record<string, string>;
  remoteDrags: Record<string, { x: number; y: number }>;
  localDrag: LocalDrag | null;
  onPiecePointerDown: PiecePointerHandler;
  onPiecePointerMove: PiecePointerHandler;
  onPiecePointerUp: PiecePointerHandler;
}

/**
 * Camada só das peças, isolada da câmera. Isso é o que faz o pan/zoom ficar
 * fluido: como nenhuma dessas props muda quando só a câmera muda, o
 * React.memo abaixo pula o recálculo inteiro da lista de ~150 peças em cada
 * frame de zoom/arrastar câmera — antes, tudo isso vivia no mesmo componente
 * que guarda o estado da câmera, e cada tick de zoom recriava as 150 peças.
 */
function PieceLayerImpl({
  groups,
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
  solved,
  colorByPlayer,
  remoteDrags,
  localDrag,
  onPiecePointerDown,
  onPiecePointerMove,
  onPiecePointerUp,
}: PieceLayerProps) {
  return (
    <>
      {Object.values(groups).flatMap((group) => {
        const isOwnHold = localDrag?.groupId === group.id;
        const remote = remoteDrags[group.id];
        const originX = isOwnHold ? localDrag!.x : remote ? remote.x : group.originX;
        const originY = isOwnHold ? localDrag!.y : remote ? remote.y : group.originY;
        const isHeld = Boolean(group.heldBy);
        const holderColor = group.heldBy ? colorByPlayer[group.heldBy] : undefined;

        return group.pieceIds.map((pieceId) => {
          const row = Math.floor(pieceId / cols);
          const col = pieceId % cols;
          return (
            <PuzzlePiece
              key={pieceId}
              groupId={group.id}
              pieceId={pieceId}
              rows={rows}
              cols={cols}
              pieceSize={pieceSize}
              edgeSignsH={edgeSignsH}
              edgeSignsV={edgeSignsV}
              shapeVersion={shapeVersion}
              imageSrc={imageSrc}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              cropX={cropX}
              cropY={cropY}
              cropWidth={cropWidth}
              cropHeight={cropHeight}
              x={originX + col * pieceSize}
              y={originY + row * pieceSize}
              isHeld={isHeld}
              isOwnHold={isOwnHold}
              holderColor={holderColor}
              isSolved={solved}
              onPointerDown={onPiecePointerDown}
              onPointerMove={onPiecePointerMove}
              onPointerUp={onPiecePointerUp}
            />
          );
        });
      })}
    </>
  );
}

const PieceLayer = memo(PieceLayerImpl);

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [camera, setCamera] = useState<Camera>({ zoom: 1, panX: 0, panY: 0 });
  const [referenceVisible, setReferenceVisible] = useState(false);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const [localDrag, setLocalDrag] = useState<LocalDrag | null>(null);
  const dragStartRef = useRef<DragStart | null>(null);
  const localDragRef = useRef<LocalDrag | null>(null);
  localDragRef.current = localDrag;

  // Referências para o estado "vivo" mais recente — usadas pelos handlers de
  // peça para que eles NUNCA precisem depender de `state`/`selfId` (que mudam
  // de referência a cada jogada). Isso é o que dá identidade estável às
  // funções abaixo, requisito para o React.memo do PieceLayer/PuzzlePiece
  // realmente pular trabalho.
  const stateRef = useRef(state);
  stateRef.current = state;
  const selfIdRef = useRef(selfId);
  selfIdRef.current = selfId;

  const panDragRef = useRef<PanDrag | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const spacePressedRef = useRef(false);
  spacePressedRef.current = spacePressed;
  const touchPointsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<PinchState | null>(null);
  const initializedKeyRef = useRef<string | null>(null);

  // Agrupa atualizações de câmera num único requestAnimationFrame por vez —
  // scroll do mouse e pointermove de arrastar câmera podem disparar mais
  // eventos por segundo do que a tela consegue desenhar; sem isso, cada
  // evento bruto virava um render completo.
  const cameraRafRef = useRef<number | null>(null);
  const pendingCameraRef = useRef<Camera | null>(null);
  const scheduleCameraUpdate = useCallback((next: Camera) => {
    pendingCameraRef.current = next;
    if (cameraRafRef.current !== null) return;
    cameraRafRef.current = requestAnimationFrame(() => {
      cameraRafRef.current = null;
      if (pendingCameraRef.current) setCamera(pendingCameraRef.current);
    });
  }, []);

  // Mesma ideia para o arrastar de peça: no máximo 1 atualização de estado
  // (e 1 emissão de socket) por frame, mesmo que o pointermove dispare mais.
  const dragRafRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{ groupId: string; x: number; y: number } | null>(null);
  const scheduleDragUpdate = useCallback(
    (groupId: string, x: number, y: number) => {
      pendingDragRef.current = { groupId, x, y };
      if (dragRafRef.current !== null) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        const pending = pendingDragRef.current;
        if (!pending) return;
        setLocalDrag((prev) => (prev && prev.groupId === pending.groupId ? { ...prev, x: pending.x, y: pending.y } : prev));
        onDrag(pending.groupId, pending.x, pending.y);
      });
    },
    [onDrag]
  );

  useEffect(
    () => () => {
      if (cameraRafRef.current !== null) cancelAnimationFrame(cameraRafRef.current);
      if (dragRafRef.current !== null) cancelAnimationFrame(dragRafRef.current);
    },
    []
  );

  const assembled = useMemo(
    () => ({ width: state.cols * state.pieceSize, height: state.rows * state.pieceSize }),
    [state.cols, state.rows, state.pieceSize]
  );

  const { minZoom, maxZoom } = useMemo(
    () => computeZoomBounds(viewportSize.w || 1, viewportSize.h || 1, state.boardWidth, state.boardHeight, state.pieceSize),
    [viewportSize.w, viewportSize.h, state.boardWidth, state.boardHeight, state.pieceSize]
  );
  const minZoomRef = useRef(minZoom);
  const maxZoomRef = useRef(maxZoom);
  minZoomRef.current = minZoom;
  maxZoomRef.current = maxZoom;

  const colorByPlayer = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p.color])), [players]);

  // Mede o viewport (a área full-bleed disponível para o quadro).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setViewportSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Câmera inicial (ou ao trocar de imagem/dificuldade): centraliza na moldura-guia.
  useEffect(() => {
    if (viewportSize.w <= 0 || viewportSize.h <= 0) return;
    const key = `${state.boardWidth}x${state.boardHeight}x${state.targetX}x${state.targetY}`;
    if (initializedKeyRef.current === key) return;
    initializedKeyRef.current = key;

    const fit = computeFitCamera(
      viewportSize.w,
      viewportSize.h,
      state.targetX,
      state.targetY,
      assembled.width,
      assembled.height,
      minZoom,
      maxZoom
    );
    setCamera(clampCamera(fit, viewportSize.w, viewportSize.h, state.boardWidth, state.boardHeight, minZoom, maxZoom));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportSize.w, viewportSize.h, state.boardWidth, state.boardHeight, state.targetX, state.targetY]);

  // Zoom por scroll do mouse — listener nativo para garantir que preventDefault funcione.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0016);

      const cam = cameraRef.current;
      const newZoom = Math.min(maxZoomRef.current, Math.max(minZoomRef.current, cam.zoom * factor));
      const next = zoomAtPoint(cam, cx, cy, newZoom);
      scheduleCameraUpdate(
        clampCamera(next, viewportSize.w, viewportSize.h, state.boardWidth, state.boardHeight, minZoomRef.current, maxZoomRef.current)
      );
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [viewportSize.w, viewportSize.h, state.boardWidth, state.boardHeight, scheduleCameraUpdate]);

  // Espaço + clique esquerdo também move a câmera (além do botão do meio).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      setSpacePressed(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpacePressed(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const cancelActiveDrag = useCallback(() => {
    const active = localDragRef.current;
    if (active) {
      onDrop(active.groupId, active.x, active.y);
      setLocalDrag(null);
      dragStartRef.current = null;
    }
  }, [onDrop]);

  // Rede de segurança: se a janela perder o foco no meio de um arraste (peça
  // ou câmera) — ex.: alt-tab, DevTools, ou o botão ser solto fora da janela —
  // libera tudo em vez de deixar uma peça "presa" para sempre.
  useEffect(() => {
    const handleBlur = () => {
      cancelActiveDrag();
      panDragRef.current = null;
      pinchRef.current = null;
      touchPointsRef.current.clear();
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [cancelActiveDrag]);

  // Fase de captura: registra TODOS os toques (mesmo os que caem em cima de uma peça)
  // antes que o handler da própria peça decida se deve iniciar um arraste — é isso
  // que permite diferenciar com segurança "1 dedo = arrastar peça" de "2 dedos = câmera".
  const handleViewportPointerDownCapture = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") {
      touchPointsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
  }, []);

  // ---- Câmera: pan/zoom pelo container (mouse e toque) ----

  const handleViewportPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch") {
        if (touchPointsRef.current.size === 2) {
          cancelActiveDrag();
          const pts = [...touchPointsRef.current.values()];
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
          pinchRef.current = {
            initialDist: dist || 1,
            initialZoom: cameraRef.current.zoom,
            initialMid: mid,
            initialPan: { x: cameraRef.current.panX, y: cameraRef.current.panY },
          };
        }
        return;
      }

      if (e.button === 1 || (e.button === 0 && spacePressedRef.current)) {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        panDragRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          startPanX: cameraRef.current.panX,
          startPanY: cameraRef.current.panY,
        };
      }
    },
    [cancelActiveDrag]
  );

  const handleViewportPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch" && touchPointsRef.current.has(e.pointerId)) {
        touchPointsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (touchPointsRef.current.size === 2 && pinchRef.current && viewportRef.current) {
          const pts = [...touchPointsRef.current.values()];
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
          const rect = viewportRef.current.getBoundingClientRect();
          const cx = (pts[0].x + pts[1].x) / 2 - rect.left;
          const cy = (pts[0].y + pts[1].y) / 2 - rect.top;

          const pinch = pinchRef.current;
          const scaleFactor = dist / pinch.initialDist;
          const newZoom = Math.min(maxZoomRef.current, Math.max(minZoomRef.current, pinch.initialZoom * scaleFactor));

          const initialCx = pinch.initialMid.x - rect.left;
          const initialCy = pinch.initialMid.y - rect.top;
          const worldX = (initialCx - pinch.initialPan.x) / pinch.initialZoom;
          const worldY = (initialCy - pinch.initialPan.y) / pinch.initialZoom;

          const next = { zoom: newZoom, panX: cx - worldX * newZoom, panY: cy - worldY * newZoom };
          scheduleCameraUpdate(
            clampCamera(next, viewportSize.w, viewportSize.h, state.boardWidth, state.boardHeight, minZoomRef.current, maxZoomRef.current)
          );
        }
        return;
      }

      if (panDragRef.current && e.pointerId === panDragRef.current.pointerId) {
        const drag = panDragRef.current;
        const panX = drag.startPanX + (e.clientX - drag.startX);
        const panY = drag.startPanY + (e.clientY - drag.startY);
        scheduleCameraUpdate(
          clampCamera(
            { zoom: cameraRef.current.zoom, panX, panY },
            viewportSize.w,
            viewportSize.h,
            state.boardWidth,
            state.boardHeight,
            minZoomRef.current,
            maxZoomRef.current
          )
        );
      }
    },
    [viewportSize.w, viewportSize.h, state.boardWidth, state.boardHeight, scheduleCameraUpdate]
  );

  const handleViewportPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") {
      touchPointsRef.current.delete(e.pointerId);
      if (touchPointsRef.current.size < 2) pinchRef.current = null;
      return;
    }
    if (panDragRef.current && e.pointerId === panDragRef.current.pointerId) {
      panDragRef.current = null;
    }
  }, []);

  // ---- Peças: pegar / arrastar / soltar (mesmo protocolo de antes) ----
  // Lêem sempre stateRef/selfIdRef (nunca `state`/`selfId` direto), então a
  // identidade destas funções nunca muda entre jogadas — é isso que permite
  // ao PieceLayer/PuzzlePiece memoizados realmente pular trabalho.

  const handlePiecePointerDown = useCallback(
    (groupId: string, e: React.PointerEvent<HTMLDivElement>) => {
      const current = stateRef.current;
      if (current.solved) return;
      if (e.pointerType !== "touch" && e.button !== 0) return; // só botão esquerdo inicia arraste de peça
      if (e.pointerType === "touch" && touchPointsRef.current.size > 1) return; // gesto de 2 dedos em andamento
      if (e.pointerType !== "touch" && spacePressedRef.current) return; // espaço = modo câmera
      const group = current.groups[groupId];
      if (!group || (group.heldBy && group.heldBy !== selfIdRef.current)) return;

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
    [onPickup]
  );

  const handlePiecePointerMove = useCallback(
    (groupId: string, e: React.PointerEvent<HTMLDivElement>) => {
      const current = localDragRef.current;
      if (!current || current.groupId !== groupId || current.pointerId !== e.pointerId) return;
      const start = dragStartRef.current;
      if (!start) return;

      const dx = (e.clientX - start.pointerX) / cameraRef.current.zoom;
      const dy = (e.clientY - start.pointerY) / cameraRef.current.zoom;
      scheduleDragUpdate(groupId, start.originX + dx, start.originY + dy);
    },
    [scheduleDragUpdate]
  );

  const handlePiecePointerUp = useCallback(
    (groupId: string, e: React.PointerEvent<HTMLDivElement>) => {
      const current = localDragRef.current;
      if (!current || current.groupId !== groupId || current.pointerId !== e.pointerId) return;
      onDrop(groupId, current.x, current.y);
      setLocalDrag(null);
      dragStartRef.current = null;
    },
    [onDrop]
  );

  // ---- Controles ----

  const zoomBy = useCallback(
    (factor: number) => {
      const cam = cameraRef.current;
      const cx = viewportSize.w / 2;
      const cy = viewportSize.h / 2;
      const newZoom = Math.min(maxZoomRef.current, Math.max(minZoomRef.current, cam.zoom * factor));
      const next = zoomAtPoint(cam, cx, cy, newZoom);
      setCamera(
        clampCamera(next, viewportSize.w, viewportSize.h, state.boardWidth, state.boardHeight, minZoomRef.current, maxZoomRef.current)
      );
    },
    [viewportSize.w, viewportSize.h, state.boardWidth, state.boardHeight]
  );

  const centralize = useCallback(() => {
    if (viewportSize.w <= 0 || viewportSize.h <= 0) return;
    const target = clampCamera(
      computeFitCamera(viewportSize.w, viewportSize.h, state.targetX, state.targetY, assembled.width, assembled.height, minZoom, maxZoom),
      viewportSize.w,
      viewportSize.h,
      state.boardWidth,
      state.boardHeight,
      minZoom,
      maxZoom
    );
    const from = cameraRef.current;
    animate(0, 1, {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (t) => {
        setCamera({
          zoom: from.zoom + (target.zoom - from.zoom) * t,
          panX: from.panX + (target.panX - from.panX) * t,
          panY: from.panY + (target.panY - from.panY) * t,
        });
      },
    });
  }, [viewportSize, state.targetX, state.targetY, assembled.width, assembled.height, state.boardWidth, state.boardHeight, minZoom, maxZoom]);

  const cursorStyle = spacePressed ? "grab" : "default";

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full select-none overflow-hidden"
      style={{
        cursor: cursorStyle,
        background:
          "radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.5), rgba(241,228,211,0.3) 60%), repeating-linear-gradient(135deg, rgba(74,63,69,0.025) 0px, rgba(74,63,69,0.025) 2px, transparent 2px, transparent 16px)",
      }}
      onPointerDownCapture={handleViewportPointerDownCapture}
      onPointerDown={handleViewportPointerDown}
      onPointerMove={handleViewportPointerMove}
      onPointerUp={handleViewportPointerUp}
      onPointerCancel={handleViewportPointerUp}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: state.boardWidth,
          height: state.boardHeight,
          transform: `matrix(${camera.zoom}, 0, 0, ${camera.zoom}, ${camera.panX}, ${camera.panY})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {/* moldura-guia: mostra onde a imagem final se monta */}
        <div
          className="absolute rounded-2xl border-2 border-dashed border-white/70"
          style={{
            left: state.targetX,
            top: state.targetY,
            width: assembled.width,
            height: assembled.height,
            background: "rgba(255,255,255,0.10)",
          }}
        />

        <PieceLayer
          groups={state.groups}
          rows={state.rows}
          cols={state.cols}
          pieceSize={state.pieceSize}
          edgeSignsH={state.edgeSignsH}
          edgeSignsV={state.edgeSignsV}
          shapeVersion={state.startedAt}
          imageSrc={imageSrc}
          imageWidth={state.imageWidth}
          imageHeight={state.imageHeight}
          cropX={state.cropX}
          cropY={state.cropY}
          cropWidth={state.cropWidth}
          cropHeight={state.cropHeight}
          solved={state.solved}
          colorByPlayer={colorByPlayer}
          remoteDrags={remoteDrags}
          localDrag={localDrag}
          onPiecePointerDown={handlePiecePointerDown}
          onPiecePointerMove={handlePiecePointerMove}
          onPiecePointerUp={handlePiecePointerUp}
        />
      </div>

      {/* controles flutuantes da câmera */}
      <div className="pointer-events-auto absolute right-4 top-4">
        <ZoomControls onZoomIn={() => zoomBy(1.25)} onZoomOut={() => zoomBy(0.8)} onCentralize={centralize} />
      </div>

      <div className="pointer-events-auto absolute bottom-4 right-4">
        <ReferencePanel imageSrc={imageSrc} visible={referenceVisible} onToggle={() => setReferenceVisible((v) => !v)} />
      </div>
    </div>
  );
}
