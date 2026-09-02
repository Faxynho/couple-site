import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AccountPanel from "@/components/account/AccountPanel";
import SettingsTab from "@/components/account/SettingsTab";
import { getStoredVisualTheme } from "@/lib/theme";

vi.mock("@/lib/accountApi", () => ({
  fetchAccountsOverview: () => new Promise(() => {}),
  resizeImageToDataUrl: vi.fn(),
  updateAccountProfile: vi.fn(),
  resetDuoParticipation: vi.fn(),
  resetDuoSharedStats: vi.fn(),
  resetRecords: vi.fn(),
  resetSoloStats: vi.fn(),
  resetTogetherRecords: vi.fn(),
}));

describe("Configurações e temas", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.dataset.theme = "default";
  });

  afterEach(cleanup);

  it("oferece Configurações e Temas para a conta flavia sem expor o reset", async () => {
    render(
      <AccountPanel
        accountId="flavia"
        profile={{ id: "flavia", name: "Flavia", photo: null }}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Configurações" }));
    expect(screen.getByRole("button", { name: /Temas/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Resetar estatísticas e recordes/ })).not.toBeInTheDocument();
  });

  it("mantém o reset exclusivo de andre e troca o tema sem alterar claro/escuro", () => {
    document.documentElement.classList.add("dark");
    render(<SettingsTab accountId="andre" overview={null} onChanged={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Resetar estatísticas e recordes/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Temas/ }));
    fireEvent.click(screen.getByRole("button", { name: /Corações/ }));

    expect(document.documentElement.dataset.theme).toBe("romance");
    expect(document.documentElement).toHaveClass("dark");
    expect(getStoredVisualTheme()).toBe("romance");
    expect(window.localStorage.getItem("couple-site:visual-theme")).toBe("romance");
  });
});
