import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import PersistentDuoStatus from "@/components/duo/PersistentDuoStatus";
import { fetchAccounts } from "@/lib/accountApi";
import { resetAccountProfilesStoreForTests } from "@/lib/accountProfilesStore";
import type { AccountsOverview } from "@/lib/accountTypes";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/sala/PERSISTENT_DUO",
  useRouter: () => ({ push }),
}));

const overview = {
  profiles: {},
  duoPerAccount: {
    andre: { duelWins: 128, duelLosses: 4, duelDraws: 0, gameWinCounts: { memory: 52 }, gameLossCounts: {}, gameGoals: {}, gameOutcomeCounts: {} },
    flavia: { duelWins: 61, duelLosses: 7, duelDraws: 0, gameWinCounts: { termo: 33 }, gameLossCounts: {}, gameGoals: {}, gameOutcomeCounts: {} },
  },
} as unknown as AccountsOverview;

vi.mock("@/lib/accountApi", () => ({
  fetchAccounts: vi.fn(),
  fetchAccountsOverview: vi.fn(() => Promise.resolve(overview)),
  updateAccountProfile: vi.fn(),
  resizeImageToDataUrl: vi.fn(),
  fetchBorderState: vi.fn(),
  purchaseBorder: vi.fn(),
}));

const profiles = [
  { id: "andre" as const, name: "Xibatudo", photo: "data:image/png;base64,AAAA", border: "ceu-estrelado" },
  { id: "flavia" as const, name: "Flávia", photo: null, border: null },
];

function renderHud(props: Partial<React.ComponentProps<typeof PersistentDuoStatus>> = {}) {
  return render(<PersistentDuoStatus selfId="andre" presence={{ andre: "lobby", flavia: "lobby" }} {...props} />);
}

describe("cards dos jogadores no topo do lobby persistente", () => {
  beforeEach(() => {
    window.localStorage.clear();
    push.mockReset();
    resetAccountProfilesStoreForTests();
    vi.mocked(fetchAccounts).mockReset().mockResolvedValue(profiles);
  });
  afterEach(cleanup);

  it("mostra o card do próprio jogador à esquerda e o do outro à direita", async () => {
    renderHud();
    const self = screen.getByTestId("lobby-card-andre");
    const partner = screen.getByTestId("lobby-card-flavia");
    expect(self).toHaveAttribute("data-side", "left");
    expect(partner).toHaveAttribute("data-side", "right");
    // a ordem no DOM acompanha a tela: esquerda primeiro
    expect(self.compareDocumentPosition(partner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await waitFor(() => expect(within(self).getByText("Xibatudo")).toBeInTheDocument());
    expect(within(partner).getByText("Flávia")).toBeInTheDocument();
  });

  it("quando quem olha é a flavia, o card dela fica à esquerda", async () => {
    renderHud({ selfId: "flavia" });
    expect(screen.getByTestId("lobby-card-flavia")).toHaveAttribute("data-side", "left");
    expect(screen.getByTestId("lobby-card-andre")).toHaveAttribute("data-side", "right");
    expect(screen.getByRole("button", { name: "Abrir meu perfil" })).toBe(screen.getByTestId("lobby-card-flavia"));
  });

  it("usa os nomes padrão enquanto os perfis não chegaram do servidor", () => {
    vi.mocked(fetchAccounts).mockReturnValue(new Promise(() => {}));
    renderHud();
    expect(within(screen.getByTestId("lobby-card-andre")).getByText("André")).toBeInTheDocument();
    expect(within(screen.getByTestId("lobby-card-flavia")).getByText("Flávia")).toBeInTheDocument();
  });

  it("mostra online/offline de cada um (lobby, mundo e minijogo contam como online)", () => {
    const { rerender } = renderHud({ presence: { andre: "lobby", flavia: "offline" } });
    expect(within(screen.getByTestId("lobby-card-andre")).getByText("Online")).toBeInTheDocument();
    expect(within(screen.getByTestId("lobby-card-flavia")).getByText("Offline")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-card-flavia")).toHaveAttribute("data-online", "false");

    rerender(<PersistentDuoStatus selfId="andre" presence={{ andre: "minigame", flavia: "world" }} />);
    expect(within(screen.getByTestId("lobby-card-andre")).getByText("Online")).toBeInTheDocument();
    expect(within(screen.getByTestId("lobby-card-flavia")).getByText("Online")).toBeInTheDocument();
  });

  it("a foto aparece maior e com a borda equipada; sem borda usa o anel padrão", async () => {
    const { container } = renderHud();
    const self = screen.getByTestId("lobby-card-andre");
    await waitFor(() => expect(self.querySelector("[data-avatar-border='ceu-estrelado']")).toBeInTheDocument());
    // antes era 32–42px; agora 72px (LOBBY_AVATAR_SIZE)
    expect(self.querySelector("[data-avatar-border]")).toHaveStyle({ width: "72px", height: "72px" });
    // flavia não tem borda: anel padrão, sem moldura
    const partner = screen.getByTestId("lobby-card-flavia");
    expect(partner.querySelector("[data-avatar-border]")).toBeNull();
    expect(partner.querySelector(".lobby-player-ring")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-avatar-border]").length).toBe(1);
  });

  it("clicar no próprio card abre o perfil completo (com abas e edição)", async () => {
    renderHud();
    fireEvent.click(screen.getByRole("button", { name: "Abrir meu perfil" }));
    expect(await screen.findByRole("button", { name: "Editar perfil" })).toBeInTheDocument();
    const tabs = screen.getByRole("navigation", { name: "Seções do perfil" });
    for (const label of ["Perfil", "Estatísticas", "Recordes", "Configurações"]) {
      expect(within(tabs).getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText("Trocar de conta")).toBeInTheDocument();
  });

  it("clicar no card do outro abre SÓ o perfil dele: sem abas, edição, trocar de conta, recordes ou estatísticas", async () => {
    renderHud();
    fireEvent.click(screen.getByRole("button", { name: "Ver perfil de Flávia" }));
    // o perfil dele (com as vitórias dele, não as do próprio jogador)
    await waitFor(() => expect(screen.getByTestId("profile-duel-wins-value")).toHaveTextContent("61"));
    expect(screen.getByRole("heading", { name: "Flávia" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Seções do perfil" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Estatísticas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recordes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Configurações" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar perfil" })).not.toBeInTheDocument();
    expect(screen.queryByText("Trocar de conta")).not.toBeInTheDocument();
  });

  it("o perfil do outro mostra a borda dele e fecha pelo botão Fechar", async () => {
    vi.mocked(fetchAccounts).mockResolvedValue([profiles[0], { ...profiles[1], border: "ciranda-coracoes" }]);
    renderHud();
    await waitFor(() => expect(screen.getByTestId("lobby-card-flavia").querySelector("[data-avatar-border]")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Ver perfil de Flávia" }));
    await screen.findByRole("heading", { name: "Flávia" });
    // card do topo + foto grande do perfil
    expect(document.querySelectorAll("[data-avatar-border='ciranda-coracoes']").length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Flávia" })).not.toBeInTheDocument());
  });

  it("só um perfil fica aberto por vez e dá para abrir o outro depois de fechar", async () => {
    renderHud();
    fireEvent.click(screen.getByRole("button", { name: "Abrir meu perfil" }));
    await screen.findByRole("button", { name: "Editar perfil" });
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Editar perfil" })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Ver perfil de Flávia" }));
    await screen.findByRole("heading", { name: "Flávia" });
    expect(screen.queryByRole("button", { name: "Editar perfil" })).not.toBeInTheDocument();
  });

  it("'Trocar de conta' no próprio perfil limpa a conta ativa e volta para a tela inicial", async () => {
    window.localStorage.setItem("couple-site:active-account", JSON.stringify({ type: "account", id: "andre" }));
    renderHud();
    fireEvent.click(screen.getByRole("button", { name: "Abrir meu perfil" }));
    fireEvent.click(await screen.findByText("Trocar de conta"));
    expect(push).toHaveBeenCalledWith("/");
    expect(window.localStorage.getItem("couple-site:active-account")).toBeNull();
    await act(async () => {});
  });
});
