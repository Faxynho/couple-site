import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import ColorsGamePage from "../app/game/colors/[code]/page";
import type { ColorMemoryState } from "../lib/colorTypes";
import type { RoomSnapshot } from "../lib/types";

/**
 * Regressão: depois de concluir as 5 rodadas e clicar em "Jogar de novo", a
 * tela ficava travada (o AnimatePresence com mode="wait" nunca completava a
 * animação de saída da tela de "Partida concluída", então a nova rodada
 * nunca era montada). Este teste garante que a tela de memorização volta a
 * aparecer normalmente após reiniciar a partida.
 */

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const mockRoom = vi.fn();
const mockColorGame = vi.fn();

vi.mock("../hooks/useGameRoom", () => ({
  useGameRoom: () => mockRoom(),
}));

vi.mock("../hooks/useColorGame", () => ({
  useColorGame: () => mockColorGame(),
}));

function makeTarget(seed: number) {
  return { h: seed * 10, s: 60, v: 60, hex: "#abcdef" };
}

function freshState(gameNum: number): ColorMemoryState {
  return {
    difficulty: "easy",
    mode: "competitive",
    seerId: null,
    guesserId: null,
    totalRounds: 5,
    currentRound: 0,
    rounds: Array.from({ length: 5 }, (_, i) => ({ target: makeTarget(gameNum * 10 + i), guesses: {} })),
    finished: false,
    startedAt: Date.now(),
    finishedAt: null,
  };
}

const room: RoomSnapshot = {
  code: "ABCDE",
  gameId: "colors",
  status: "playing",
  players: [{ id: "self", name: "Andre", color: "#E893AA", connected: true }],
  maxPlayers: 2,
  hostId: "self",
  pendingImageId: null,
  pendingImageWidth: null,
  pendingImageHeight: null,
  pendingDifficulty: "easy",
  pendingColorMode: "competitive",
  pendingSeerId: null,
  pendingMatchMode: "together",
};

describe("ColorsGamePage - fluxo de jogar de novo", () => {
  let state: ColorMemoryState;
  const submitGuess = vi.fn();
  const nextRound = vi.fn();
  const newGame = vi.fn();

  beforeEach(() => {
    cleanup();
    state = freshState(0);
    mockRoom.mockReturnValue({ room, selfId: "self", notFound: false });
    mockColorGame.mockImplementation(() => ({ state, submitGuess, nextRound, newGame }));
  });

  function setServerState(next: ColorMemoryState) {
    state = next;
  }

  it("volta a mostrar a tela de memorização depois de clicar em Jogar de novo", async () => {
    const { rerender } = render(<ColorsGamePage params={{ code: "abcde" }} />);
    const renderAgain = () => rerender(<ColorsGamePage params={{ code: "abcde" }} />);

    // Rodada 0 da primeira partida: tela de memorização visível.
    expect(screen.getByText(/Memorizem essa cor/i)).toBeInTheDocument();

    // Simula a partida já concluída (como se as 5 rodadas tivessem acabado de ser jogadas).
    const finishedState: ColorMemoryState = {
      ...freshState(0),
      currentRound: 4,
      finished: true,
      finishedAt: Date.now(),
      rounds: freshState(0).rounds.map((r) => ({
        ...r,
        guesses: { self: { h: 1, s: 1, v: 1, hex: "#111111", score: 5, submittedAt: Date.now() } },
      })),
    };
    await act(async () => {
      setServerState(finishedState);
      renderAgain();
    });

    expect(screen.getByText(/Partida concluída/i)).toBeInTheDocument();

    // Clica em "Jogar de novo" dentro do placar final.
    const newGameBtn = screen.getByRole("button", { name: /Jogar de novo/i });
    await act(async () => {
      fireEvent.click(newGameBtn);
    });
    expect(newGame).toHaveBeenCalled();

    // Simula o servidor respondendo com uma partida nova (rodada 0, não finalizada).
    await act(async () => {
      setServerState(freshState(1));
      renderAgain();
    });

    // Dá tempo para qualquer efeito pendente (reset de fase local) ser processado.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    renderAgain();

    // O ponto central da correção: o conteúdo da nova rodada precisa aparecer
    // (antes do fix, a tela ficava presa em "Partida concluída" para sempre).
    const memorizeHeading = screen.queryByText(/Memorizem essa cor/i);
    const pickerHeading = screen.queryByText(/Recriem de mem[oó]ria/i);
    expect(memorizeHeading || pickerHeading).toBeTruthy();
  });
});
