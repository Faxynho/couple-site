import { describe, expect, it } from "vitest";
import {
  getPersistentDuoAvailabilityMessage,
  normalizePersistentDuoDisplayName,
  PERSISTENT_DUO_DISPLAY_NAME_MAX_LENGTH,
  PERSISTENT_DUO_ROOM_CODE,
} from "@/lib/persistentDuo";

describe("lobby Duo persistente", () => {
  it("usa um identificador interno estável", () => {
    expect(PERSISTENT_DUO_ROOM_CODE).toBe("PERSISTENT_DUO");
  });

  it("normaliza o nome visual e limita seu tamanho", () => {
    const displayName = normalizePersistentDuoDisplayName(`  Nosso   ${"Cantinho ".repeat(12)}  `);
    expect(displayName).toHaveLength(PERSISTENT_DUO_DISPLAY_NAME_MAX_LENGTH);
    expect(displayName).toMatch(/^Nosso Cantinho/);
    expect(normalizePersistentDuoDisplayName("   ")).toBe("");
  });

  it("libera minijogos somente com André e Flávia no lobby", () => {
    expect(getPersistentDuoAvailabilityMessage({ andre: "lobby", flavia: "lobby" }, "andre")).toBeNull();
    expect(getPersistentDuoAvailabilityMessage({ andre: "lobby", flavia: "offline" }, "andre")).toBe("Aguardando Flávia entrar.");
    expect(getPersistentDuoAvailabilityMessage({ andre: "offline", flavia: "lobby" }, "flavia")).toBe("Aguardando André entrar.");
  });

  it("explica quando o par está no mundo ou em outro minijogo", () => {
    expect(getPersistentDuoAvailabilityMessage({ andre: "lobby", flavia: "world" }, "andre")).toContain("Flávia está no Nosso Mundo");
    expect(getPersistentDuoAvailabilityMessage({ andre: "minigame", flavia: "lobby" }, "flavia")).toContain("André está em um minijogo");
  });
});
