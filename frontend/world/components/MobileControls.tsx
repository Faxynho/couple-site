"use client";

import { useEffect, useRef, useState } from "react";
import { WorldGameApi } from "@/world/game/WorldGameApi";
import { WorldMobileControlMode } from "@/world/settings/WorldInputSettings";

const JOYSTICK_DEADZONE = 0.14;

export default function MobileControls({ api, mode }: { api: WorldGameApi | null; mode: WorldMobileControlMode }) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const activeJoystickPointer = useRef<number | null>(null);
  const activeDpadPointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [activeDpadDirection, setActiveDpadDirection] = useState<string | null>(null);

  const stopMovement = () => api?.setTouchDirection(0, 0);

  useEffect(() => {
    stopMovement();
    activeJoystickPointer.current = null;
    activeDpadPointer.current = null;
    setKnob({ x: 0, y: 0 });
    setActiveDpadDirection(null);
    return stopMovement;
  }, [api, mode]);

  const updateDpadFromPoint = (element: HTMLDivElement, clientX: number, clientY: number) => {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const normalizedX = Math.min(0.999999, Math.max(0, (clientX - rect.left) / rect.width));
    const normalizedY = Math.min(0.999999, Math.max(0, (clientY - rect.top) / rect.height));
    const column = Math.floor(normalizedX * 3);
    const row = Math.floor(normalizedY * 3);

    const directions = [
      [
        { x: -1, y: -1, key: "up-left" },
        { x: 0, y: -1, key: "up" },
        { x: 1, y: -1, key: "up-right" },
      ],
      [
        { x: -1, y: 0, key: "left" },
        { x: 0, y: 0, key: null },
        { x: 1, y: 0, key: "right" },
      ],
      [
        { x: -1, y: 1, key: "down-left" },
        { x: 0, y: 1, key: "down" },
        { x: 1, y: 1, key: "down-right" },
      ],
    ] as const;

    const direction = directions[row][column];
    setActiveDpadDirection(direction.key);
    api?.setTouchDirection(direction.x, direction.y);
  };

  const releaseDpad = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (event && activeDpadPointer.current !== null && event.pointerId !== activeDpadPointer.current) return;
    activeDpadPointer.current = null;
    setActiveDpadDirection(null);
    stopMovement();
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const element = joystickRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDistance = Math.max(1, rect.width / 2 - 18);
    const rawX = clientX - centerX;
    const rawY = clientY - centerY;
    const distance = Math.hypot(rawX, rawY);
    const ratio = distance > maxDistance ? maxDistance / distance : 1;
    const x = rawX * ratio;
    const y = rawY * ratio;
    const normalizedX = x / maxDistance;
    const normalizedY = y / maxDistance;
    const magnitude = Math.hypot(normalizedX, normalizedY);

    setKnob({ x, y });
    if (magnitude < JOYSTICK_DEADZONE) api?.setTouchDirection(0, 0);
    else api?.setTouchDirection(normalizedX, normalizedY);
  };

  const releaseJoystick = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (event && activeJoystickPointer.current !== null && event.pointerId !== activeJoystickPointer.current) return;
    activeJoystickPointer.current = null;
    setKnob({ x: 0, y: 0 });
    stopMovement();
  };

  return (
    <div
      className={`world-mobile-controls mode-${mode}`}
      aria-label="Controles de movimento"
      onContextMenu={(event) => event.preventDefault()}
    >
      {mode === "dpad" && (
        <div
          className="world-dpad world-dpad-eight"
          aria-label="Direcional de oito direções"
          onPointerDown={(event) => {
            event.preventDefault();
            if (activeDpadPointer.current !== null && activeDpadPointer.current !== event.pointerId) return;
            activeDpadPointer.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            updateDpadFromPoint(event.currentTarget, event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (activeDpadPointer.current !== event.pointerId) return;
            event.preventDefault();
            updateDpadFromPoint(event.currentTarget, event.clientX, event.clientY);
          }}
          onPointerUp={releaseDpad}
          onPointerCancel={releaseDpad}
          onLostPointerCapture={releaseDpad}
        >
          <button type="button" className={`up-left${activeDpadDirection === "up-left" ? " pressed" : ""}`} aria-label="Mover para cima e esquerda">↖</button>
          <button type="button" className={`up${activeDpadDirection === "up" ? " pressed" : ""}`} aria-label="Mover para cima">▲</button>
          <button type="button" className={`up-right${activeDpadDirection === "up-right" ? " pressed" : ""}`} aria-label="Mover para cima e direita">↗</button>
          <button type="button" className={`left${activeDpadDirection === "left" ? " pressed" : ""}`} aria-label="Mover para esquerda">◀</button>
          <button type="button" className={`right${activeDpadDirection === "right" ? " pressed" : ""}`} aria-label="Mover para direita">▶</button>
          <button type="button" className={`down-left${activeDpadDirection === "down-left" ? " pressed" : ""}`} aria-label="Mover para baixo e esquerda">↙</button>
          <button type="button" className={`down${activeDpadDirection === "down" ? " pressed" : ""}`} aria-label="Mover para baixo">▼</button>
          <button type="button" className={`down-right${activeDpadDirection === "down-right" ? " pressed" : ""}`} aria-label="Mover para baixo e direita">↘</button>
        </div>
      )}

      {mode === "joystick" && (
        <div
          ref={joystickRef}
          className="world-joystick"
          aria-label="Joystick virtual"
          onPointerDown={(event) => {
            event.preventDefault();
            activeJoystickPointer.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            updateJoystick(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (activeJoystickPointer.current !== event.pointerId) return;
            event.preventDefault();
            updateJoystick(event.clientX, event.clientY);
          }}
          onPointerUp={releaseJoystick}
          onPointerCancel={releaseJoystick}
          onLostPointerCapture={releaseJoystick}
        >
          <div className="world-joystick-ring" />
          <div className="world-joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
        </div>
      )}

      {mode !== "tap" && (
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
      )}
    </div>
  );
}
