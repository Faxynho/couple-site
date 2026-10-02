import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProfileTab from "@/components/account/ProfileTab";
import { fetchAccounts, fetchBorderState, purchaseBorder, updateAccountProfile } from "@/lib/accountApi";
import { getAccountProfilesSnapshot, resetAccountProfilesStoreForTests } from "@/lib/accountProfilesStore";
import type { AccountsOverview, ProfileBorderState, PublicAccountProfile } from "@/lib/accountTypes";

vi.mock("@/lib/accountApi", () => ({
  fetchAccounts: vi.fn(),
  fetchBorderState: vi.fn(),
  purchaseBorder: vi.fn(),
  updateAccountProfile: vi.fn(),
  resizeImageToDataUrl: vi.fn(),
}));

const PRICES = { "laco-rosa": 150, "ciranda-coracoes": 400, "ceu-estrelado": 900, "asas-de-anjo": 1600, "coroa-real": 2800 };

const overview = {
  duoPerAccount: {
    andre: { duelWins: 128, duelLosses: 4, duelDraws: 0, gameWinCounts: { memory: 52, quiz: 3 }, gameLossCounts: {}, gameGoals: {}, gameOutcomeCounts: {} },
    flavia: { duelWins: 0, duelLosses: 0, duelDraws: 0, gameWinCounts: {}, gameLossCounts: {}, gameGoals: {}, gameOutcomeCounts: {} },
  },
} as unknown as AccountsOverview;

const profile: PublicAccountProfile = { id: "andre", name: "Xibatudo", photo: null, border: null };

function state(overrides: Partial<ProfileBorderState> = {}): ProfileBorderState {
  return { equipped: null, owned: ["laco-rosa"], prices: PRICES, globalCoins: 1000, ...overrides };
}

async function openEditor(props: Partial<React.ComponentProps<typeof ProfileTab>> = {}) {
  const view = render(<ProfileTab accountId="andre" profile={profile} overview={overview} onProfileUpdated={vi.fn()} {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Editar perfil" }));
  await screen.findByRole("button", { name: "Sem borda" });
  return view;
}

describe("ProfileTab — visualização", () => {
  beforeEach(() => {
    resetAccountProfilesStoreForTests();
    vi.mocked(fetchAccounts).mockReset().mockResolvedValue([]);
    vi.mocked(fetchBorderState).mockReset().mockResolvedValue(state());
    vi.mocked(purchaseBorder).mockReset();
    vi.mocked(updateAccountProfile).mockReset();
  });
  afterEach(cleanup);

  it("mostra nome, título de duelo e VITÓRIAS EM DUELO (no lugar de partidas jogadas)", () => {
    render(<ProfileTab accountId="andre" profile={profile} overview={overview} />);
    expect(screen.getByRole("heading", { name: "Xibatudo" })).toBeInTheDocument();
    expect(screen.getByText("Rei do Jogo da Memória")).toBeInTheDocument();
    expect(screen.getByText("Vitórias em duelo")).toBeInTheDocument();
    expect(screen.getByTestId("profile-duel-wins-value")).toHaveTextContent("128");
    expect(screen.queryByText(/Partidas jogadas/i)).not.toBeInTheDocument();
  });

  it("mostra '—' nas vitórias enquanto as estatísticas não carregaram e o aviso de sem título", () => {
    render(<ProfileTab accountId="andre" profile={profile} overview={null} />);
    expect(screen.getByTestId("profile-duel-wins-value")).toHaveTextContent("—");
    expect(screen.getByText("Título ainda não conquistado")).toBeInTheDocument();
  });

  it("usa 'Rainha' para a conta flavia e zero vitórias aparece como 0", () => {
    const withTitle = {
      duoPerAccount: { ...overview.duoPerAccount, flavia: { ...overview.duoPerAccount.flavia, gameWinCounts: { termo: 5 } } },
    } as unknown as AccountsOverview;
    render(<ProfileTab accountId="flavia" profile={{ id: "flavia", name: "Flávia", photo: null }} overview={withTitle} />);
    expect(screen.getByText("Rainha do Termo")).toBeInTheDocument();
    expect(screen.getByTestId("profile-duel-wins-value")).toHaveTextContent("0");
  });

  it("já mostra o selo de nível e a barra de XP (valores de placeholder até existir o sistema)", () => {
    render(<ProfileTab accountId="andre" profile={profile} overview={overview} />);
    expect(screen.getByTestId("profile-level")).toBeInTheDocument();
    expect(screen.getByTestId("profile-level-number")).toHaveTextContent("1");
    expect(screen.getByTestId("profile-xp-text")).toHaveTextContent("0 / 100 XP");
    const bar = screen.getByRole("progressbar", { name: "Progresso de experiência" });
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });

  it("a foto mostra a borda equipada do perfil", () => {
    const { container } = render(<ProfileTab accountId="andre" profile={{ ...profile, border: "ceu-estrelado" }} overview={overview} />);
    expect(container.querySelector("[data-avatar-border='ceu-estrelado']")).toBeInTheDocument();
  });

  it("sem borda usa o anel padrão e nenhuma moldura", () => {
    const { container } = render(<ProfileTab accountId="andre" profile={profile} overview={overview} />);
    expect(container.querySelector("[data-avatar-border]")).toBeNull();
    expect(container.querySelector(".profile-avatar-ring")).toBeInTheDocument();
  });

  it("no modo leitura (perfil do par) some o lápis e o 'Trocar de conta', mas a borda continua visível", () => {
    const { container } = render(
      <ProfileTab accountId="flavia" profile={{ id: "flavia", name: "Flávia", photo: null, border: "laco-rosa" }} overview={overview} readOnly onSwitchAccount={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "Editar perfil" })).not.toBeInTheDocument();
    expect(screen.queryByText("Trocar de conta")).not.toBeInTheDocument();
    expect(container.querySelector("[data-avatar-border='laco-rosa']")).toBeInTheDocument();
  });

  it("oferece 'Trocar de conta' para o dono do perfil", () => {
    const onSwitch = vi.fn();
    render(<ProfileTab accountId="andre" profile={profile} overview={overview} onSwitchAccount={onSwitch} />);
    fireEvent.click(screen.getByText("Trocar de conta"));
    expect(onSwitch).toHaveBeenCalledTimes(1);
  });
});

describe("ProfileTab — edição e loja de bordas", () => {
  beforeEach(() => {
    resetAccountProfilesStoreForTests();
    vi.mocked(fetchAccounts).mockReset().mockResolvedValue([]);
    vi.mocked(fetchBorderState).mockReset().mockResolvedValue(state());
    vi.mocked(purchaseBorder).mockReset();
    vi.mocked(updateAccountProfile).mockReset();
  });
  afterEach(cleanup);

  it("abrir o lápis mostra nome, foto, saldo e todas as bordas com estado correto", async () => {
    await openEditor();
    expect(screen.getByLabelText("Nome exibido")).toHaveValue("Xibatudo");
    expect(screen.getByRole("button", { name: "Trocar foto" })).toBeInTheDocument();
    expect(screen.getByLabelText("Moedas globais: 1.000")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Sem borda" })).toHaveAttribute("aria-pressed", "true");
    // já possuída: selecionável
    expect(screen.getByRole("button", { name: "Borda Laço Rosa" })).toHaveAttribute("aria-pressed", "false");
    // bloqueadas: com preço e botão de compra coerente com o saldo
    expect(screen.getByRole("button", { name: "Desbloquear Ciranda de Corações por 400 moedas" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Desbloquear Céu Estrelado por 900 moedas" })).toBeEnabled();
    // sem saldo: o botão só fica desabilitado, sem dizer quantas moedas faltam
    const broke = screen.getByRole("button", { name: "Desbloquear Asas de Anjo por 1.600 moedas" });
    expect(broke).toBeDisabled();
    expect(broke).toHaveTextContent("Desbloquear");
    expect(screen.getByRole("button", { name: "Desbloquear Coroa Real por 2.800 moedas" })).toBeDisabled();
    expect(screen.queryByText(/faltam/i)).not.toBeInTheDocument();
    expect(fetchBorderState).toHaveBeenCalledWith("andre");
  });

  it("escolher uma borda já desbloqueada pré-visualiza na foto e só salva ao confirmar", async () => {
    const onProfileUpdated = vi.fn();
    vi.mocked(updateAccountProfile).mockResolvedValue({ id: "andre", name: "Xibatudo", photo: null, border: "laco-rosa", updatedAt: 1 });
    const { container } = await openEditor({ onProfileUpdated });

    fireEvent.click(screen.getByRole("button", { name: "Borda Laço Rosa" }));
    expect(screen.getByRole("button", { name: "Borda Laço Rosa" })).toHaveAttribute("aria-pressed", "true");
    expect(updateAccountProfile).not.toHaveBeenCalled();
    // prévia na foto grande do perfil (além do tile da loja)
    expect(container.querySelectorAll("[data-avatar-border='laco-rosa']").length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(updateAccountProfile).toHaveBeenCalledTimes(1));
    expect(updateAccountProfile).toHaveBeenCalledWith("andre", { name: "Xibatudo", photo: null, border: "laco-rosa" });
    await waitFor(() => expect(onProfileUpdated).toHaveBeenCalledWith({ id: "andre", name: "Xibatudo", photo: null, border: "laco-rosa" }));
    // o cache compartilhado já reflete: a borda aparece em todo o site sem recarregar
    expect(getAccountProfilesSnapshot().andre?.border).toBe("laco-rosa");
    await screen.findByText("Perfil atualizado!");
  });

  it("'Sem borda' remove a moldura (border: null) quando havia uma equipada", async () => {
    vi.mocked(fetchBorderState).mockResolvedValue(state({ equipped: "laco-rosa" }));
    vi.mocked(updateAccountProfile).mockResolvedValue({ id: "andre", name: "Xibatudo", photo: null, border: null, updatedAt: 1 });
    await openEditor({ profile: { ...profile, border: "laco-rosa" } });
    expect(screen.getByRole("button", { name: "Borda Laço Rosa" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Sem borda" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(updateAccountProfile).toHaveBeenCalledWith("andre", { name: "Xibatudo", photo: null, border: null }));
    expect(getAccountProfilesSnapshot().andre?.border).toBeNull();
  });

  it("salvar só o nome NÃO envia o campo border", async () => {
    vi.mocked(updateAccountProfile).mockResolvedValue({ id: "andre", name: "Novo Nome", photo: null, border: null, updatedAt: 1 });
    await openEditor();
    fireEvent.change(screen.getByLabelText("Nome exibido"), { target: { value: "Novo Nome" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(updateAccountProfile).toHaveBeenCalledWith("andre", { name: "Novo Nome", photo: null }));
  });

  it("'Salvar' fica desabilitado enquanto nada mudou", async () => {
    await openEditor();
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Borda Laço Rosa" }));
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Sem borda" }));
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled();
  });

  it("comprar é com UM toque (sem confirmação), desconta o saldo, seleciona a borda e ainda NÃO salva o perfil", async () => {
    vi.mocked(purchaseBorder).mockResolvedValue({ ...state({ owned: ["laco-rosa", "ceu-estrelado"], globalCoins: 100 }), alreadyOwned: false });
    await openEditor();

    fireEvent.click(screen.getByRole("button", { name: "Desbloquear Céu Estrelado por 900 moedas" }));
    await waitFor(() => expect(purchaseBorder).toHaveBeenCalledWith("andre", "ceu-estrelado"));
    expect(purchaseBorder).toHaveBeenCalledTimes(1);
    // nenhuma etapa de confirmação apareceu
    expect(screen.queryByRole("button", { name: /Confirmar compra/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cancelar compra/ })).not.toBeInTheDocument();

    await screen.findByLabelText("Moedas globais: 100");
    expect(screen.getByRole("button", { name: "Borda Céu Estrelado" })).toHaveAttribute("aria-pressed", "true");
    expect(updateAccountProfile).not.toHaveBeenCalled();
    // com o saldo novo, as outras ficam fora do alcance (desabilitadas, sem texto de "faltam")
    expect(screen.getByRole("button", { name: "Desbloquear Ciranda de Corações por 400 moedas" })).toBeDisabled();
    expect(screen.queryByText(/faltam/i)).not.toBeInTheDocument();
  });

  it("clicar de novo enquanto a compra está em andamento não cobra duas vezes", async () => {
    let finish: (value: ProfileBorderState & { alreadyOwned: boolean }) => void = () => {};
    vi.mocked(purchaseBorder).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    await openEditor();
    const buy = screen.getByRole("button", { name: "Desbloquear Ciranda de Corações por 400 moedas" });
    fireEvent.click(buy);
    fireEvent.click(buy);
    fireEvent.click(screen.getByRole("button", { name: "Desbloquear Céu Estrelado por 900 moedas" }));
    expect(purchaseBorder).toHaveBeenCalledTimes(1);
    await act(async () => finish({ ...state({ owned: ["laco-rosa", "ciranda-coracoes"], globalCoins: 600 }), alreadyOwned: false }));
    await screen.findByLabelText("Moedas globais: 600");
  });

  it("o saldo e os preços usam o sprite da moeda global (não um ícone genérico)", async () => {
    const { container } = await openEditor();
    const shop = container.querySelector("section[aria-label='Bordas do perfil']")!;
    const sprites = shop.querySelectorAll("img[src='/idle/icons/global-coin.webp']");
    // 1 no saldo + 1 em cada borda ainda bloqueada (Ciranda, Céu, Asas, Coroa)
    expect(sprites.length).toBe(5);
    sprites.forEach((sprite) => expect(sprite).toHaveAttribute("aria-hidden", "true"));
  });

  it("falha na compra mostra o motivo e corrige o saldo com o valor do servidor", async () => {
    const error = Object.assign(new Error("Moedas globais insuficientes."), { state: { globalCoins: 120 } });
    vi.mocked(purchaseBorder).mockRejectedValue(error);
    await openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Desbloquear Ciranda de Corações por 400 moedas" }));
    await screen.findByText("Moedas globais insuficientes.");
    expect(screen.getByLabelText("Moedas globais: 120")).toBeInTheDocument();
    // não ficou nada selecionado nem comprado
    expect(screen.getByRole("button", { name: "Sem borda" })).toHaveAttribute("aria-pressed", "true");
  });

  it("cancelar a edição descarta a borda escolhida e volta ao perfil", async () => {
    const { container } = await openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Borda Laço Rosa" }));
    fireEvent.click(screen.getByRole("button", { name: /Cancelar$/ }));
    expect(updateAccountProfile).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Xibatudo" })).toBeInTheDocument();
    expect(container.querySelector("[data-avatar-border]")).toBeNull();
  });

  it("erro do servidor ao salvar aparece na tela e mantém a edição aberta", async () => {
    vi.mocked(updateAccountProfile).mockRejectedValue(new Error("Você ainda não desbloqueou essa borda."));
    await openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Borda Laço Rosa" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Você ainda não desbloqueou essa borda.");
    expect(screen.getByLabelText("Nome exibido")).toBeInTheDocument();
  });

  it("falha ao carregar a loja oferece 'Tentar de novo'", async () => {
    vi.mocked(fetchBorderState).mockRejectedValueOnce(new Error("offline"));
    render(<ProfileTab accountId="andre" profile={profile} overview={overview} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar perfil" }));
    await screen.findByText("Não foi possível carregar as bordas agora.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await screen.findByRole("button", { name: "Sem borda" });
    expect(fetchBorderState).toHaveBeenCalledTimes(2);
  });

  it("borda que o servidor não vende (sem preço) não aparece na loja", async () => {
    const { "coroa-real": _removed, ...pricesWithoutCrown } = PRICES;
    void _removed;
    vi.mocked(fetchBorderState).mockResolvedValue(state({ prices: pricesWithoutCrown }));
    await openEditor();
    expect(screen.queryByText("Coroa Real")).not.toBeInTheDocument();
    expect(screen.getByText("Asas de Anjo")).toBeInTheDocument();
  });

  it("o saldo exibido usa separador de milhar e as bordas possuídas não mostram preço", async () => {
    vi.mocked(fetchBorderState).mockResolvedValue(state({ globalCoins: 12345, owned: ["laco-rosa", "coroa-real"] }));
    await openEditor();
    expect(screen.getByLabelText("Moedas globais: 12.345")).toBeInTheDocument();
    const crown = screen.getByRole("button", { name: "Borda Coroa Real" });
    expect(within(crown).queryByText("2.800")).not.toBeInTheDocument();
    expect(crown).toHaveTextContent("Desbloqueada");
  });

  it("o perfil volta ao normal depois de salvar", async () => {
    vi.mocked(updateAccountProfile).mockResolvedValue({ id: "andre", name: "Xibatudo", photo: null, border: "laco-rosa", updatedAt: 1 });
    await openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Borda Laço Rosa" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    });
    await screen.findByRole("heading", { name: "Xibatudo" });
    expect(screen.queryByLabelText("Nome exibido")).not.toBeInTheDocument();
  });
});
