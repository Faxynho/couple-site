const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { IdleStore } = require("../dist/idle/IdleStore.js");

test("estado inicial começa vazio e permite comprar o primeiro item nos dois modos", () => {
  let now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  const snapshot = store.getSnapshot();

  assert.equal(snapshot.modes.farm.items[0].purchased, false);
  assert.equal(snapshot.modes.farm.items[0].level, 0);
  assert.equal(snapshot.modes.farm.balance, snapshot.modes.farm.items[0].nextCost);
  assert.equal(snapshot.modes.kitty.items[0].purchased, false);
  assert.equal(snapshot.modes.kitty.balance, snapshot.modes.kitty.items[0].nextCost);
  assert.equal(snapshot.globalCoins, 0);
  assert.equal(store.act("farm", "garden", "buy").ok, true);
  assert.equal(store.act("kitty", "hello-kitty", "buy").ok, true);
});

test("produção offline é limitada a oito horas e só é liquidada uma vez", () => {
  let now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.act("farm", "garden", "buy");
  now += 10 * 60 * 60 * 1_000;

  const first = store.enterMode("farm");
  assert.equal(first.offlineReward.elapsedMs, 8 * 60 * 60 * 1_000);
  assert.equal(first.offlineReward.amount, 34_560);
  const second = store.enterMode("farm");
  assert.equal(second.offlineReward, null);
  assert.equal(second.modes.farm.balance, first.modes.farm.balance);
});

test("duas melhorias concorrentes nunca gastam mais que o saldo", () => {
  const now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.act("farm", "garden", "buy");
  store.addTestFunds("farm", 150);

  const first = store.act("farm", "garden", "upgrade");
  const second = store.act("farm", "garden", "upgrade");
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.snapshot.modes.farm.items[0].level, 2);
  assert.equal(second.snapshot.modes.farm.balance, 70);
  assert.ok(second.snapshot.modes.farm.balance >= 0);
});

test("lote de melhorias aplica somente o que o saldo permite e mantém a operação atômica", () => {
  const now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.act("farm", "garden", "buy");
  store.addTestFunds("farm", 300);

  const result = store.upgradeMany("farm", "garden", 5);
  assert.equal(result.ok, false);
  assert.equal(result.applied, 2);
  assert.equal(result.requested, 5);
  assert.equal(result.snapshot.modes.farm.items[0].level, 3);
  assert.equal(result.snapshot.modes.farm.balance, 90);
  assert.equal(result.snapshot.modes.farm.totalUpgrades, 2);
  assert.ok(result.snapshot.modes.farm.balance >= 0);
});

test("cada produtor e personagem possui e conclui sua conquista de desbloqueio", () => {
  const now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.addTestFunds("farm", 1e13);
  store.addTestFunds("kitty", 2e13);
  let snapshot = store.getSnapshot();
  for (const item of snapshot.modes.farm.items) assert.equal(store.act("farm", item.definition.id, "buy").ok, true);
  for (const item of snapshot.modes.kitty.items) assert.equal(store.act("kitty", item.definition.id, "buy").ok, true);
  snapshot = store.getSnapshot();
  for (const mode of ["farm", "kitty"]) {
    const ownAchievements = snapshot.modes[mode].achievements.filter((achievement) => achievement.condition.type === "own");
    assert.equal(ownAchievements.length, 10);
    assert.ok(ownAchievements.every((achievement) => achievement.completedAt));
  }
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
  assert.equal(store.getSnapshot().globalCoins, 0);

  const first = store.enterMode("farm");
  const second = store.enterMode("farm");
  assert.equal(first.globalCoins, 5);
  assert.equal(second.globalCoins, 5);
  assert.ok(second.objectives.daily.find((item) => item.id === "daily-farm-entry").completedAt);
});

test("compras da fazendinha não usam nem alteram o saldo da Hello Kitty", () => {
  let now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.getSnapshot();
  const kittyBefore = store.getSnapshot().modes.kitty.balance;
  const result = store.act("farm", "garden", "buy");
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.modes.farm.items[0].purchased, true);
  assert.equal(result.snapshot.modes.kitty.balance, kittyBefore);
});

test("estado financeiro persiste e reaparece depois de recarregar o store", async () => {
  const folder = await mkdtemp(join(tmpdir(), "idle-store-"));
  const file = join(folder, "idle-game.json");
  const now = Date.parse("2026-09-26T12:00:00-03:00");
  try {
    const first = new IdleStore(true, () => now, file);
    await first.ready();
    first.act("farm", "garden", "buy");
    first.addTestFunds("farm", 100);
    assert.equal(first.act("farm", "garden", "upgrade").ok, true);
    await new Promise((resolve) => setTimeout(resolve, 650));

    const reloaded = new IdleStore(true, () => now, file);
    await reloaded.ready();
    const snapshot = reloaded.getSnapshot();
    assert.equal(snapshot.modes.farm.items[0].level, 2);
    assert.equal(snapshot.modes.farm.balance, 20);
    assert.equal(snapshot.globalCoins, 5);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("resets são independentes e restauram somente o alvo", () => {
  let now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.act("farm", "garden", "buy");
  store.addTestFunds("farm", 100);
  store.act("farm", "garden", "upgrade");
  store.recordMinigameCompletion("puzzle", "puzzle:1:andre", false);
  const kittyBefore = store.getSnapshot().modes.kitty;

  store.resetMode("farm");
  const reset = store.getSnapshot();
  assert.equal(reset.modes.farm.balance, 40);
  assert.equal(reset.modes.farm.items[0].level, 0);
  assert.equal(reset.modes.farm.items[0].purchased, false);
  assert.equal(reset.modes.farm.totalUpgrades, 0);
  assert.deepEqual(reset.modes.kitty, kittyBefore);
  assert.ok(reset.globalCoins > 0);

  store.resetGlobalCoins();
  assert.equal(store.getSnapshot().globalCoins, 0);
  assert.equal(store.getSnapshot().modes.kitty.balance, kittyBefore.balance);
});

test("cenários dois e três desbloqueiam ao comprar o primeiro item do grupo", () => {
  const now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  let snapshot = store.getSnapshot();
  assert.deepEqual(snapshot.modes.farm.scenes.map((scene) => scene.unlocked), [true, false, false]);
  store.addTestFunds("farm", 2_000_000_000);
  for (const id of ["garden", "chicken-coop", "fruit-stand", "orchard", "bakery"]) assert.equal(store.act("farm", id, "buy").ok, true);
  snapshot = store.getSnapshot();
  assert.equal(snapshot.modes.farm.scenes[1].unlocked, true);
  for (const id of ["barn", "windmill", "market", "greenhouse"]) assert.equal(store.act("farm", id, "buy").ok, true);
  assert.equal(store.getSnapshot().modes.farm.scenes[2].unlocked, true);
});

test("clicker premia item comprado e limita spam por conta", () => {
  let now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.act("kitty", "hello-kitty", "buy");
  const first = store.click("kitty", "hello-kitty", "andre");
  assert.equal(first.ok, true);
  assert.equal(first.reward, 1);
  assert.equal(first.snapshot.modes.kitty.totalClicks, 1);
  assert.equal(store.click("kitty", "hello-kitty", "andre").ok, false);
  assert.equal(store.click("kitty", "hello-kitty", "flavia").ok, true, "cada conta tem seu próprio limite curto");
  now += 125;
  assert.equal(store.click("kitty", "hello-kitty", "andre").ok, true);
});

test("clicker escala em 22% da produção atual do item", () => {
  let now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.act("kitty", "hello-kitty", "buy");
  store.addTestFunds("kitty", 1e12);
  assert.equal(store.upgradeMany("kitty", "hello-kitty", 20).applied, 20);
  const before = store.getSnapshot().modes.kitty.items[0];
  const click = store.click("kitty", "hello-kitty", "andre");
  assert.equal(click.ok, true);
  assert.equal(click.reward, Math.max(1, Math.floor(before.production * .22)));
});

test("créditos de desenvolvedor alteram apenas o saldo escolhido", () => {
  const now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.addTestFunds("farm", 1_000);
  store.addTestFunds("global", 25);
  const snapshot = store.getSnapshot();
  assert.equal(snapshot.modes.farm.balance, 1_040);
  assert.equal(snapshot.modes.kitty.balance, 60);
  assert.equal(snapshot.globalCoins, 25);
});
