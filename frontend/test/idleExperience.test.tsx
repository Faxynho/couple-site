import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import IdleChoicePage from "@/app/cantinho/page";
import DuoGlobalCoinsBadge from "@/components/duo/DuoGlobalCoinsBadge";

const mocks = vi.hoisted(() => ({
  accountId: "andre" as "andre" | "flavia",
  addFunds: vi.fn(async () => ({ globalCoins: 0 })),
  reload: vi.fn(async () => undefined),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("next/image", () => ({ default: ({ alt = "", src }: { alt?: string; src: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} data-src={src} /> }));
vi.mock("@/lib/idleApi", () => ({ addIdleTestFunds: mocks.addFunds }));
vi.mock("@/hooks/useIdleGame", () => ({
  useIdleGame: () => ({
    snapshot: { areaName: "Nosso Cantinho", globalCoins: 1280 },
    error: null,
    loading: false,
    accountId: mocks.accountId,
    reload: mocks.reload,
  }),
}));

describe("Experiência do idle compartilhado", () => {
  afterEach(() => {
    cleanup();
    mocks.accountId = "andre";
    mocks.addFunds.mockClear();
    mocks.reload.mockClear();
  });

  it("exibe o Modo Desenvolvedor apenas para André", () => {
    const { unmount } = render(<IdleChoicePage />);
    expect(screen.getByRole("button", { name: /Modo Desenvolvedor/ })).toBeInTheDocument();
    unmount();
    mocks.accountId = "flavia";
    render(<IdleChoicePage />);
    expect(screen.queryByRole("button", { name: /Modo Desenvolvedor/ })).not.toBeInTheDocument();
  });

  it("permite adicionar separadamente dinheiro de teste", async () => {
    render(<IdleChoicePage />);
    fireEvent.click(screen.getByRole("button", { name: /Modo Desenvolvedor/ }));
    fireEvent.change(screen.getByLabelText(/Dinheiro da Fazendinha/), { target: { value: "250000" } });
    const row = screen.getByLabelText(/Dinheiro da Fazendinha/).closest("div")?.parentElement;
    fireEvent.click(row!.querySelector("button")!);
    await waitFor(() => expect(mocks.addFunds).toHaveBeenCalledWith("farm", 250000, "andre"));
    expect(mocks.reload).toHaveBeenCalled();
  });

  it("mostra a moeda global compartilhada no badge do lobby", () => {
    render(<DuoGlobalCoinsBadge />);
    expect(screen.getByText("Moeda global")).toBeInTheDocument();
    expect(screen.getByText("1,3K")).toBeInTheDocument();
  });
});
