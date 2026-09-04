import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import BoardRacePage from "../app/game/boardrace/[code]/page";
import BoardRaceChallengePanel from "../components/boardrace/BoardRaceChallengePanel";
import type { BoardRaceState } from "../lib/boardRaceTypes";
import type { RoomSnapshot } from "../lib/types";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const mockRoom = vi.fn();
const mockGame = vi.fn();
vi.mock("../hooks/useRoomSession", () => ({ useRoomSession: () => mockRoom() }));
vi.mock("../hooks/useBoardRaceGame", () => ({ useBoardRaceGame: () => mockGame() }));

const room: RoomSnapshot = {
  code: "ABCDE", roomMode: "duo", gameId: "boardrace", status: "playing",
  players: [
    { id: "self", name: "André", color: "#F2A6B8", connected: true },
    { id: "other", name: "Flávia", color: "#9FC3E8", connected: true },
  ],
  maxPlayers: 2, hostId: "self", pendingImageId: null, pendingImageWidth: null,
  pendingImageHeight: null, pendingDifficulty: "medium", pendingColorMode: "competitive",
  pendingSeerId: null, pendingMatchMode: "duel", sequence: [], sequenceProgress: [],
};

function state(phase: BoardRaceState["phase"] = "awaitingRoll"): BoardRaceState {
  const spaces = Array.from({ length: 31 }, (_, index) => ({
    index,
    type: index === 0 ? "start" as const : index === 30 ? "finish" as const : "normal" as const,
    label: index === 0 ? "Início" : index === 30 ? "Chegada" : "Normal",
  }));
  return {
    mode: "duel", boardVersion: 1, spaces, lastPosition: 30, playerOrder: ["self", "other"],
    currentPlayerId: "self", players: {
      self: { position: 4, skipNextTurn: false, powers: ["boost"], shieldActive: false, rollBonus: 0, pendingRollPenalty: 0, pendingQuiz: null },
      other: { position: 3, skipNextTurn: false, powers: [], shieldActive: false, rollBonus: 0, pendingRollPenalty: 0, pendingQuiz: null },
    },
    phase, phaseReadyAt: 0, dice: { value: null, total: null, rolledBy: null, serial: 0 },
    lastMove: null, pendingMinigame: null, winnerId: null, startedAt: Date.now(), finishedAt: null,
    turnNumber: 2, eventSerial: 0, eventLog: [],
  };
}

describe("Trilha da Sorte", () => {
  const roll = vi.fn();
  const answerQuiz = vi.fn();
  const usePower = vi.fn();
  const newGame = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockRoom.mockReturnValue({ room, selfId: "self", notFound: false, kicked: false, backToConfig: vi.fn(), backToGameSelect: vi.fn(), kickPlayer: vi.fn() });
    mockGame.mockReturnValue({ state: state(), roll, answerQuiz, usePower, minigameAction: vi.fn(), newGame });
  });

  it("renderiza o tabuleiro responsivo e envia apenas a intenção de rolar/usar poder", () => {
    render(<BoardRacePage params={{ code: "abcde" }} />);
    const board = screen.getByLabelText("Tabuleiro com 30 casas");
    expect(board).toBeVisible();
    expect(screen.getByLabelText("Área principal da partida")).toContainElement(board);
    expect(board.querySelectorAll("[title]")).toHaveLength(31);
    expect(screen.getByLabelText("Sua peça")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Jogar dado" }));
    expect(roll).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Impulso \+2/i }));
    expect(usePower).toHaveBeenCalledWith("boost");
  });

  it("bloqueia o dado para um Quiz pendente e oferece quatro alternativas", () => {
    const quizState = state("awaitingQuiz");
    quizState.players.self.pendingQuiz = {
      id: "medium-1", category: "História", difficulty: "medium", assignedAt: Date.now(),
      question: "Pergunta de teste?", options: ["Opção A", "Opção B", "Opção C", "Opção D"],
    };
    mockGame.mockReturnValue({ state: quizState, roll, answerQuiz, usePower, minigameAction: vi.fn(), newGame: vi.fn() });
    render(<BoardRacePage params={{ code: "abcde" }} />);
    expect(screen.queryByRole("button", { name: "Jogar dado" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Quiz da trilha" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Opção/ })).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: /Opção B/ }));
    expect(answerQuiz).toHaveBeenCalledWith(1);
  });

  it("mantém o Termo embutido jogável com teclado virtual", () => {
    const onAction = vi.fn();
    render(
      <BoardRaceChallengePanel
        selfId="self"
        players={room.players}
        onAction={onAction}
        challenge={{
          kind: "termo",
          title: "Termo · uma palavra",
          challengerId: "self",
          playerIds: ["self", "other"],
          startedAt: Date.now(),
          readyAt: Date.now() - 1,
          expiresAt: Date.now() + 60_000,
          botNextActionAt: null,
          state: {
            variant: "one", mode: "duel", maxAttempts: 6, expectedPlayers: ["self", "other"],
            progress: {
              self: { boards: [[]], attemptsUsed: 0, solvedIndices: [], finished: false, completed: false, finishedAt: null, timeUsedMs: null, invalidAttemptAt: null },
              other: { attemptsUsed: 0, solvedCount: 0, finished: false, completed: false, finishedAt: null, timeUsedMs: null },
            },
            startedAt: Date.now(), finished: false, finishedAt: null, results: [], revealedSolutions: null,
          },
        }}
      />
    );
    expect(screen.getByLabelText("Teclado virtual")).toBeInTheDocument();
    for (const letter of ["C", "A", "S", "A", "L"]) fireEvent.click(screen.getByRole("button", { name: letter }));
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));
    expect(onAction).toHaveBeenCalledWith({ type: "submitGuess", word: "CASAL" });
  });

  it("mostra uma contagem sincronizada antes de montar o jogo real", () => {
    render(
      <BoardRaceChallengePanel
        selfId="self"
        players={room.players}
        onAction={vi.fn()}
        challenge={{
          kind: "termo", title: "Termo · uma palavra", challengerId: "self", playerIds: ["self", "other"],
          startedAt: Date.now(), readyAt: Date.now() + 4_000, expiresAt: Date.now() + 60_000, botNextActionAt: null,
          state: {},
        }}
      />
    );
    expect(screen.getByTestId("minigame-countdown")).toBeVisible();
    expect(screen.getByText("Prepare-se!")).toBeVisible();
    expect(screen.queryByLabelText("Teclado virtual")).not.toBeInTheDocument();
  });

  it("exibe o poder recebido em um pop-up central com explicação", async () => {
    const first = state();
    const view = render(<BoardRacePage params={{ code: "abcde" }} />);
    const updated = state();
    updated.eventSerial = 1;
    updated.eventLog = [{ id: 1, message: "Tesouro encontrado: poder shield.", tone: "positive", kind: "powerGranted", playerId: "self", powerId: "shield" }];
    mockGame.mockReturnValue({ state: updated, roll, answerQuiz, usePower, minigameAction: vi.fn(), newGame });
    view.rerender(<BoardRacePage params={{ code: "abcde" }} />);
    expect(await screen.findByText("Você ganhou Escudo")).toBeVisible();
    expect(screen.getByText(/Cancela o próximo efeito negativo/)).toBeVisible();
    expect(first.eventSerial).toBe(0);
  });

  it("permite reabrir o resultado e reiniciar depois de ver o tabuleiro final", async () => {
    const finished = state("finished");
    finished.winnerId = "self";
    finished.finishedAt = Date.now();
    finished.phaseReadyAt = 0;
    mockGame.mockReturnValue({ state: finished, roll, answerQuiz, usePower, minigameAction: vi.fn(), newGame });
    render(<BoardRacePage params={{ code: "abcde" }} />);
    const viewBoard = await screen.findByRole("button", { name: "Ver tabuleiro" });
    fireEvent.click(viewBoard);
    await waitFor(() => expect(screen.getByRole("navigation", { name: "Opções após a partida" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Ver resultado" }));
    expect(await screen.findByText("Você venceu a corrida!")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(newGame).toHaveBeenCalledTimes(1);
  });
});
