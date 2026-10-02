import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import AccountPanel from "@/components/account/AccountPanel";

vi.mock("@/lib/accountApi", () => ({
  fetchAccounts: vi.fn(() => Promise.resolve([])),
  fetchAccountsOverview: () => new Promise(() => {}),
  updateAccountProfile: vi.fn(),
  resizeImageToDataUrl: vi.fn(),
}));

const profile = { id: "flavia" as const, name: "Flávia", photo: null, border: null };
const tabNames = () => within(screen.getByRole("navigation", { name: "Seções do perfil" })).getAllByRole("button").map((b) => b.textContent);

describe("modos do painel de perfil", () => {
  afterEach(cleanup);

  it("padrão (próprio perfil): 4 abas, com Configurações", () => {
    render(<AccountPanel accountId="flavia" profile={profile} onClose={vi.fn()} />);
    expect(tabNames()).toEqual(["Perfil", "Estatísticas", "Recordes", "Configurações"]);
  });

  it("readOnly (perfil do par nas salas comuns): continua com Perfil, Estatísticas e Recordes", () => {
    render(<AccountPanel accountId="flavia" profile={profile} readOnly onClose={vi.fn()} />);
    expect(tabNames()).toEqual(["Perfil", "Estatísticas", "Recordes"]);
  });

  it("profileOnly: sem barra de abas; só o perfil", () => {
    render(<AccountPanel accountId="flavia" profile={profile} readOnly profileOnly onClose={vi.fn()} />);
    expect(screen.queryByRole("navigation", { name: "Seções do perfil" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Flávia" })).toBeInTheDocument();
    expect(screen.queryByText("Configurações")).not.toBeInTheDocument();
  });
});
