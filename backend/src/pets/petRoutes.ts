import { Router } from "express";
import { isAccountId } from "../accounts/types";
import { idleDevStore, idleStore } from "../idle/IdleStore";
import { isPetRoomId, persistentDuoStore } from "../rooms/persistentDuo";
import { isPetDecorationId, PET_DECORATION_PRICES } from "./petEconomy";

export const petRouter = Router();

function authorize(accountId: unknown, environment: unknown, res: import("express").Response) {
  if (!isAccountId(accountId)) {
    res.status(403).json({ error: "Conta inválida." });
    return null;
  }
  const env = environment === "dev" ? "dev" : "real";
  if (env === "dev" && accountId !== "andre") {
    res.status(403).json({ error: "Somente André pode acessar o ambiente PET DEV." });
    return null;
  }
  return { accountId, environment: env as "real" | "dev", store: env === "dev" ? idleDevStore : idleStore };
}

petRouter.get("/", (req, res) => {
  const access = authorize(req.query.accountId, req.query.environment, res);
  if (!access) return;
  if (!isPetRoomId(req.query.petId)) {
    res.status(400).json({ error: "Pet inválido." });
    return;
  }
  const idle = access.store.getSnapshot();
  res.json({
    room: persistentDuoStore.getPetRoom(req.query.petId, access.environment),
    globalCoins: idle.globalCoins,
    purchasedDecorations: idle.purchasedPetDecorations,
    prices: PET_DECORATION_PRICES,
  });
});

petRouter.post("/purchase", (req, res) => {
  const body = req.body as { by?: unknown; environment?: unknown; decorationId?: unknown };
  const access = authorize(body.by, body.environment, res);
  if (!access) return;
  if (!isPetDecorationId(body.decorationId)) {
    res.status(400).json({ error: "Decoração inválida." });
    return;
  }
  const result = access.store.purchasePetDecoration(body.decorationId);
  res.status(result.ok ? 200 : 409).json(result);
});

petRouter.post("/dev/action", (req, res) => {
  const body = req.body as Record<string, unknown>;
  const access = authorize(body.by, "dev", res);
  if (!access || access.accountId !== "andre") return;
  const action = body.action;
  if (action === "balance" && ["add", "remove", "set", "zero"].includes(String(body.operation))) {
    const operation = body.operation as "add" | "remove" | "set" | "zero";
    const snapshot = idleDevStore.changeBalance("global", operation, Number(body.amount) || 0);
    res.json({ ok: true, snapshot });
    return;
  }
  if (action === "decoration" && isPetDecorationId(body.decorationId)) {
    if (!body.owned) persistentDuoStore.removePetDecoration(body.decorationId, "dev");
    const snapshot = idleDevStore.setPetDecorationOwned(body.decorationId, Boolean(body.owned));
    res.json({ ok: true, snapshot });
    return;
  }
  if (action === "allDecorations") {
    if (!body.owned) persistentDuoStore.resetPetEnvironment("dev");
    const snapshot = idleDevStore.setAllPetDecorationsOwned(Boolean(body.owned));
    res.json({ ok: true, snapshot });
    return;
  }
  if (action === "resetRoom" && isPetRoomId(body.petId)) {
    res.json({ ok: true, room: persistentDuoStore.resetPetRoom(body.petId, "dev") });
    return;
  }
  if (action === "resetEnvironment") {
    const rooms = persistentDuoStore.resetPetEnvironment("dev");
    idleDevStore.resetPetPurchases();
    res.json({ ok: true, rooms, snapshot: idleDevStore.getSnapshot() });
    return;
  }
  res.status(400).json({ error: "Ferramenta PET DEV inválida." });
});

petRouter.post("/admin/reset-real", (req, res) => {
  const body = req.body as { by?: unknown; confirmation?: unknown };
  if (body.by !== "andre") {
    res.status(403).json({ error: "Somente a conta canônica André pode resetar os quartos reais." });
    return;
  }
  if (body.confirmation !== "RESETAR QUARTOS DOS PETS") {
    res.status(400).json({ error: "Confirmação inválida." });
    return;
  }
  const rooms = persistentDuoStore.resetPetEnvironment("real");
  const snapshot = idleStore.resetPetPurchases();
  res.json({ ok: true, rooms, snapshot });
});
