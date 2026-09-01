import { beforeEach, describe, expect, it } from "vitest";
import { setActiveAccount } from "@/lib/accountSession";
import {
  clearSoloMatch,
  getActiveProfileSoloMatch,
  getSoloMatch,
  saveSoloState,
  SOLO_MATCH_STORAGE_KEY,
} from "@/lib/soloMatch";
import { RoomSnapshot } from "@/lib/types";

function room(status: RoomSnapshot["status"] = "playing"): RoomSnapshot {
  return {
    code: "SOLO1", roomMode: "solo", gameId: "sudoku", status,
    players: [], maxPlayers: 1, hostId: "player-1", pendingImageId: null,
    pendingImageWidth: null, pendingImageHeight: null, pendingDifficulty: "medium",
    pendingColorMode: "competitive", pendingSeerId: null, pendingMatchMode: "together",
    sequence: [], sequenceProgress: [],
  };
}

function roomWithCode(code: string, status: RoomSnapshot["status"] = "playing"): RoomSnapshot {
  return { ...room(status), code };
}

function persist(ownerId: "andre" | "flavia", status: RoomSnapshot["status"] = "playing") {
  return saveSoloState({
    ownerId,
    room: room(status),
    playerId: "player-1",
    playerName: ownerId,
    state: { difficulty: "medium", finished: status === "finished", progress: {} },
    savedAt: 1_000,
  });
}

describe("soloMatch", () => {
  beforeEach(() => window.localStorage.clear());

  it("mantém no máximo um save separado para cada ID estável de perfil", () => {
    setActiveAccount({ type: "account", id: "andre" });
    persist("andre");
    expect(getActiveProfileSoloMatch()?.ownerId).toBe("andre");

    setActiveAccount({ type: "account", id: "flavia" });
    expect(getActiveProfileSoloMatch()).toBeNull();
    persist("flavia");

    expect(getSoloMatch("andre")?.ownerId).toBe("andre");
    expect(getSoloMatch("flavia")?.ownerId).toBe("flavia");
    expect(Object.keys(JSON.parse(window.localStorage.getItem(SOLO_MATCH_STORAGE_KEY)!).profiles)).toHaveLength(2);
  });

  it("não salva uma partida sob o perfil diferente do selecionado", () => {
    setActiveAccount({ type: "account", id: "flavia" });
    expect(persist("andre")).toBeNull();
    expect(getSoloMatch("andre")).toBeNull();
  });

  it("remove somente o save cancelado", () => {
    setActiveAccount({ type: "account", id: "andre" });
    persist("andre");
    setActiveAccount({ type: "account", id: "flavia" });
    persist("flavia");

    clearSoloMatch("andre");
    expect(getSoloMatch("andre")).toBeNull();
    expect(getSoloMatch("flavia")).not.toBeNull();
  });

  it("apaga automaticamente o save quando a partida termina", () => {
    setActiveAccount({ type: "account", id: "andre" });
    persist("andre");
    setActiveAccount({ type: "account", id: "flavia" });
    persist("andre", "finished");
    expect(getSoloMatch("andre")).toBeNull();
  });

  it("ignora eventos atrasados de outra sala sem sobrescrever nem apagar a partida atual", () => {
    setActiveAccount({ type: "account", id: "andre" });
    persist("andre");
    const stalePayload = {
      ownerId: "andre" as const,
      room: roomWithCode("OLD99"), playerId: "player-1", playerName: "andre",
      state: { finished: false }, savedAt: 2_000,
    };
    expect(saveSoloState(stalePayload)).toBeNull();
    expect(getSoloMatch("andre")?.roomCode).toBe("SOLO1");

    saveSoloState({ ...stalePayload, room: roomWithCode("OLD99", "finished"), state: { finished: true } });
    expect(getSoloMatch("andre")?.roomCode).toBe("SOLO1");
  });
});
