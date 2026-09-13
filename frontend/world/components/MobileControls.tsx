"use client";

import { WorldGameApi } from "@/world/game/WorldGameApi";

export default function MobileControls({ api }: { api: WorldGameApi | null }) {
  const stopMovement = () => api?.setTouchDirection(0, 0);

  const press = (x: number, y: number) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      api?.setTouchDirection(x, y);
    },
    onPointerUp: stopMovement,
    onPointerCancel: stopMovement,
    onLostPointerCapture: stopMovement,
  });

  return (
    <div
      className="world-mobile-controls"
      aria-label="Controles de movimento"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="world-dpad">
        <button className="up" {...press(0, -1)} aria-label="Mover para cima">▲</button>
        <button className="left" {...press(-1, 0)} aria-label="Mover para esquerda">◀</button>
        <button className="right" {...press(1, 0)} aria-label="Mover para direita">▶</button>
        <button className="down" {...press(0, 1)} aria-label="Mover para baixo">▼</button>
      </div>

      <button
        className="world-interact-button"
        onPointerDown={(event) => {
          event.preventDefault();
          api?.interact();
        }}
        aria-label="Interagir"
      >
        E
      </button>
    </div>
  );
}
