import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import BoardRacePage from "../app/game/boardrace/[code]/page";
import BoardRaceChallengePanel, { BoardRaceSafePanel, BoardRaceWordPanel } from "../components/boardrace/BoardRaceChallengePanel";
import BoardRaceEventPopup from "../components/boardrace/BoardRaceEventPopup";
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
  pendingSeerId: null, pendingWhoAmICategory: "all", pendingMatchMode: "duel", sequence: [], sequenceProgress: [],
};

function state(phase: BoardRaceState["phase"] = "awaitingRoll"): BoardRaceState {
  const spaces = Array.from({ length: 31 }, (_, index) => ({
    index,
    type: index === 0 ? "start" as const : index === 30 ? "finish" as const : "normal" as const,
    label: index === 0 ? "Início" : index === 30 ? "Chegada" : "Normal",
  }));
  return {
    mode: "duel", boardVersion: 1, spaces, lastPosition: 30, playerOrder: ["self", "other"], pawnColors: { self: "pink", other: "blue" },
    currentPlayerId: "self", players: {
      self: { position: 4, pendingSpaceIndex: null, skipNextTurn: false, powers: ["boost"], shieldActive: false, rollBonus: 0, pendingRollPenalty: 0, pendingQuiz: null, pendingWordChallenge: null, pendingSafe: null },
      other: { position: 3, pendingSpaceIndex: null, skipNextTurn: false, powers: [], shieldActive: false, rollBonus: 0, pendingRollPenalty: 0, pendingQuiz: null, pendingWordChallenge: null, pendingSafe: null },
    },
    phase, phaseReadyAt: 0, dice: { value: null, total: null, rolledBy: null, serial: 0 },
    lastMove: null, pendingMinigame: null, winnerId: null, startedAt: Date.now(), finishedAt: null,
    turnNumber: 2, eventSerial: 0, eventLog: [],
  };
}

describe("Trilha da Sorte", () => {
  const roll = vi.fn();
  const answerQuiz = vi.fn();
  const answerWord = vi.fn();
  const giveUpWord = vi.fn();
  const chooseSafe = vi.fn();
  const usePower = vi.fn();
  const newGame = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockRoom.mockReturnValue({ room, selfId: "self", notFound: false, kicked: false, backToConfig: vi.fn(), backToGameSelect: vi.fn(), kickPlayer: vi.fn() });
    mockGame.mockReturnValue({ state: state(), roll, answerQuiz, answerWord, giveUpWord, chooseSafe, usePower, minigameAction: vi.fn(), newGame });
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

  it("exibe o poder recebido em um pop-up central e conciso", async () => {
    const initial = state();
    mockGame.mockReturnValue({ state: initial, roll, answerQuiz, usePower, minigameAction: vi.fn(), newGame });
    const view = render(<BoardRacePage params={{ code: "abcde" }} />);
    const updated = state();
    updated.startedAt = initial.startedAt;
    updated.eventSerial = 1;
    updated.eventLog = [{ id: 1, message: "Tesouro encontrado: poder shield.", tone: "positive", kind: "powerGranted", playerId: "self", powerId: "shield" }];
    mockGame.mockReturnValue({ state: updated, roll, answerQuiz, usePower, minigameAction: vi.fn(), newGame });
    view.rerender(<BoardRacePage params={{ code: "abcde" }} />);
    expect(await screen.findByText("Você recebeu Escudo")).toBeInTheDocument();
    expect(screen.queryByText(/Cancela o próximo efeito negativo/)).not.toBeInTheDocument();
    expect(initial.eventSerial).toBe(0);
  });

  it("enfileira avisos válidos na ordem em que chegam", async () => {
    const initial = state();
    mockGame.mockReturnValue({ state: initial, roll, answerQuiz, usePower, minigameAction: vi.fn(), newGame });
    const view = render(<BoardRacePage params={{ code: "abcde" }} />);
    const updated = state();
    updated.startedAt = initial.startedAt;
    updated.eventSerial = 2;
    updated.eventLog = [
      { id: 1, message: "Quiz correto", tone: "positive", kind: "quizCorrect", playerId: "self" },
      { id: 2, message: "Tesouro", tone: "positive", kind: "powerGranted", playerId: "self", powerId: "shield" },
    ];
    mockGame.mockReturnValue({ state: updated, roll, answerQuiz, usePower, minigameAction: vi.fn(), newGame });
    view.rerender(<BoardRacePage params={{ code: "abcde" }} />);
    expect(await screen.findByText("Você acertou o quiz")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Você recebeu Escudo")).toBeInTheDocument(), { timeout: 5_000 });
  });

  it("mantém os avisos de rodada curtos, sem descrições nem spinner decorativo", () => {
    const cases: Array<[BoardRaceState["eventLog"][number], string]> = [
      [{ id: 1, message: "normal", tone: "neutral", kind: "landNormal", playerId: "self" }, "Você caiu em uma casa normal"],
      [{ id: 2, message: "quiz", tone: "neutral", kind: "quizPending", playerId: "self" }, "Você recebeu um quiz"],
      [{ id: 3, message: "acertou", tone: "positive", kind: "quizCorrect", playerId: "other" }, "Flávia acertou o quiz"],
      [{ id: 4, message: "errou", tone: "negative", kind: "quizWrong", playerId: "other" }, "Flávia errou o quiz"],
      [{ id: 5, message: "minijogo", tone: "positive", kind: "minigameWin", playerId: "other" }, "Flávia venceu o minijogo"],
      [{ id: 6, message: "avanço", tone: "positive", kind: "advance", playerId: "self", amount: 2 }, "Você avançou 2 casas"],
      [{ id: 61, message: "avanço", tone: "positive", kind: "advance", playerId: "self", amount: 2, destinationSpaceType: "minigame" }, "Você avançou 2 casas e caiu em uma casa de Minijogo"],
      [{ id: 7, message: "recuo", tone: "negative", kind: "retreat", playerId: "self", amount: 1 }, "Você recuou 1 casa"],
      [{ id: 8, message: "prisão", tone: "negative", kind: "prison", playerId: "self" }, "Você ficou preso"],
      [{ id: 9, message: "poder", tone: "positive", kind: "powerGranted", playerId: "self", powerId: "shield" }, "Você recebeu Escudo"],
      [{ id: 10, message: "armadilha", tone: "negative", kind: "powerUsed", playerId: "other", targetPlayerId: "self", powerId: "snare" }, "Flávia lançou Armadilha em você"],
      [{ id: 11, message: "efeito", tone: "negative", kind: "surpriseNegative", playerId: "self", amount: 2 }, "Você recuou 2 casas"],
      [{ id: 12, message: "fim", tone: "positive", kind: "finish", playerId: "self" }, "Você venceu a corrida"],
    ];
    for (const [event, title] of cases) {
      const { unmount } = render(<BoardRaceEventPopup event={event} selfId="self" playerName={(id) => id === "other" ? "Flávia" : "Você"} />);
      const popup = screen.getByRole("status");
      expect(popup).toHaveTextContent(title);
      expect(popup.querySelectorAll("i")).toHaveLength(0);
      expect(popup.querySelectorAll("p")).toHaveLength(0);
      unmount();
    }
  });

  it("abre os desafios de palavra e o Cofre no mesmo overlay da trilha", () => {
    const onAnswer = vi.fn();
    const onChoose = vi.fn();
    const onGiveUp = vi.fn();
    const { rerender } = render(<BoardRaceWordPanel challenge={{ id: "anagram-1", kind: "anagram", prompt: "LOVACA", assignedAt: 0, attempts: 0 }} onAnswer={onAnswer} onGiveUp={onGiveUp} />);
    fireEvent.change(screen.getByLabelText("Sua resposta"), { target: { value: "cavalo" } });
    fireEvent.click(screen.getByRole("button", { name: "Responder" }));
    expect(onAnswer).toHaveBeenCalledWith("cavalo");
    rerender(<BoardRaceWordPanel challenge={{ id: "anagram-1", kind: "anagram", prompt: "LOVACA", assignedAt: 0, attempts: 1 }} onAnswer={onAnswer} onGiveUp={onGiveUp} />);
    expect(screen.getByRole("status")).toHaveTextContent("Ainda não foi dessa vez");
    fireEvent.click(screen.getByRole("button", { name: "Desistir" }));
    expect(onGiveUp).toHaveBeenCalledTimes(1);
    rerender(<BoardRaceSafePanel safe={{ id: "safe-1", assignedAt: 0, options: ["power", "advance", "empty", "penalty"] }} onChoose={onChoose} />);
    fireEvent.click(screen.getByRole("button", { name: /Abra esta gaveta/ }));
    expect(onChoose).toHaveBeenCalledWith(0);
  });

  it("mostra apenas os efeitos ativos no card do jogador", () => {
    const updated = state();
    updated.players.self.pendingSpaceIndex = 8;
    updated.players.self.skipNextTurn = true;
    updated.players.self.shieldActive = true;
    updated.players.self.pendingRollPenalty = 2;
    updated.players.self.rollBonus = 2;
    mockGame.mockReturnValue({ state: updated, roll, answerQuiz, usePower, minigameAction: vi.fn(), newGame });
    render(<BoardRacePage params={{ code: "abcde" }} />);
    expect(screen.getByText("Preso")).toBeVisible();
    expect(screen.getByText("Escudo")).toBeVisible();
    expect(screen.getByText("🪤 Armadilha")).toBeVisible();
    expect(screen.getByText("Impulso")).toBeVisible();
    expect(screen.getByText("Evento")).toBeVisible();
  });

  it("mantém o Quiz ou Minijogo fechado até o aviso da rodada terminar", async () => {
    const initial = state();
    mockGame.mockReturnValue({ state: initial, roll, answerQuiz, usePower, minigameAction: vi.fn(), newGame });
    const view = render(<BoardRacePage params={{ code: "abcde" }} />);
    const updated = state("minigame");
    updated.startedAt = initial.startedAt;
    updated.phaseReadyAt = Date.now() + 3_200;
    updated.lastMove = { serial: 1, playerId: "self", from: 4, to: 8, path: [5, 6, 7, 8], cause: "dice", effectEventId: 1, feedbackMs: 3_200 };
    updated.eventSerial = 1;
    updated.eventLog = [{ id: 1, message: "Desafio iniciado", tone: "neutral", kind: "minigameStart", playerId: "self" }];
    updated.pendingMinigame = {
      kind: "memory", title: "Memória", challengerId: "self", playerIds: ["self", "other"], state: {},
      startedAt: Date.now(), readyAt: Date.now() + 7_200, expiresAt: Date.now() + 60_000, botNextActionAt: null,
    };
    mockGame.mockReturnValue({ state: updated, roll, answerQuiz, usePower, minigameAction: vi.fn(), newGame });
    view.rerender(<BoardRacePage params={{ code: "abcde" }} />);
    expect(await screen.findByText("Você iniciou o minijogo")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Minijogo da trilha" })).not.toBeInTheDocument();
  });

  it("mantém as explicações das casas e poderes em um guia separado", () => {
    render(<BoardRacePage params={{ code: "abcde" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Guia da trilha" }));
    expect(screen.getByRole("dialog", { name: "Guia da Trilha da Sorte" })).toBeInTheDocument();
    expect(screen.getByText("Casas da trilha")).toBeInTheDocument();
    expect(screen.getByText("Superpoderes")).toBeInTheDocument();
    expect(screen.getByText(/O Escudo protege apenas do próximo efeito negativo/)).toBeInTheDocument();
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
    expect(await screen.findByText("Você venceu a corrida!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(newGame).toHaveBeenCalledTimes(1);
  });
});
