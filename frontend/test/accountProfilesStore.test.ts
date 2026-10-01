import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAccounts } from "@/lib/accountApi";
import {
  applyAccountProfileUpdate,
  getAccountProfilesSnapshot,
  refreshAccountProfiles,
  resetAccountProfilesStoreForTests,
  subscribeAccountProfiles,
} from "@/lib/accountProfilesStore";

vi.mock("@/lib/accountApi", () => ({ fetchAccounts: vi.fn() }));

const andre = { id: "andre" as const, name: "André", photo: null, border: null };
const flavia = { id: "flavia" as const, name: "Flávia", photo: "data:image/png;base64,AA", border: "laco-rosa" };

describe("cache compartilhado de perfis", () => {
  beforeEach(() => {
    resetAccountProfilesStoreForTests();
    vi.mocked(fetchAccounts).mockReset();
  });

  it("carrega os perfis e avisa quem está inscrito", async () => {
    vi.mocked(fetchAccounts).mockResolvedValue([andre, flavia]);
    const listener = vi.fn();
    const unsubscribe = subscribeAccountProfiles(listener);
    await refreshAccountProfiles();
    expect(getAccountProfilesSnapshot()).toEqual({ andre, flavia });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("buscas simultâneas viram uma só requisição", async () => {
    vi.mocked(fetchAccounts).mockResolvedValue([andre, flavia]);
    await Promise.all([refreshAccountProfiles(), refreshAccountProfiles(), refreshAccountProfiles()]);
    expect(fetchAccounts).toHaveBeenCalledTimes(1);
  });

  it("não notifica (nem recria o objeto) quando nada mudou", async () => {
    vi.mocked(fetchAccounts).mockResolvedValue([andre, flavia]);
    await refreshAccountProfiles();
    const first = getAccountProfilesSnapshot();
    const listener = vi.fn();
    subscribeAccountProfiles(listener);
    vi.mocked(fetchAccounts).mockResolvedValue([{ ...andre }, { ...flavia }]);
    await refreshAccountProfiles();
    expect(getAccountProfilesSnapshot()).toBe(first);
    expect(listener).not.toHaveBeenCalled();
  });

  it("notifica quando a borda do par muda no servidor", async () => {
    vi.mocked(fetchAccounts).mockResolvedValue([andre, flavia]);
    await refreshAccountProfiles();
    const listener = vi.fn();
    subscribeAccountProfiles(listener);
    vi.mocked(fetchAccounts).mockResolvedValue([andre, { ...flavia, border: "coroa-real" }]);
    await refreshAccountProfiles();
    expect(getAccountProfilesSnapshot().flavia?.border).toBe("coroa-real");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("falha na rede mantém o que já estava no cache e não lança erro", async () => {
    vi.mocked(fetchAccounts).mockResolvedValue([andre, flavia]);
    await refreshAccountProfiles();
    vi.mocked(fetchAccounts).mockRejectedValue(new Error("offline"));
    await expect(refreshAccountProfiles()).resolves.toBeUndefined();
    expect(getAccountProfilesSnapshot()).toEqual({ andre, flavia });
  });

  it("depois de uma falha dá para tentar de novo", async () => {
    vi.mocked(fetchAccounts).mockRejectedValueOnce(new Error("offline"));
    await refreshAccountProfiles();
    vi.mocked(fetchAccounts).mockResolvedValue([andre]);
    await refreshAccountProfiles();
    expect(getAccountProfilesSnapshot().andre).toEqual(andre);
  });

  it("applyAccountProfileUpdate troca só o perfil informado", async () => {
    vi.mocked(fetchAccounts).mockResolvedValue([andre, flavia]);
    await refreshAccountProfiles();
    applyAccountProfileUpdate({ ...andre, name: "Xibatudo", border: "ceu-estrelado" });
    expect(getAccountProfilesSnapshot().andre).toMatchObject({ name: "Xibatudo", border: "ceu-estrelado" });
    expect(getAccountProfilesSnapshot().flavia).toEqual(flavia);
  });

  it("cancelar a inscrição para de receber avisos", async () => {
    vi.mocked(fetchAccounts).mockResolvedValue([andre, flavia]);
    const listener = vi.fn();
    subscribeAccountProfiles(listener)();
    await refreshAccountProfiles();
    expect(listener).not.toHaveBeenCalled();
  });
});
