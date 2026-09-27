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
    snapshot: { areaName: "Fazendinhas", globalCoins: 1280 },
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
    mocks.push.mockClear();
  });

  it("exibe o Modo Desenvolvedor apenas para André", () => {
    const { unmount } = render(<IdleChoicePage />);
    expect(screen.getByRole("button", { name: /Modo Desenvolvedor/ })).toBeInTheDocument();
    unmount();
    mocks.accountId = "flavia";
    render(<IdleChoicePage />);
    expect(screen.queryByRole("button", { name: /Modo Desenvolvedor/ })).not.toBeInTheDocument();
  });

  it("leva André à seleção do ambiente DEV separado", async () => {
    render(<IdleChoicePage />);
    fireEvent.click(screen.getByRole("button", { name: /Modo Desenvolvedor/ }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/cantinho/dev"));
    expect(mocks.addFunds).not.toHaveBeenCalled();
  });

  it("mostra a moeda global compartilhada no badge do lobby", () => {
    render(<DuoGlobalCoinsBadge />);
    expect(screen.queryByText("Moeda global")).not.toBeInTheDocument();
    expect(screen.getByText("1,3K")).toBeInTheDocument();
    expect(document.querySelector('[data-src="/idle/icons/global-coin.webp"]')).toBeInTheDocument();
  });

  it("mostra o tutorial de cinco passos somente para Flávia e permite reabrir", () => {
    mocks.accountId = "flavia";
    render(<IdleChoicePage />);
    const open = screen.getByRole("button", { name: /Como jogar/ });
    fireEvent.click(open);
    expect(screen.getByRole("dialog", { name: "Como jogar" })).toBeInTheDocument();
    expect(screen.getByText("Toque para ganhar")).toBeInTheDocument();
    expect(screen.getByText("Moedas globais")).toBeInTheDocument();
    expect(screen.getAllByText(/^0[1-5]$/)).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Entendi 💗" }));
    expect(screen.queryByRole("dialog", { name: "Como jogar" })).not.toBeInTheDocument();
    fireEvent.click(open);
    expect(screen.getByRole("dialog", { name: "Como jogar" })).toBeInTheDocument();
  });
});
