import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SoloGameConfigPage from "@/app/solo/[gameId]/page";
import SoloMatchModal from "@/components/SoloMatchModal";
import { setActiveAccount } from "@/lib/accountSession";
import { getSoloMatch, saveSoloState } from "@/lib/soloMatch";
import { GameId, RoomSnapshot } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  createRoom: vi.fn(),
  setConfig: vi.fn(),
  startGame: vi.fn(),
  socketEmit: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/hooks/useRoom", () => ({
  useRoom: () => ({
    error: null,
    loading: false,
    createRoom: mocks.createRoom,
    setConfig: mocks.setConfig,
    startGame: mocks.startGame,
  }),
}));
vi.mock("@/hooks/usePuzzleImages", () => ({ usePuzzleImages: () => ({ images: [], loading: false }) }));
vi.mock("@/lib/accountApi", () => ({
  fetchAccounts: () => Promise.resolve([{ id: "andre", name: "André", photo: null }]),
}));
vi.mock("@/lib/socket", () => ({ getSocket: () => ({ emit: mocks.socketEmit }) }));

function room(gameId: GameId, code: string): RoomSnapshot {
  return {
    code, roomMode: "solo", roomKind: "standard", persistentDuoPresence: null, persistentDuoLobby: null, gameId, status: "playing",
    players: [], maxPlayers: 1, hostId: "player-1", pendingImageId: null,
    pendingImageWidth: null, pendingImageHeight: null, pendingDifficulty: "medium",
    pendingColorMode: "competitive", pendingSeerId: null, pendingMatchMode: "together", pendingWhoAmICategory: "all",
    sequence: [], sequenceProgress: [],
  };
}

function saveWordSearch() {
  saveSoloState({
    ownerId: "andre",
    room: room("wordsearch", "SAVED"),
    playerId: "player-1",
    playerName: "André",
    state: { difficulty: "medium", finished: false, progress: { "player-1": { found: {} } } },
    savedAt: 1_000,
  });
  return getSoloMatch("andre")!;
}

async function openConflict(gameId: GameId) {
  render(<SoloGameConfigPage params={{ gameId }} />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Jogar!" }));
  return screen.findByRole("dialog");
}

describe("conflito de partida Solo", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setActiveAccount({ type: "account", id: "andre" });
    mocks.push.mockReset();
    mocks.createRoom.mockReset().mockResolvedValue({ ok: true, room: room("sudoku", "NEW01") });
    mocks.setConfig.mockReset();
    mocks.startGame.mockReset().mockResolvedValue({ ok: true });
    mocks.socketEmit.mockReset().mockImplementation((event: string, payload: { gameId?: GameId }, callback?: (response: unknown) => void) => {
      if (event === "solo:resume") callback?.({ ok: true, room: room(payload.gameId ?? "wordsearch", "RESTORED") });
    });
  });

  afterEach(cleanup);

  it.each([
    ["outro jogo", "sudoku" as const],
    ["o mesmo jogo", "wordsearch" as const],
  ])("oferece voltar para o save ao iniciar %s", async (_label, requestedGame) => {
    saveWordSearch();
    const dialog = await openConflict(requestedGame);

    expect(dialog).toHaveTextContent("Você já tem uma partida de Caça-Palavras em andamento.");
    expect(dialog).toHaveTextContent("Deseja voltar para ela ou iniciar este jogo?");
    expect(screen.queryByRole("button", { name: /Manter partida/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Voltar para partida" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/game/wordsearch/RESTORED"));
    expect(mocks.createRoom).not.toHaveBeenCalled();
    expect(getSoloMatch("andre")).toBeNull();
  });

  it.each([
    ["outro jogo", "sudoku" as const],
    ["o mesmo jogo", "wordsearch" as const],
  ])("abandona o save antes de iniciar %s", async (_label, requestedGame) => {
    saveWordSearch();
    mocks.createRoom.mockImplementation(async (_mode: string, _name: string, gameId: GameId) => {
      expect(getSoloMatch("andre")).toBeNull();
      return { ok: true, room: room(gameId, "NEW01") };
    });

    await openConflict(requestedGame);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar este jogo" }));

    await waitFor(() => expect(mocks.createRoom).toHaveBeenCalledWith("solo", expect.any(String), requestedGame));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(`/game/${requestedGame}/NEW01`));
    expect(getSoloMatch("andre")).toBeNull();
  });

  it("mantém o modal de retorno ao app com Continuar e Cancelar partida", () => {
    const save = saveWordSearch();
    render(<SoloMatchModal save={save} onContinue={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole("heading")).toHaveTextContent("Você tem uma partida de Caça-Palavras Solo em andamento.");
    expect(screen.getByText("Deseja continuar de onde parou?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar partida" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar este jogo" })).not.toBeInTheDocument();
  });
});
