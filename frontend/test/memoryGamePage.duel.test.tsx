import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MemoryGamePage from "../app/game/memory/[code]/page";
import type { MemoryState } from "../lib/memoryTypes";
import type { RoomSnapshot } from "../lib/types";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const mockRoom = vi.fn();
const mockMemoryGame = vi.fn();
vi.mock("../hooks/useRoomSession", () => ({ useRoomSession: () => mockRoom() }));
vi.mock("../hooks/useMemoryGame", () => ({ useMemoryGame: () => mockMemoryGame() }));

const room: RoomSnapshot = {
  code: "ABCDE",
  roomMode: "duo",
  gameId: "memory",
  status: "playing",
  players: [
    { id: "self", name: "André", color: "#F2A6B8", connected: true },
    { id: "other", name: "Flávia", color: "#9FC3E8", connected: true },
  ],
  maxPlayers: 2,
  hostId: "self",
  pendingImageId: null,
  pendingImageWidth: null,
  pendingImageHeight: null,
  pendingDifficulty: "easy",
  pendingColorMode: "competitive",
  pendingSeerId: null,
  pendingMatchMode: "duel",
  sequence: [],
  sequenceProgress: [],
};

function state(): MemoryState {
  return {
    difficulty: "easy",
    mode: "duel",
    rows: 3,
    cols: 3,
    pairCount: 4,
    slots: [{ id: "slot-0", imageSrc: "/images/memory/bee.png", empty: false }],
    expectedPlayers: ["self", "other"],
    progress: {
      self: { matchedSlotIds: ["slot-0"], openSlotIds: [], score: 400, combo: 4, pairsFound: 4, mistakes: 0, mismatchUntil: null, finished: true, completed: true, finishedAt: 2_000, timeUsedMs: 30_000 },
      other: { matchedSlotIds: [], openSlotIds: [], score: 100, combo: 0, pairsFound: 1, mistakes: 2, mismatchUntil: null, finished: false, completed: false, finishedAt: null, timeUsedMs: null },
    },
    startedAt: 0,
    previewEndsAt: 1,
    playStartedAt: 1,
    deadlineAt: Date.now() + 30_000,
    finished: false,
    finishedAt: null,
    results: [],
  };
}

describe("MemoryGamePage - duelo", () => {
  beforeEach(() => {
    cleanup();
    mockRoom.mockReturnValue({ room, selfId: "self", notFound: false, kicked: false, backToConfig: vi.fn(), backToGameSelect: vi.fn(), kickPlayer: vi.fn() });
    mockMemoryGame.mockReturnValue({ state: state(), flipCard: vi.fn(), newGame: vi.fn() });
  });

  it("mantém o jogador que terminou aguardando sem encerrar a partida do adversário", () => {
    render(<MemoryGamePage params={{ code: "abcde" }} />);
    expect(screen.getByText(/Seu tabuleiro está completo/i)).toBeInTheDocument();
    expect(screen.getByText(/Seu par continua jogando/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Carta revelada/i })).toBeDisabled();
  });

  it("mostra o combo próprio e o placar resumido dos dois jogadores", () => {
    render(<MemoryGamePage params={{ code: "abcde" }} />);
    expect(screen.getByText("🔥 Combo x4")).toBeInTheDocument();
    expect(screen.getAllByText("André").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Flávia").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("4/4 pares")).toBeInTheDocument();
    expect(screen.getByText("1/4 pares")).toBeInTheDocument();
  });
});
