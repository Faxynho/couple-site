import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SharedDrawingBoard from "@/components/duo/SharedDrawingBoard";

const socketState = vi.hoisted(() => ({
  emitted: [] as Array<{ event: string; args: unknown[] }>,
  handlers: new Map<string, (...args: unknown[]) => void>(),
}));

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({
    on: (event: string, handler: (...args: unknown[]) => void) => socketState.handlers.set(event, handler),
    off: (event: string) => socketState.handlers.delete(event),
    emit: (event: string, ...args: unknown[]) => {
      socketState.emitted.push({ event, args });
      const callback = args.at(-1);
      if (typeof callback !== "function") return;
      if (event === "duoBoard:sync") {
        callback({ ok: true, board: { revision: 0, strokes: [], updatedAt: 0 } });
      } else {
        callback({ ok: true });
      }
    },
  }),
}));

describe("quadro compartilhado no navegador", () => {
  beforeEach(() => {
    socketState.emitted.length = 0;
    socketState.handlers.clear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 1 });
    Object.defineProperty(HTMLCanvasElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 200, width: 300, height: 200, toJSON: () => ({}) }),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, "setPointerCapture", { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLCanvasElement.prototype, "releasePointerCapture", { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLCanvasElement.prototype, "hasPointerCapture", { configurable: true, value: () => true });
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: () => ({
        save: vi.fn(), restore: vi.fn(), setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(),
        arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
      }),
    });
    class ResizeObserverMock {
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  it("bloqueia gestos da página só no canvas e envia pincel, cor e tamanho ao fim do toque", async () => {
    render(<SharedDrawingBoard />);
    await waitFor(() => expect(screen.getByText("Desenho salvo e compartilhado")).toBeTruthy());
    const canvas = screen.getByLabelText("Tela branca do Nosso Quadro") as HTMLCanvasElement;
    expect(canvas.style.touchAction).toBe("none");

    fireEvent.click(screen.getByRole("button", { name: "Vermelho" }));
    fireEvent.click(screen.getByRole("button", { name: "Grande" }));
    fireEvent.pointerDown(canvas, { pointerId: 7, pointerType: "touch", clientX: 30, clientY: 40, button: 0 });
    fireEvent.pointerMove(canvas, { pointerId: 7, pointerType: "touch", clientX: 150, clientY: 100 });
    fireEvent.pointerUp(canvas, { pointerId: 7, pointerType: "touch", clientX: 150, clientY: 100 });

    const addEvent = socketState.emitted.find((item) => item.event === "duoBoard:addStroke");
    expect(addEvent).toBeTruthy();
    expect((addEvent?.args[0] as { stroke: { tool: string; color: string; size: number; points: unknown[] } }).stroke).toMatchObject({
      tool: "brush",
      color: "#ef4444",
      size: 0.026,
    });
    expect((addEvent?.args[0] as { stroke: { points: unknown[] } }).stroke.points.length).toBeGreaterThan(1);
  });

  it("envia a borracha e só limpa tudo depois da confirmação", async () => {
    render(<SharedDrawingBoard />);
    await waitFor(() => expect(screen.getByText("Desenho salvo e compartilhado")).toBeTruthy());
    const canvas = screen.getByLabelText("Tela branca do Nosso Quadro");
    fireEvent.click(screen.getByRole("button", { name: /Borracha/i }));
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: "mouse", clientX: 20, clientY: 20, button: 0 });
    fireEvent.pointerUp(canvas, { pointerId: 2, pointerType: "mouse", clientX: 20, clientY: 20, button: 0 });
    const addEvent = socketState.emitted.find((item) => item.event === "duoBoard:addStroke");
    expect((addEvent?.args[0] as { stroke: { tool: string } }).stroke.tool).toBe("eraser");

    fireEvent.click(screen.getByRole("button", { name: /Apagar tudo/i }));
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(socketState.emitted.some((item) => item.event === "duoBoard:clear")).toBe(true);
  });
});
