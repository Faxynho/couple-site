import { act, fireEvent, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BoardRaceDie from "../components/boardrace/BoardRaceDie";

describe("ciclo de interação do dado da Trilha", () => {
  const originalRect = HTMLElement.prototype.getBoundingClientRect;
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  const originalRaf = window.requestAnimationFrame;
  const originalCancelRaf = window.cancelAnimationFrame;

  function dispatchPointer(element: HTMLElement, type: string, pointerId: number, clientX = 0, clientY = 0) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY });
    Object.defineProperties(event, {
      pointerId: { value: pointerId },
      isPrimary: { value: true },
    });
    fireEvent(element, event);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    HTMLElement.prototype.getBoundingClientRect = () => ({
      x: 0, y: 0, top: 0, left: 0, right: 390, bottom: 620, width: 390, height: 620, toJSON: () => ({}),
    });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() { return this.tagName === "BUTTON" ? 64 : 0; },
    });
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0)) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => window.clearTimeout(id)) as typeof window.cancelAnimationFrame;
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalRect;
    if (originalOffsetWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancelRaf;
    vi.useRealTimers();
  });

  it("limpa uma captura de toque perdida e restaura o cubo no próximo turno disponível", () => {
    const onRoll = vi.fn();
    const { getByRole, rerender } = render(
      <BoardRaceDie value={3} total={3} serial={0} rolledBy={null} canRoll={false} onRoll={onRoll} />
    );

    rerender(<BoardRaceDie value={3} total={3} serial={0} rolledBy={null} canRoll onRoll={onRoll} />);
    act(() => { vi.runOnlyPendingTimers(); });
    const die = getByRole("button", { name: "Arraste o dado e solte para jogar" });
    expect(die.style.transform).toContain("translate3d");

    dispatchPointer(die, "pointerdown", 11, 160, 440);
    dispatchPointer(die, "lostpointercapture", 11);

    rerender(<BoardRaceDie value={3} total={3} serial={0} rolledBy={null} canRoll={false} onRoll={onRoll} />);
    rerender(<BoardRaceDie value={4} total={4} serial={0} rolledBy={null} canRoll onRoll={onRoll} />);
    act(() => { vi.runOnlyPendingTimers(); });
    expect(die.style.transform).toContain("rotateX(0deg)");

    dispatchPointer(die, "pointerdown", 12, 160, 440);
    dispatchPointer(die, "pointermove", 12, 240, 365);
    dispatchPointer(die, "pointerup", 12, 260, 350);
    expect(onRoll).toHaveBeenCalledTimes(1);
  });

  it("mantém o dado renderizável por 20 trocas de turno em largura móvel", () => {
    const onRoll = vi.fn();
    const { getByRole, rerender } = render(
      <BoardRaceDie value={1} total={1} serial={0} rolledBy={null} canRoll={false} onRoll={onRoll} />
    );

    for (let turn = 1; turn <= 20; turn += 1) {
      const value = ((turn - 1) % 6) + 1;
      rerender(<BoardRaceDie value={value} total={value} serial={turn} rolledBy="BOT" canRoll={false} onRoll={onRoll} />);
      rerender(<BoardRaceDie value={value} total={value} serial={turn} rolledBy={null} canRoll onRoll={onRoll} />);
      act(() => { vi.runOnlyPendingTimers(); });
      const die = getByRole("button", { name: "Arraste o dado e solte para jogar" });
      expect((die as HTMLButtonElement).disabled).toBe(false);
      expect(die.style.transform).toContain("translate3d");
      expect(die.style.transform).not.toContain("NaN");

      if (turn % 4 === 0) {
        dispatchPointer(die, "pointerdown", turn, 160, 440);
        dispatchPointer(die, "lostpointercapture", turn);
      }
    }
  });

  it("não aplica propriedades de agrupamento ao elemento que preserva o cubo 3D", () => {
    const css = readFileSync(resolve(process.cwd(), "components/boardrace/BoardRaceVisual.module.css"), "utf8");
    const readyRule = css.match(/\.throwDieReady\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(readyRule).not.toMatch(/\bfilter\s*:/);
    expect(readyRule).not.toMatch(/\banimation\s*:/);
    expect(css).toContain(".throwDieReady:not(.throwDieDragging):not(.throwDieRolling) .cubeFace");
    expect(css).toContain("@keyframes die-ready-face");
  });
});
