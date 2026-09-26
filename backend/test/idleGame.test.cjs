const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { IdleStore } = require("../dist/idle/IdleStore.js");

test("estado inicial permite a primeira melhoria nos dois modos", () => {
  let now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  const snapshot = store.getSnapshot();

  assert.equal(snapshot.modes.farm.items[0].purchased, true);
  assert.equal(snapshot.modes.farm.items[0].level, 1);
  assert.ok(snapshot.modes.farm.balance >= snapshot.modes.farm.items[0].nextCost);
  assert.equal(snapshot.modes.kitty.items[0].purchased, true);
  assert.ok(snapshot.modes.kitty.balance >= snapshot.modes.kitty.items[0].nextCost);
  assert.equal(snapshot.globalCoins, 20, "as duas conquistas iniciais são premiadas uma vez");
});

test("produção offline é limitada a oito horas e só é liquidada uma vez", () => {
  let now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.getSnapshot();
  now += 10 * 60 * 60 * 1_000;

  const first = store.enterMode("farm");
  assert.equal(first.offlineReward.elapsedMs, 8 * 60 * 60 * 1_000);
  assert.equal(first.offlineReward.amount, 57_600);
  const second = store.enterMode("farm");
  assert.equal(second.offlineReward, null);
  assert.equal(second.modes.farm.balance, first.modes.farm.balance);
});

test("duas melhorias concorrentes nunca gastam mais que o saldo", () => {
  const now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.getSnapshot();

  const first = store.act("farm", "garden", "upgrade");
  const second = store.act("farm", "garden", "upgrade");
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.snapshot.modes.farm.items[0].level, 2);
  assert.equal(second.snapshot.modes.farm.balance, 10);
  assert.ok(second.snapshot.modes.farm.balance >= 0);
});

test("ledger impede prêmio duplicado do mesmo encerramento de minigame", () => {
  const now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  const first = store.recordMinigameCompletion("chess", "chess:123:andre,flavia", true);
  const second = store.recordMinigameCompletion("chess", "chess:123:andre,flavia", true);
  assert.equal(first, 20);
  assert.equal(second, 0);
  assert.equal(store.getSnapshot().objectives.daily.find((item) => item.id === "daily-minigame").progress, 1);
});

test("objetivo diário de entrada premia uma única vez no período", () => {
  const now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  assert.equal(store.getSnapshot().globalCoins, 20);

  const first = store.enterMode("farm");
  const second = store.enterMode("farm");
  assert.equal(first.globalCoins, 25);
  assert.equal(second.globalCoins, 25);
  assert.ok(second.objectives.daily.find((item) => item.id === "daily-farm-entry").completedAt);
});

test("compras da fazendinha não usam nem alteram o saldo da Hello Kitty", () => {
  let now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.getSnapshot();
  const kittyBefore = store.getSnapshot().modes.kitty.balance;
  now += 60_000;
  store.enterMode("farm");

  const result = store.act("farm", "chicken-coop", "buy");
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.modes.farm.items[1].purchased, true);
  assert.equal(result.snapshot.modes.kitty.balance, kittyBefore);
});

test("estado financeiro persiste e reaparece depois de recarregar o store", async () => {
  const folder = await mkdtemp(join(tmpdir(), "idle-store-"));
  const file = join(folder, "idle-game.json");
  const now = Date.parse("2026-09-26T12:00:00-03:00");
  try {
    const first = new IdleStore(true, () => now, file);
    await first.ready();
    first.getSnapshot();
    assert.equal(first.act("farm", "garden", "upgrade").ok, true);
    await new Promise((resolve) => setTimeout(resolve, 650));

    const reloaded = new IdleStore(true, () => now, file);
    await reloaded.ready();
    const snapshot = reloaded.getSnapshot();
    assert.equal(snapshot.modes.farm.items[0].level, 2);
    assert.equal(snapshot.modes.farm.balance, 10);
    assert.equal(snapshot.globalCoins, 20);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("resets são independentes e restauram somente o alvo", () => {
  let now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.getSnapshot();
  now += 60_000;
  store.enterMode("farm");
  store.act("farm", "garden", "upgrade");
  store.recordMinigameCompletion("puzzle", "puzzle:1:andre", false);
  const kittyBefore = store.getSnapshot().modes.kitty;

  store.resetMode("farm");
  const reset = store.getSnapshot();
  assert.equal(reset.modes.farm.balance, 30);
  assert.equal(reset.modes.farm.items[0].level, 1);
  assert.equal(reset.modes.farm.totalUpgrades, 0);
  assert.deepEqual(reset.modes.kitty, kittyBefore);
  assert.ok(reset.globalCoins > 0);

  store.resetGlobalCoins();
  assert.equal(store.getSnapshot().globalCoins, 0);
  assert.equal(store.getSnapshot().modes.kitty.balance, kittyBefore.balance);
});
