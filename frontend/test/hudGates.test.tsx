import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ThemeToggleGate from "@/components/ThemeToggleGate";
import ThemeToggle from "@/components/ThemeToggle";
import AccountPanelGate from "@/components/account/AccountPanelGate";
import { fetchAccounts } from "@/lib/accountApi";
import { resetAccountProfilesStoreForTests } from "@/lib/accountProfilesStore";
import { applyTheme } from "@/lib/theme";

let pathname = "/duo";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/accountApi", () => ({
  fetchAccounts: vi.fn(),
  fetchAccountsOverview: () => new Promise(() => {}),
}));

describe("HUD global (tema, som e botão da conta) por rota", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    resetAccountProfilesStoreForTests();
    vi.mocked(fetchAccounts).mockReset().mockResolvedValue([
      { id: "andre", name: "André", photo: null, border: null },
      { id: "flavia", name: "Flávia", photo: null, border: null },
    ]);
    window.localStorage.setItem("couple-site:active-account", JSON.stringify({ type: "account", id: "andre" }));
  });
  afterEach(cleanup);

  it("em páginas comuns mantém os botões flutuantes de tema e som", () => {
    pathname = "/duo";
    render(<ThemeToggleGate />);
    expect(screen.getByRole("button", { name: /Mudar para modo/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sons/i })).toBeInTheDocument();
  });

  it("no lobby persistente os botões de tema e som não aparecem (foram para Configurações)", () => {
    pathname = "/sala/PERSISTENT_DUO";
    render(<ThemeToggleGate />);
    expect(screen.queryByRole("button", { name: /Mudar para modo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sons/i })).not.toBeInTheDocument();
  });

  it("numa sala comum (/sala/ABCDE) os botões continuam lá", () => {
    pathname = "/sala/ABCDE";
    render(<ThemeToggleGate />);
    expect(screen.getByRole("button", { name: /Mudar para modo/ })).toBeInTheDocument();
  });

  it("o botão flutuante da conta some só no lobby persistente (lá existe o card do jogador)", async () => {
    pathname = "/duo";
    const { unmount } = render(<AccountPanelGate />);
    expect(await screen.findByRole("button", { name: "Abrir minha conta" })).toBeInTheDocument();
    unmount();

    pathname = "/sala/PERSISTENT_DUO";
    render(<AccountPanelGate />);
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "Abrir minha conta" })).not.toBeInTheDocument();
  });

  it("o botão flutuante de tema acompanha o tema trocado em outro lugar (ex.: Configurações)", async () => {
    render(<ThemeToggle />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Mudar para modo escuro" })).toBeInTheDocument());
    act(() => applyTheme("dark"));
    expect(screen.getByRole("button", { name: "Mudar para modo claro" })).toBeInTheDocument();
    // e o clique seguinte realmente alterna (não fica "um clique atrás")
    fireEvent.click(screen.getByRole("button", { name: "Mudar para modo claro" }));
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
