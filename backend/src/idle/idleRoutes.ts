import { Router } from "express";
import { isAccountId } from "../accounts/types";
import { CLICK_BOOST_DURATIONS, IDLE_EVENT_WEIGHTS, IdleEventType, IdleModeId } from "./idleConfig";
import { idleDevStore, idleStore } from "./IdleStore";
import { GameEnvironment } from "./types";

export const idleRouter = Router();

function isMode(value: unknown): value is IdleModeId {
  return value === "farm" || value === "kitty";
}

function isEnvironment(value: unknown): value is GameEnvironment {
  return value === "real" || value === "dev";
}

function requireAccount(value: unknown, res: import("express").Response): value is "andre" | "flavia" {
  if (!isAccountId(value)) {
    res.status(403).json({ error: "Selecione a conta André ou Flávia para acessar o cantinho." });
    return false;
  }
  return true;
}

function requireAndre(value: unknown, res: import("express").Response): value is "andre" {
  if (value !== "andre") {
    res.status(403).json({ error: "Só a conta canônica André pode usar ferramentas DEV ou administrativas." });
    return false;
  }
  return true;
}

function storeFor(environment: GameEnvironment) {
  return environment === "dev" ? idleDevStore : idleStore;
}

function resolveEnvironment(value: unknown, accountId: unknown, res: import("express").Response): GameEnvironment | null {
  const environment = isEnvironment(value) ? value : "real";
  if (environment === "dev" && !requireAndre(accountId, res)) return null;
  return environment;
}

idleRouter.get("/", (req, res) => {
  if (!requireAccount(req.query.accountId, res)) return;
  const environment = resolveEnvironment(req.query.environment, req.query.accountId, res);
  if (!environment) return;
  res.json(storeFor(environment).getSnapshot());
});

idleRouter.post("/enter", (req, res) => {
  const body = req.body as { by?: unknown; mode?: unknown; environment?: unknown };
  if (!requireAccount(body.by, res) || !isMode(body.mode)) {
    if (!res.headersSent) res.status(400).json({ error: "Modo inválido." });
    return;
  }
  const environment = resolveEnvironment(body.environment, body.by, res);
  if (!environment) return;
  res.json(storeFor(environment).enterMode(body.mode));
});

idleRouter.post("/action", (req, res) => {
  const body = req.body as { by?: unknown; mode?: unknown; itemId?: unknown; action?: unknown; environment?: unknown };
  if (!requireAccount(body.by, res)) return;
  const environment = resolveEnvironment(body.environment, body.by, res);
  if (!environment) return;
  if (!isMode(body.mode) || typeof body.itemId !== "string" || (body.action !== "buy" && body.action !== "upgrade")) {
    res.status(400).json({ error: "Ação inválida." }); return;
  }
  const result = storeFor(environment).act(body.mode, body.itemId, body.action);
  res.status(result.ok ? 200 : 409).json(result.ok ? result.snapshot : result);
});

idleRouter.post("/relic/upgrade", (req, res) => {
  const body = req.body as { by?: unknown; relicId?: unknown; environment?: unknown };
  if (!requireAccount(body.by, res)) return;
  const environment = resolveEnvironment(body.environment, body.by, res);
  if (!environment) return;
  if (typeof body.relicId !== "string" || body.relicId.length > 80) { res.status(400).json({ error: "Relíquia inválida." }); return; }
  const result = storeFor(environment).upgradeRelic(body.relicId);
  res.status(result.ok ? 200 : 409).json(result.ok ? result.snapshot : result);
});

idleRouter.post("/upgrade-batch", (req, res) => {
  const body = req.body as { by?: unknown; mode?: unknown; itemId?: unknown; count?: unknown; environment?: unknown };
  if (!requireAccount(body.by, res)) return;
  const environment = resolveEnvironment(body.environment, body.by, res);
  if (!environment) return;
  const count = body.count === "max" ? "max" : Number(body.count);
  if (!isMode(body.mode) || typeof body.itemId !== "string" || (count !== "max" && (!Number.isInteger(count) || count < 1 || count > 10_000))) {
    res.status(400).json({ error: "Lote de melhorias inválido." }); return;
  }
  const result = storeFor(environment).upgradeMany(body.mode, body.itemId, count);
  res.status(result.ok || result.applied > 0 ? 200 : 409).json(result);
});

idleRouter.post("/click", (req, res) => {
  const body = req.body as { by?: unknown; mode?: unknown; itemId?: unknown; environment?: unknown; source?: unknown };
  if (!requireAccount(body.by, res)) return;
  const environment = resolveEnvironment(body.environment, body.by, res);
  if (!environment) return;
  if (!isMode(body.mode) || typeof body.itemId !== "string") {
    res.status(400).json({ error: "Clique inválido." }); return;
  }
  const result = storeFor(environment).click(body.mode, body.itemId, String(body.by), { plain: body.source === "upgrades" });
  res.status(result.ok ? 200 : 429).json(result);
});

idleRouter.post("/activity", (req, res) => {
  const body = req.body as { by?: unknown; mode?: unknown; elapsedMs?: unknown; environment?: unknown };
  if (!requireAccount(body.by, res)) return;
  const environment = resolveEnvironment(body.environment, body.by, res);
  if (!environment) return;
  if (!isMode(body.mode) || !Number.isFinite(Number(body.elapsedMs))) {
    res.status(400).json({ error: "Atividade inválida." }); return;
  }
  res.json(storeFor(environment).recordActivity(body.mode, Number(body.elapsedMs)));
});

idleRouter.post("/event/collect", (req, res) => {
  const body = req.body as { by?: unknown; mode?: unknown; eventId?: unknown; environment?: unknown };
  if (!requireAccount(body.by, res)) return;
  const environment = resolveEnvironment(body.environment, body.by, res);
  if (!environment) return;
  if (!isMode(body.mode) || typeof body.eventId !== "string") {
    res.status(400).json({ error: "Evento inválido." }); return;
  }
  const result = storeFor(environment).collectEvent(body.mode, body.eventId);
  res.status(result.ok ? 200 : 409).json(result);
});

idleRouter.post("/dev/action", (req, res) => {
  const body = req.body as Record<string, unknown>;
  if (!requireAndre(body.by, res)) return;
  const store = idleDevStore;
  const action = body.action;
  if (action === "balance") {
    const target = body.target;
    const operation = body.operation;
    if ((target !== "global" && !isMode(target)) || !["add", "remove", "set", "zero"].includes(String(operation))) {
      res.status(400).json({ error: "Ação de saldo inválida." }); return;
    }
    res.json({ ok: true, snapshot: store.changeBalance(target, operation as "add" | "remove" | "set" | "zero", Number(body.amount) || 0) });
    return;
  }
  if (action === "item" && isMode(body.mode) && typeof body.itemId === "string" && ["unlock", "lock", "setLevel", "resetLevels"].includes(String(body.itemAction))) {
    res.json({ ok: true, snapshot: store.devItemAction(body.mode, body.itemId, body.itemAction as "unlock" | "lock" | "setLevel" | "resetLevels", Number(body.level)) });
    return;
  }
  if (action === "achievement" && isMode(body.mode) && typeof body.achievementId === "string") {
    res.json({ ok: true, snapshot: store.devAchievementAction(body.mode, body.achievementId, Boolean(body.completed)) });
    return;
  }
  if (action === "forceEvent" && isMode(body.mode) && typeof body.eventType === "string"
    && IDLE_EVENT_WEIGHTS.some((entry) => entry.type === body.eventType)) {
    res.json({ ok: true, snapshot: store.forceEvent(body.mode, body.eventType as IdleEventType) });
    return;
  }
  if (action === "simulateOffline" && isMode(body.mode)) {
    res.json({ ok: true, snapshot: store.simulateOffline(body.mode, Math.max(0, Number(body.elapsedMs) || 0)) });
    return;
  }
  if (action === "simulateDevOffline" && isMode(body.mode)) {
    const elapsedMs = Number(body.elapsedMs);
    res.json({ ok: true, snapshot: store.simulateDevOffline(body.mode, Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0) });
    return;
  }
  if (action === "kittyDev") {
    const kittyAction = String(body.kittyAction);
    const characterId = typeof body.characterId === "string" && body.characterId.length <= 80 ? body.characterId : "all";
    if (["addStones", "setStones", "maxStars", "resetStars", "maxItems", "resetItems", "resetAll"].includes(kittyAction)) {
      res.json({ ok: true, snapshot: store.devKittyAction(kittyAction as Parameters<typeof store.devKittyAction>[0], characterId, Number(body.amount) || 0) });
      return;
    }
  }
  if (action === "resetMode" && isMode(body.mode)) {
    store.resetMode(body.mode);
    res.json({ ok: true, snapshot: store.getSnapshot() });
    return;
  }
  res.status(400).json({ error: "Ferramenta DEV inválida." });
});

// ---------------------------------------------------------------------------
// Mecânicas experimentais do Mundo da Hello Kitty — SOMENTE ambiente DEV e conta André.
// Estas rotas nunca tocam o save real: usam sempre o idleDevStore.
// ---------------------------------------------------------------------------
function kittyDevCharacterBody(req: import("express").Request, res: import("express").Response): string | null {
  const body = req.body as { by?: unknown; characterId?: unknown };
  if (!requireAndre(body.by, res)) return null;
  if (typeof body.characterId !== "string" || body.characterId.length > 80) {
    res.status(400).json({ error: "Personagem inválido." });
    return null;
  }
  return body.characterId;
}

idleRouter.post("/kitty-dev/constellation", (req, res) => {
  const characterId = kittyDevCharacterBody(req, res);
  if (!characterId) return;
  const result = idleDevStore.buyKittyConstellation(characterId);
  res.status(result.ok ? 200 : 409).json(result.ok ? result.snapshot : result);
});

idleRouter.post("/kitty-dev/item", (req, res) => {
  const characterId = kittyDevCharacterBody(req, res);
  if (!characterId) return;
  const kind = (req.body as { kind?: unknown }).kind;
  if (kind !== "click" && kind !== "stone") { res.status(400).json({ error: "Item inválido." }); return; }
  const result = idleDevStore.buyKittyItem(characterId, kind);
  res.status(result.ok ? 200 : 409).json(result.ok ? result.snapshot : result);
});

idleRouter.post("/kitty-dev/awaken", (req, res) => {
  const characterId = kittyDevCharacterBody(req, res);
  if (!characterId) return;
  const result = idleDevStore.awakenKittyCharacter(characterId);
  res.status(result.ok ? 200 : 409).json(result.ok ? result.snapshot : result);
});

idleRouter.post("/kitty-dev/skin", (req, res) => {
  const characterId = kittyDevCharacterBody(req, res);
  if (!characterId) return;
  const result = idleDevStore.setKittySkin(characterId, Boolean((req.body as { awake?: unknown }).awake));
  res.status(result.ok ? 200 : 409).json(result.ok ? result.snapshot : result);
});

idleRouter.post("/kitty-dev/world", (req, res) => {
  const body = req.body as { by?: unknown; world?: unknown };
  if (!requireAndre(body.by, res)) return;
  const world = body.world === null ? null : Number(body.world);
  if (world !== null && !Number.isInteger(world)) { res.status(400).json({ error: "Ilha inválida." }); return; }
  const result = idleDevStore.setKittyLastWorld(world);
  res.status(result.ok ? 200 : 409).json(result.ok ? result.snapshot : result);
});

// Compatibilidade com os controles administrativos atuais: estes endpoints
// continuam operando SOMENTE no save real.
idleRouter.post("/dev/add", (req, res) => {
  const body = req.body as { by?: unknown; target?: unknown; amount?: unknown };
  if (!requireAndre(body.by, res)) return;
  const amount = Number(body.amount);
  if ((body.target !== "global" && !isMode(body.target)) || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "Informe um valor positivo válido." }); return;
  }
  res.json({ ok: true, snapshot: idleStore.addTestFunds(body.target, amount) });
});

idleRouter.delete("/reset/:target", (req, res) => {
  const body = req.body as { by?: unknown };
  if (!requireAndre(body.by, res)) return;
  const target = req.params.target;
  if (target === "global") idleStore.resetGlobalCoins();
  else if (target === "farm" || target === "kitty") idleStore.resetMode(target);
  else { res.status(404).json({ error: "Reset não encontrado." }); return; }
  res.json({ ok: true, snapshot: idleStore.getSnapshot() });
});

export const idleEventPublicConfig = { clickDurations: CLICK_BOOST_DURATIONS };
