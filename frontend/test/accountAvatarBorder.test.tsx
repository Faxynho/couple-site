import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AccountAvatar from "@/components/account/AccountAvatar";
import { fetchAccounts } from "@/lib/accountApi";
import {
  applyAccountProfileUpdate,
  getAccountProfilesSnapshot,
  refreshAccountProfiles,
  resetAccountProfilesStoreForTests,
} from "@/lib/accountProfilesStore";

vi.mock("@/lib/accountApi", () => ({ fetchAccounts: vi.fn() }));

const profiles = [
  { id: "andre" as const, name: "André", photo: null, border: "coroa-real" },
  { id: "flavia" as const, name: "Flávia", photo: null, border: null },
];

function frame(container: HTMLElement) {
  return container.querySelector<HTMLImageElement>("img[aria-hidden='true']");
}

describe("AccountAvatar com borda", () => {
  beforeEach(() => {
    resetAccountProfilesStoreForTests();
    vi.mocked(fetchAccounts).mockReset();
    vi.mocked(fetchAccounts).mockResolvedValue(profiles);
  });
  afterEach(cleanup);

  it("sem borda mantém o avatar como antes (anel padrão e sem wrapper)", () => {
    const { container } = render(<AccountAvatar name="Ana" size={48} border={null} className="extra" />);
    expect(container.querySelector("[data-avatar-border]")).toBeNull();
    expect(frame(container)).toBeNull();
    const avatar = container.firstElementChild as HTMLElement;
    expect(avatar).toHaveClass("ring-2", "extra");
    expect(avatar).toHaveStyle({ width: "48px", height: "48px" });
  });

  it("com borda desenha a moldura por cima da foto, centrada e maior que o avatar", () => {
    const { container } = render(
      <AccountAvatar name="Ana" photo="data:image/png;base64,AAAA" size={100} border="coroa-real" className="meu-wrapper" />,
    );
    const wrapper = container.querySelector<HTMLElement>("[data-avatar-border='coroa-real']")!;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass("meu-wrapper", "rounded-full", "isolate");
    expect(wrapper).toHaveStyle({ width: "100px", height: "100px" });

    const image = frame(container)!;
    expect(image).toHaveAttribute("src", "/borders/coroa-real.svg");
    expect(image).toHaveAttribute("alt", "");
    // holeRatio 0.72 → moldura 138,89% do avatar, recuada 19,44% para cada lado
    expect(parseFloat(image.style.width)).toBeCloseTo(138.89, 1);
    expect(parseFloat(image.style.height)).toBeCloseTo(138.89, 1);
    expect(parseFloat(image.style.left)).toBeCloseTo(-19.44, 1);
    expect(parseFloat(image.style.top)).toBeCloseTo(-19.44, 1);
    expect(image.style.zIndex).toBe("2");
    // sem isso o reset do Tailwind (max-width:100%) esmaga a moldura até o tamanho do avatar
    expect(image).toHaveClass("max-w-none", "pointer-events-none");

    const photo = screen.getByAltText("Ana");
    expect(photo).toHaveClass("h-full", "w-full", "rounded-full");
    expect(photo).not.toHaveClass("ring-2");
  });

  it("moldura 'back' (asas) fica atrás da foto", () => {
    const { container } = render(<AccountAvatar name="Ana" size={80} border="asas-de-anjo" />);
    const image = frame(container)!;
    expect(image.style.zIndex).toBe("0");
    expect(parseFloat(image.style.width)).toBeCloseTo(177.78, 1);
  });

  it("avatar de iniciais também recebe a moldura", () => {
    const { container } = render(<AccountAvatar name="Ana" accountId="flavia" size={64} border="laco-rosa" />);
    const wrapper = container.querySelector("[data-avatar-border='laco-rosa']")!;
    expect(wrapper).toHaveTextContent("A");
    expect(frame(container)).toBeInTheDocument();
  });

  it("id desconhecido (borda removida do catálogo) não quebra: vira avatar normal", () => {
    const { container } = render(<AccountAvatar name="Ana" size={48} border="borda-que-nao-existe" />);
    expect(container.querySelector("[data-avatar-border]")).toBeNull();
    expect(container.firstElementChild).toHaveClass("ring-2");
  });

  it("se a imagem da moldura falhar ao carregar, some só a moldura", () => {
    const { container } = render(<AccountAvatar name="Ana" photo="data:image/png;base64,AAAA" size={48} border="laco-rosa" />);
    expect(frame(container)).toBeInTheDocument();
    fireEvent.error(frame(container)!);
    expect(frame(container)).toBeNull();
    expect(container.querySelector("[data-avatar-border]")).toBeNull();
    expect(screen.getByAltText("Ana")).toBeInTheDocument();
  });

  it("descobre sozinho a borda equipada pela conta (é assim que vale em todo o site)", async () => {
    const { container } = render(<AccountAvatar name="André" accountId="andre" size={40} />);
    await waitFor(() => expect(container.querySelector("[data-avatar-border='coroa-real']")).toBeInTheDocument());
    expect(fetchAccounts).toHaveBeenCalledTimes(1);
  });

  it("conta sem borda equipada continua sem moldura", async () => {
    const { container } = render(<AccountAvatar name="Flávia" accountId="flavia" size={40} />);
    await waitFor(() => expect(fetchAccounts).toHaveBeenCalled());
    await act(async () => {});
    expect(container.querySelector("[data-avatar-border]")).toBeNull();
  });

  it("border={null} força sem borda mesmo que a conta tenha uma equipada", async () => {
    await refreshAccountProfiles();
    const { container } = render(<AccountAvatar name="André" accountId="andre" size={40} border={null} />);
    expect(container.querySelector("[data-avatar-border]")).toBeNull();
  });

  it("border explícito vence o da conta (pré-visualização na loja)", async () => {
    await refreshAccountProfiles();
    const { container } = render(<AccountAvatar name="André" accountId="andre" size={40} border="laco-rosa" />);
    expect(container.querySelector("[data-avatar-border='laco-rosa']")).toBeInTheDocument();
  });

  it("Visitante (sem accountId) nunca busca nem mostra borda", async () => {
    const { container } = render(<AccountAvatar name="Visita" size={40} />);
    await act(async () => {});
    expect(fetchAccounts).not.toHaveBeenCalled();
    expect(container.querySelector("[data-avatar-border]")).toBeNull();
  });

  it("vários avatares na tela compartilham uma única busca", async () => {
    render(
      <>
        <AccountAvatar name="André" accountId="andre" size={32} />
        <AccountAvatar name="André" accountId="andre" size={48} />
        <AccountAvatar name="Flávia" accountId="flavia" size={48} />
      </>,
    );
    await waitFor(() => expect(document.querySelectorAll("[data-avatar-border]").length).toBe(2));
    expect(fetchAccounts).toHaveBeenCalledTimes(1);
  });

  it("trocar a borda no cache atualiza na hora todos os avatares abertos", async () => {
    const { container } = render(<AccountAvatar name="Flávia" accountId="flavia" size={40} />);
    await waitFor(() => expect(fetchAccounts).toHaveBeenCalled());
    await act(async () => {});
    expect(container.querySelector("[data-avatar-border]")).toBeNull();

    act(() => applyAccountProfileUpdate({ id: "flavia", name: "Flávia", photo: null, border: "ceu-estrelado" }));
    expect(container.querySelector("[data-avatar-border='ceu-estrelado']")).toBeInTheDocument();

    act(() => applyAccountProfileUpdate({ id: "flavia", name: "Flávia", photo: null, border: null }));
    expect(container.querySelector("[data-avatar-border]")).toBeNull();
  });

  it("servidor fora do ar: o avatar continua funcionando, só sem moldura", async () => {
    vi.mocked(fetchAccounts).mockRejectedValue(new Error("offline"));
    const { container } = render(<AccountAvatar name="André" accountId="andre" size={40} />);
    await waitFor(() => expect(fetchAccounts).toHaveBeenCalled());
    await act(async () => {});
    expect(container.querySelector("[data-avatar-border]")).toBeNull();
    expect(container.firstElementChild).toHaveClass("ring-2");
    expect(getAccountProfilesSnapshot()).toEqual({});
  });
});
