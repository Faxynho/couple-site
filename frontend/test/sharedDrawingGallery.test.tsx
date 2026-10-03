import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SharedDrawingBoard from "@/components/duo/SharedDrawingBoard";

const stroke = (id: string) => ({
  id,
  tool: "brush",
  color: "#ef4444",
  size: 0.014,
  points: [{ x: 0.1, y: 0.1 }, { x: 0.6, y: 0.5 }],
});

const socketState = vi.hoisted(() => ({
  emitted: [] as Array<{ event: string; args: unknown[] }>,
  gallery: [] as Array<{ id: string; strokes: unknown[]; savedAt: number; savedBy: string }>,
  boardStrokes: 1,
}));

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({
    on: () => undefined,
    off: () => undefined,
    emit: (event: string, ...args: unknown[]) => {
      socketState.emitted.push({ event, args });
      const callback = args.at(-1);
      if (typeof callback !== "function") return;
      if (event === "duoBoard:sync") {
        callback({
          ok: true,
          board: {
            revision: 1,
            strokes: Array.from({ length: socketState.boardStrokes }, (_, index) => stroke(`stroke_${index}0000000`)),
            canUndo: socketState.boardStrokes > 0,
            canRedo: false,
            updatedAt: 1,
          },
        });
      } else if (event === "duoBoard:gallerySync") {
        const metaOnly = (args[0] as { metaOnly?: boolean } | undefined)?.metaOnly === true;
        callback({ ok: true, count: socketState.gallery.length, ...(metaOnly ? {} : { items: socketState.gallery }) });
      } else if (event === "duoBoard:saveToGallery") {
        callback({ ok: true, count: socketState.gallery.length + 1 });
      } else if (event === "duoBoard:galleryDelete") {
        const id = (args[0] as { id: string }).id;
        socketState.gallery = socketState.gallery.filter((item) => item.id !== id);
        callback({ ok: true, count: socketState.gallery.length });
      } else {
        callback({ ok: true });
      }
    },
  }),
}));

describe("galeria do Nosso Quadro", () => {
  beforeEach(() => {
    socketState.emitted.length = 0;
    socketState.boardStrokes = 1;
    socketState.gallery = [
      { id: "gallery_aaaaaaaa", strokes: [stroke("stroke_gal00001")], savedAt: Date.UTC(2026, 9, 1, 15, 30), savedBy: "andre" },
      { id: "gallery_bbbbbbbb", strokes: [stroke("stroke_gal00002")], savedAt: Date.UTC(2026, 9, 2, 12, 0), savedBy: "flavia" },
    ];
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 1 });
    Object.defineProperty(HTMLCanvasElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 200, width: 300, height: 200, toJSON: () => ({}) }),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: () => ({
        save: vi.fn(), restore: vi.fn(), setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(),
        arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
      }),
    });
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    vi.stubGlobal("IntersectionObserver", undefined);
  });

  it("o botão de salvar guarda o desenho atual na galeria sem mexer no quadro", async () => {
    render(<SharedDrawingBoard />);
    await waitFor(() => expect(screen.getByText("Desenho salvo e compartilhado")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Salvar na galeria" }));

    expect(socketState.emitted.some((item) => item.event === "duoBoard:saveToGallery")).toBe(true);
    expect(socketState.emitted.some((item) => item.event === "duoBoard:clear" || item.event === "duoBoard:addStroke")).toBe(false);
    await waitFor(() => expect(screen.getByText("Desenho guardado na galeria")).toBeTruthy());
  });

  it("não deixa salvar com o quadro vazio", async () => {
    socketState.boardStrokes = 0;
    render(<SharedDrawingBoard />);
    await waitFor(() => expect(screen.getByText("Desenho salvo e compartilhado")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Salvar na galeria" })).toHaveProperty("disabled", true);
  });

  it("abre a galeria com os desenhos salvos, mostra o contador e fecha", async () => {
    render(<SharedDrawingBoard />);
    await waitFor(() => expect(screen.getByLabelText("2 desenhos salvos")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Abrir galeria de desenhos" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    await waitFor(() => expect(screen.getByLabelText("Desenho salvo por André")).toBeTruthy());
    expect(screen.getByLabelText("Desenho salvo por Flávia")).toBeTruthy();
    // Só visualização: nenhuma ferramenta de desenho dentro da galeria.
    expect(screen.queryByRole("button", { name: /Apagar desenho/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Fechar galeria" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("modo editar permite apagar um desenho da galeria depois de confirmar", async () => {
    render(<SharedDrawingBoard />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir galeria de desenhos" }));
    await waitFor(() => expect(screen.getByLabelText("Desenho salvo por André")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Editar galeria" }));
    fireEvent.click(screen.getByRole("button", { name: "Apagar desenho salvo por André" }));
    expect(socketState.emitted.some((item) => item.event === "duoBoard:galleryDelete")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Apagar" }));
    await waitFor(() => expect(screen.queryByLabelText("Desenho salvo por André")).toBeNull());
    const deleteEvent = socketState.emitted.find((item) => item.event === "duoBoard:galleryDelete");
    expect(deleteEvent?.args[0]).toEqual({ id: "gallery_aaaaaaaa" });
    expect(screen.getByLabelText("Desenho salvo por Flávia")).toBeTruthy();
  });
});
