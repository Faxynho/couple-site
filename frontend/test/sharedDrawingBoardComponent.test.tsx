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
        callback({ ok: true, board: { revision: 0, strokes: [], canUndo: false, canRedo: false, updatedAt: 0 } });
      } else if (event === "duoBoard:undo") {
        callback({ ok: true, board: { revision: 1, strokes: [], canUndo: false, canRedo: true, updatedAt: 1 } });
      } else if (event === "duoBoard:redo") {
        callback({
          ok: true,
          board: {
            revision: 2,
            strokes: [{ id: "stroke_redone", tool: "brush", color: "#123456", size: 0.014, points: [{ x: 0.1, y: 0.1 }] }],
            canUndo: true,
            canRedo: false,
            updatedAt: 2,
          },
        });
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

  it("aceita uma cor personalizada e envia a cor escolhida no traço", async () => {
    render(<SharedDrawingBoard />);
    await waitFor(() => expect(screen.getByText("Desenho salvo e compartilhado")).toBeTruthy());
    const canvas = screen.getByLabelText("Tela branca do Nosso Quadro");
    const picker = screen.getByLabelText("Escolher qualquer cor");

    fireEvent.change(picker, { target: { value: "#12abef" } });
    fireEvent.pointerDown(canvas, { pointerId: 4, pointerType: "touch", clientX: 40, clientY: 40, button: 0 });
    fireEvent.pointerUp(canvas, { pointerId: 4, pointerType: "touch", clientX: 40, clientY: 40, button: 0 });

    const addEvent = socketState.emitted.find((item) => item.event === "duoBoard:addStroke");
    expect((addEvent?.args[0] as { stroke: { color: string } }).stroke.color).toBe("#12abef");
  });

  it("envia desfazer e refazer e atualiza a disponibilidade dos botões", async () => {
    render(<SharedDrawingBoard />);
    await waitFor(() => expect(screen.getByText("Desenho salvo e compartilhado")).toBeTruthy());
    const canvas = screen.getByLabelText("Tela branca do Nosso Quadro");
    const undo = screen.getByRole("button", { name: "Desfazer último traço" });
    const redo = screen.getByRole("button", { name: "Refazer último traço" });
    expect(undo).toHaveProperty("disabled", true);
    expect(redo).toHaveProperty("disabled", true);

    fireEvent.pointerDown(canvas, { pointerId: 8, pointerType: "mouse", clientX: 25, clientY: 25, button: 0 });
    fireEvent.pointerUp(canvas, { pointerId: 8, pointerType: "mouse", clientX: 25, clientY: 25, button: 0 });
    expect(undo).toHaveProperty("disabled", false);

    fireEvent.click(undo);
    expect(socketState.emitted.some((item) => item.event === "duoBoard:undo")).toBe(true);
    expect(redo).toHaveProperty("disabled", false);

    fireEvent.click(redo);
    expect(socketState.emitted.some((item) => item.event === "duoBoard:redo")).toBe(true);
  });
});
