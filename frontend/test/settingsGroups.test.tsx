import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import SettingsTab from "@/components/account/SettingsTab";
import { applyTheme } from "@/lib/theme";

vi.mock("@/lib/accountApi", () => ({
  resetDuoParticipation: vi.fn(),
  resetDuoSharedStats: vi.fn(),
  resetRecords: vi.fn(),
  resetSoloStats: vi.fn(),
  resetTogetherRecords: vi.fn(),
}));

function renderSettings(accountId: "andre" | "flavia" = "flavia") {
  return render(<SettingsTab accountId={accountId} overview={null} onChanged={vi.fn()} />);
}

describe("aba Configurações — organização em grupos", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.dataset.theme = "default";
  });
  afterEach(cleanup);

  it("mostra os grupos Aparência e Som para qualquer conta fixa, sem Administração para a flavia", () => {
    renderSettings("flavia");
    expect(screen.getByRole("heading", { name: "Configurações" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Aparência" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Som" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Administração" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Resetar estatísticas e recordes/)).not.toBeInTheDocument();
  });

  it("o reset aparece só para o andre, dentro do grupo Administração", () => {
    renderSettings("andre");
    const admin = screen.getByRole("region", { name: "Administração" });
    expect(within(admin).getByRole("button", { name: /Resetar estatísticas e recordes/ })).toBeInTheDocument();
  });

  it("modo claro/escuro: reflete o tema atual, aplica na página e salva a escolha", () => {
    document.documentElement.classList.add("dark");
    renderSettings();
    const light = screen.getByRole("button", { name: "Modo claro" });
    const dark = screen.getByRole("button", { name: "Modo escuro" });
    expect(dark).toHaveAttribute("aria-pressed", "true");
    expect(light).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(light);
    expect(document.documentElement).not.toHaveClass("dark");
    expect(window.localStorage.getItem("couple-site:theme")).toBe("light");
    expect(light).toHaveAttribute("aria-pressed", "true");
    expect(dark).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(dark);
    expect(document.documentElement).toHaveClass("dark");
    expect(window.localStorage.getItem("couple-site:theme")).toBe("dark");
  });

  it("trocar claro/escuro não mexe no tema visual escolhido", () => {
    document.documentElement.dataset.theme = "romance";
    window.localStorage.setItem("couple-site:visual-theme", "romance");
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Modo escuro" }));
    expect(document.documentElement.dataset.theme).toBe("romance");
    expect(window.localStorage.getItem("couple-site:visual-theme")).toBe("romance");
  });

  it("acompanha mudanças de tema feitas por outro controle", () => {
    renderSettings();
    expect(screen.getByRole("button", { name: "Modo claro" })).toHaveAttribute("aria-pressed", "true");
    act(() => applyTheme("dark"));
    expect(screen.getByRole("button", { name: "Modo escuro" })).toHaveAttribute("aria-pressed", "true");
  });

  it("som: o interruptor liga/desliga e salva a preferência", () => {
    renderSettings();
    const sound = screen.getByRole("switch", { name: "Sons do site" });
    expect(sound).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Ligados/)).toBeInTheDocument();

    fireEvent.click(sound);
    expect(sound).toHaveAttribute("aria-checked", "false");
    expect(window.localStorage.getItem("couple-site:sound-enabled")).toBe("false");
    expect(screen.getByText(/Desligados/)).toBeInTheDocument();

    fireEvent.click(sound);
    expect(sound).toHaveAttribute("aria-checked", "true");
    expect(window.localStorage.getItem("couple-site:sound-enabled")).toBe("true");
  });

  it("respeita o som já desligado ao abrir", () => {
    window.localStorage.setItem("couple-site:sound-enabled", "false");
    renderSettings();
    expect(screen.getByRole("switch", { name: "Sons do site" })).toHaveAttribute("aria-checked", "false");
  });

  it("a linha Temas resume o tema atual e atualiza depois de trocar", () => {
    renderSettings();
    const themesRow = screen.getByRole("button", { name: /Temas/ });
    expect(within(themesRow).getByText("Tema padrão")).toBeInTheDocument();

    fireEvent.click(themesRow);
    fireEvent.click(screen.getByRole("button", { name: /Corações/ }));
    fireEvent.click(screen.getByRole("button", { name: /Configurações/ }));

    expect(within(screen.getByRole("button", { name: /Temas/ })).getByText("Corações")).toBeInTheDocument();
  });
});
