import { describe, expect, it } from "vitest";
import { isPersistentDuoPath } from "@/lib/persistentDuo";

describe("isPersistentDuoPath", () => {
  it("reconhece a URL do lobby persistente (com ou sem barra final e em qualquer caixa)", () => {
    expect(isPersistentDuoPath("/sala/PERSISTENT_DUO")).toBe(true);
    expect(isPersistentDuoPath("/sala/PERSISTENT_DUO/")).toBe(true);
    expect(isPersistentDuoPath("/sala/persistent_duo")).toBe(true);
  });

  it("não confunde com salas comuns, jogos nem outras páginas", () => {
    expect(isPersistentDuoPath("/sala/ABCDE")).toBe(false);
    expect(isPersistentDuoPath("/sala/PERSISTENT_DUO_2")).toBe(false);
    expect(isPersistentDuoPath("/sala/PERSISTENT_DUO/extra")).toBe(false);
    expect(isPersistentDuoPath("/game/quiz/PERSISTENT_DUO")).toBe(false);
    expect(isPersistentDuoPath("/duo")).toBe(false);
    expect(isPersistentDuoPath("/")).toBe(false);
  });

  it("aceita valores vazios e códigos malformados sem lançar erro", () => {
    expect(isPersistentDuoPath(null)).toBe(false);
    expect(isPersistentDuoPath(undefined)).toBe(false);
    expect(isPersistentDuoPath("")).toBe(false);
    expect(isPersistentDuoPath("/sala/%E0%A4%A")).toBe(false);
  });
});
