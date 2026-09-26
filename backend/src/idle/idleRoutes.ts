import { Router } from "express";
import { isAccountId } from "../accounts/types";
import { IdleModeId } from "./idleConfig";
import { idleStore } from "./IdleStore";

export const idleRouter = Router();

function isMode(value: unknown): value is IdleModeId {
  return value === "farm" || value === "kitty";
}

function requireAccount(value: unknown, res: import("express").Response): boolean {
  if (!isAccountId(value)) {
    res.status(403).json({ error: "Selecione a conta André ou Flávia para acessar o cantinho." });
    return false;
  }
  return true;
}

function requireAndre(value: unknown, res: import("express").Response): boolean {
  if (value !== "andre") {
    res.status(403).json({ error: "Só a conta André pode usar os resets de teste." });
    return false;
  }
  return true;
}

idleRouter.get("/", (req, res) => {
  if (!requireAccount(req.query.accountId, res)) return;
  res.json(idleStore.getSnapshot());
});

idleRouter.post("/enter", (req, res) => {
  const body = req.body as { by?: unknown; mode?: unknown };
  if (!requireAccount(body.by, res)) return;
  if (!isMode(body.mode)) {
    res.status(400).json({ error: "Modo inválido." });
    return;
  }
  res.json(idleStore.enterMode(body.mode));
});

idleRouter.post("/action", (req, res) => {
  const body = req.body as { by?: unknown; mode?: unknown; itemId?: unknown; action?: unknown };
  if (!requireAccount(body.by, res)) return;
  if (!isMode(body.mode) || typeof body.itemId !== "string" || (body.action !== "buy" && body.action !== "upgrade")) {
    res.status(400).json({ error: "Ação inválida." });
    return;
  }
  const result = idleStore.act(body.mode, body.itemId, body.action);
  if (!result.ok) {
    res.status(409).json(result);
    return;
  }
  res.json(result.snapshot);
});

idleRouter.post("/click", (req, res) => {
  const body = req.body as { by?: unknown; mode?: unknown; itemId?: unknown };
  if (!requireAccount(body.by, res)) return;
  if (!isMode(body.mode) || typeof body.itemId !== "string") {
    res.status(400).json({ error: "Clique inválido." });
    return;
  }
  const result = idleStore.click(body.mode, body.itemId, String(body.by));
  if (!result.ok) {
    res.status(429).json(result);
    return;
  }
  res.json(result);
});

idleRouter.post("/dev/add", (req, res) => {
  const body = req.body as { by?: unknown; target?: unknown; amount?: unknown };
  if (!requireAndre(body.by, res)) return;
  const amount = Number(body.amount);
  if ((body.target !== "global" && !isMode(body.target)) || !Number.isFinite(amount) || amount <= 0 || amount > 1e200) {
    res.status(400).json({ error: "Informe um valor positivo válido." });
    return;
  }
  res.json({ ok: true, snapshot: idleStore.addTestFunds(body.target, amount) });
});

idleRouter.delete("/reset/:target", (req, res) => {
  const body = req.body as { by?: unknown };
  if (!requireAndre(body.by, res)) return;
  const target = req.params.target;
  if (target === "global") idleStore.resetGlobalCoins();
  else if (target === "farm" || target === "kitty") idleStore.resetMode(target);
  else {
    res.status(404).json({ error: "Reset não encontrado." });
    return;
  }
  res.json({ ok: true, snapshot: idleStore.getSnapshot() });
});
