// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as Phaser from "phaser";
import { DecorationPlacementInput } from "@/world/game/DecorationPlacementInput";

vi.mock("phaser", () => ({ Scene: class {} }));

import { WorldScene } from "@/world/game/WorldScene";

type TestScene = {
  decorationTool: { kind: "place"; itemId: string } | null;
  placementInput: DecorationPlacementInput;
  tapToMoveEnabled: boolean;
  handlePointerDown: (pointer: Phaser.Input.Pointer) => void;
  handlePointerUp: (pointer: Phaser.Input.Pointer) => void;
  beginDomTouchPlacement: (event: PointerEvent) => void;
  moveDomTouchPlacement: (event: PointerEvent) => void;
  finishDomTouchPlacement: (event: PointerEvent) => void;
  cancelDomTouchPlacement: (event: PointerEvent) => void;
  resetPlacementInput: () => void;
  updatePreview: ReturnType<typeof vi.fn>;
  commitDecorationTool: ReturnType<typeof vi.fn>;
  setTapMoveTarget: ReturnType<typeof vi.fn>;
};

function pointerEvent(pointerId: number, clientX: number, clientY: number) {
  return {
    pointerId,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX,
    clientY,
    cancelable: true,
    preventDefault: vi.fn(),
  } as unknown as PointerEvent;
}

function makeScene() {
  const canvas = document.createElement("canvas");
  Object.defineProperty(canvas, "getBoundingClientRect", {
    value: () => ({ left: 100, top: 50, right: 500, bottom: 250, width: 400, height: 200 }),
  });
  canvas.setPointerCapture = vi.fn();
  canvas.hasPointerCapture = vi.fn(() => false);
  canvas.releasePointerCapture = vi.fn();

  const scene = Object.create(WorldScene.prototype) as unknown as TestScene;
  scene.decorationTool = { kind: "place", itemId: "plant-pot" };
  scene.placementInput = new DecorationPlacementInput();
  scene.tapToMoveEnabled = false;
  Object.defineProperty(scene, "game", { value: { canvas } });
  Object.defineProperty(scene, "scale", { value: { width: 400, height: 200 } });
  Object.defineProperty(scene, "cameras", {
    value: { main: { getWorldPoint: (x: number, y: number) => ({ x: x + 10, y: y + 20 }) } },
  });
  scene.updatePreview = vi.fn();
  scene.commitDecorationTool = vi.fn();
  scene.setTapMoveTarget = vi.fn();
  return { scene, canvas };
}

describe("input mobile da decoração", () => {
  beforeEach(() => {
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => null),
    });
  });

  it("mantém apenas preview no down/move e confirma na posição exata do up", () => {
    const { scene, canvas } = makeScene();
    scene.beginDomTouchPlacement(pointerEvent(7, 140, 80));
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(7);
    expect(scene.updatePreview).toHaveBeenLastCalledWith({ worldX: 50, worldY: 50, clientX: 140, clientY: 80 });
    expect(scene.commitDecorationTool).not.toHaveBeenCalled();

    scene.moveDomTouchPlacement(pointerEvent(7, 260, 150));
    expect(scene.updatePreview).toHaveBeenLastCalledWith({ worldX: 170, worldY: 120, clientX: 260, clientY: 150 });
    expect(scene.commitDecorationTool).not.toHaveBeenCalled();

    scene.finishDomTouchPlacement(pointerEvent(7, 300, 170));
    expect(scene.updatePreview).toHaveBeenLastCalledWith({ worldX: 210, worldY: 140, clientX: 300, clientY: 170 });
    expect(scene.commitDecorationTool).toHaveBeenCalledOnce();
    expect(scene.commitDecorationTool).toHaveBeenCalledWith({ worldX: 210, worldY: 140, clientX: 300, clientY: 170 });
  });

  it("não confirma após pointercancel ou saída do canvas", () => {
    const { scene } = makeScene();
    scene.beginDomTouchPlacement(pointerEvent(8, 160, 90));
    scene.cancelDomTouchPlacement(pointerEvent(8, 160, 90));
    scene.finishDomTouchPlacement(pointerEvent(8, 160, 90));
    expect(scene.commitDecorationTool).not.toHaveBeenCalled();

    scene.beginDomTouchPlacement(pointerEvent(9, 160, 90));
    scene.moveDomTouchPlacement(pointerEvent(9, 510, 90));
    scene.finishDomTouchPlacement(pointerEvent(9, 490, 90));
    expect(scene.commitDecorationTool).not.toHaveBeenCalled();
  });

  it("não confirma quando o dedo termina sobre a interface", () => {
    const { scene } = makeScene();
    const panel = document.createElement("section");
    panel.className = "world-decoration-panel";
    const button = document.createElement("button");
    panel.append(button);
    document.body.append(panel);
    vi.mocked(document.elementFromPoint).mockReturnValue(button);

    scene.beginDomTouchPlacement(pointerEvent(10, 180, 100));
    scene.finishDomTouchPlacement(pointerEvent(10, 180, 100));
    expect(scene.commitDecorationTool).not.toHaveBeenCalled();
  });

  it("ignora controles e categorias antes de iniciar decoração ou tap-to-move", () => {
    const { scene } = makeScene();
    const controls = document.createElement("div");
    controls.className = "world-mobile-controls";
    const button = document.createElement("button");
    controls.append(button);
    document.body.append(controls);
    scene.decorationTool = null;
    scene.tapToMoveEnabled = true;

    scene.handlePointerDown({
      id: 1,
      worldX: 80,
      worldY: 90,
      event: { target: button },
      rightButtonDown: () => false,
    } as unknown as Phaser.Input.Pointer);

    expect(scene.setTapMoveTarget).not.toHaveBeenCalled();
    expect(scene.placementInput.active).toBeNull();
  });

  it("não duplica a confirmação no fallback Phaser e limpa captura ao fechar", () => {
    const { scene, canvas } = makeScene();
    const phaserPointer = {
      id: 1,
      worldX: 80,
      worldY: 90,
      event: { target: canvas, clientX: 180, clientY: 100 },
      rightButtonDown: () => false,
    } as unknown as Phaser.Input.Pointer;

    scene.beginDomTouchPlacement(pointerEvent(11, 180, 100));
    scene.handlePointerDown(phaserPointer);
    expect(scene.placementInput.active).toEqual({ source: "dom-touch", id: 11 });
    scene.finishDomTouchPlacement(pointerEvent(11, 180, 100));
    scene.handlePointerUp(phaserPointer);
    expect(scene.commitDecorationTool).toHaveBeenCalledOnce();

    vi.mocked(canvas.hasPointerCapture).mockReturnValue(true);
    scene.beginDomTouchPlacement(pointerEvent(12, 200, 110));
    scene.resetPlacementInput();
    expect(scene.placementInput.active).toBeNull();
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(12);
  });
});
