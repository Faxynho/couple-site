const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { IdleStore } = require("../dist/idle/IdleStore.js");
const { PET_DECORATION_IDS, PET_DECORATION_PRICES, PET_DECORATION_TOTAL_PRICE } = require("../dist/pets/petEconomy.js");
const { PersistentDuoStore } = require("../dist/rooms/persistentDuo.js");

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
  const first = store.recordMinigameCompletion("chess:123:andre,flavia", 20, true);
  const second = store.recordMinigameCompletion("chess:123:andre,flavia", 20, true);
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
  store.recordMinigameCompletion("puzzle:1:andre", 30, false);
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

test("Produção x2 dobra passivo e clique por 90s sem acumular consigo mesma", () => {
  let now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.act("farm", "garden", "buy");
  let snapshot = store.forceEvent("farm", "production2");
  let collected = store.collectEvent("farm", snapshot.modes.farm.activeEvent.id);
  assert.equal(collected.ok, true);
  assert.equal(collected.snapshot.modes.farm.effectiveProduction, 2.4);
  assert.equal(collected.snapshot.modes.farm.clickMultiplier, 2);
  assert.equal(collected.snapshot.modes.farm.productionBoost.expiresAt - collected.snapshot.modes.farm.productionBoost.startedAt, 90_000);

  const click = store.click("farm", "garden", "andre");
  assert.equal(click.reward, 2);
  assert.equal(click.multiplier, 2);
  now += 10_000;
  const beforePassive = store.getSnapshot().modes.farm.statistics.passiveEarned;
  store.enterMode("farm");
  const afterPassive = store.getSnapshot().modes.farm.statistics.passiveEarned;
  assert.equal(Math.round((afterPassive - beforePassive) * 10) / 10, 24);

  snapshot = store.forceEvent("farm", "production2");
  collected = store.collectEvent("farm", snapshot.modes.farm.activeEvent.id);
  assert.equal(collected.snapshot.modes.farm.clickMultiplier, 2);
  now += 90_001;
  assert.equal(store.getSnapshot().modes.farm.productionBoost, null);
  assert.equal(store.getSnapshot().modes.farm.clickMultiplier, 1);
});

test("Click Rush preserva durações individuais, acumula por soma e mantém o maior efeito visual", () => {
  const baseNow = Date.parse("2026-09-26T12:00:00-03:00");
  const durations = { click2: 60_000, click3: 45_000, click5: 30_000, click10: 20_000 };

  for (const [type, duration] of Object.entries(durations)) {
    let now = baseNow;
    const isolated = new IdleStore(false, () => now);
    isolated.act("kitty", "hello-kitty", "buy");
    const forced = isolated.forceEvent("kitty", type);
    const result = isolated.collectEvent("kitty", forced.modes.kitty.activeEvent.id);
    assert.equal(result.snapshot.modes.kitty.clickBoost.multiplier, Number(type.replace("click", "")));
    assert.equal(result.snapshot.modes.kitty.clickBoost.visualMultiplier, Number(type.replace("click", "")));
    assert.equal(result.snapshot.modes.kitty.clickBoost.sources.length, 1);
    assert.equal(result.snapshot.modes.kitty.clickBoost.sources[0].expiresAt - result.snapshot.modes.kitty.clickBoost.sources[0].startedAt, duration);
  }

  let now = baseNow;
  const store = new IdleStore(false, () => now);
  store.act("kitty", "hello-kitty", "buy");

  let forced = store.forceEvent("kitty", "click5");
  let result = store.collectEvent("kitty", forced.modes.kitty.activeEvent.id);
  assert.equal(result.snapshot.modes.kitty.clickBoost.multiplier, 5);
  assert.equal(result.snapshot.modes.kitty.clickBoost.visualMultiplier, 5);

  now += 5_000;
  forced = store.forceEvent("kitty", "click10");
  result = store.collectEvent("kitty", forced.modes.kitty.activeEvent.id);
  assert.equal(result.snapshot.modes.kitty.clickBoost.multiplier, 15);
  assert.equal(result.snapshot.modes.kitty.clickBoost.visualMultiplier, 10);
  assert.equal(result.snapshot.modes.kitty.clickBoost.sources.length, 2);

  forced = store.forceEvent("kitty", "click2");
  result = store.collectEvent("kitty", forced.modes.kitty.activeEvent.id);
  assert.equal(result.snapshot.modes.kitty.clickBoost.multiplier, 17);
  assert.equal(result.snapshot.modes.kitty.clickBoost.visualMultiplier, 10);
  assert.equal(store.click("kitty", "hello-kitty", "flavia").reward, 17);

  forced = store.forceEvent("kitty", "production2");
  result = store.collectEvent("kitty", forced.modes.kitty.activeEvent.id);
  assert.equal(result.snapshot.modes.kitty.clickMultiplier, 34);

  now += 20_001;
  let snapshot = store.getSnapshot();
  assert.equal(snapshot.modes.kitty.clickBoost.multiplier, 7);
  assert.equal(snapshot.modes.kitty.clickBoost.visualMultiplier, 5);
  assert.equal(snapshot.modes.kitty.clickMultiplier, 14);

  now += 5_001;
  snapshot = store.getSnapshot();
  assert.equal(snapshot.modes.kitty.clickBoost.multiplier, 2);
  assert.equal(snapshot.modes.kitty.clickBoost.visualMultiplier, 2);
  assert.equal(snapshot.modes.kitty.clickMultiplier, 4);

  now += 35_001;
  snapshot = store.getSnapshot();
  assert.equal(snapshot.modes.kitty.clickBoost, null);
  assert.equal(snapshot.modes.kitty.clickMultiplier, 2);
});

test("eventos usam atividade real, mantêm somente um visível e expiram sem recompensa", () => {
  let now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  let snapshot;
  for (let elapsed = 0; elapsed < 120_000 && !snapshot?.modes.farm.activeEvent; elapsed += 5_000) {
    snapshot = store.recordActivity("farm", 5_000);
    now += 5_000;
  }
  assert.ok(snapshot.modes.farm.activeEvent);
  const firstId = snapshot.modes.farm.activeEvent.id;
  snapshot = store.recordActivity("farm", 1_000);
  assert.equal(snapshot.modes.farm.activeEvent.id, firstId);
  now += 60_001;
  const expired = store.collectEvent("farm", firstId);
  assert.equal(expired.ok, false);
  assert.equal(expired.snapshot.modes.farm.statistics.eventsCollected, 0);
  const forcedMoney = store.forceEvent("farm", "money");
  const collectedMoney = store.collectEvent("farm", forcedMoney.modes.farm.activeEvent.id);
  assert.ok(collectedMoney.snapshot.modes.farm.statistics.eventEarned > 0);
  assert.equal(collectedMoney.snapshot.modes.farm.statistics.passiveEarned, 0);
});

test("estatísticas novas separam clique, passivo, offline, hoje e dados por item", () => {
  let now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  store.act("farm", "garden", "buy");
  store.click("farm", "garden", "flavia");
  now += 65_000;
  store.enterMode("farm");
  let stats = store.getSnapshot().modes.farm.statistics;
  assert.equal(stats.clickEarned, 1);
  assert.ok(stats.passiveEarned >= 78);
  assert.ok(stats.offlineEarned >= 78);
  assert.equal(stats.items.garden.clicks, 1);
  assert.equal(stats.items.garden.clickEarned, 1);
  assert.ok(stats.items.garden.passiveEarned >= 78);
  assert.ok(stats.earnedToday >= 79);
  now = Date.parse("2026-09-27T00:01:00-03:00");
  stats = store.getSnapshot().modes.farm.statistics;
  assert.equal(stats.todayKey, "2026-09-27");
  assert.equal(stats.earnedToday, 0);
});

test("loja de pets cobra a tabela central uma vez, nunca negativa e compartilha unlock", () => {
  const now = Date.parse("2026-09-26T12:00:00-03:00");
  const store = new IdleStore(false, () => now);
  assert.equal(PET_DECORATION_TOTAL_PRICE, 2_320);
  assert.equal(store.purchasePetDecoration("bed").ok, false);
  store.changeBalance("global", "set", PET_DECORATION_TOTAL_PRICE);
  for (const id of PET_DECORATION_IDS) {
    const before = store.getSnapshot().globalCoins;
    const purchase = store.purchasePetDecoration(id);
    assert.equal(purchase.ok, true);
    assert.equal(purchase.snapshot.globalCoins, before - PET_DECORATION_PRICES[id]);
  }
  let snapshot = store.getSnapshot();
  assert.equal(snapshot.globalCoins, 0);
  assert.deepEqual(new Set(snapshot.purchasedPetDecorations), new Set(PET_DECORATION_IDS));
  const repeat = store.purchasePetDecoration("bed");
  assert.equal(repeat.alreadyOwned, true);
  assert.equal(repeat.snapshot.globalCoins, 0);
});

test("quartos real e DEV, Nix e Max, permanecem isolados nos resets", () => {
  const rooms = new PersistentDuoStore(false);
  const realBefore = rooms.getPetRoom("nix", "real");
  assert.ok(Object.keys(realBefore.slots).length > 0);
  rooms.togglePetDecoration("nix", "bed", "dev");
  assert.equal(rooms.getPetRoom("nix", "dev").slots["floor-bed"], "bed");
  assert.equal(rooms.getPetRoom("max", "dev").slots["floor-bed"], undefined);
  rooms.resetPetRoom("nix", "dev");
  assert.equal(rooms.getPetRoom("nix", "dev").slots["floor-bed"], undefined);
  assert.deepEqual(rooms.getPetRoom("nix", "real").slots, realBefore.slots);
  rooms.togglePetDecoration("max", "rug", "dev");
  rooms.resetPetEnvironment("real");
  assert.equal(rooms.getPetRoom("max", "dev").slots["floor-rug"], "rug");
  assert.equal(Object.keys(rooms.getPetRoom("max", "real").slots).length, 0);
});

test("migration v3 preserva progresso e libera decorações existentes sem inventar estatísticas", async () => {
  const { writeFile } = require("node:fs/promises");
  const folder = await mkdtemp(join(tmpdir(), "idle-migration-"));
  const file = join(folder, "idle-game.json");
  const now = Date.parse("2026-09-26T12:00:00-03:00");
  try {
    await writeFile(file, JSON.stringify({ schemaVersion: 3, globalCoins: 321, modes: { farm: { balance: 777, totalEarned: 555, items: { garden: { purchased: true, level: 4, purchasedAt: now - 1000 } }, unlockedAchievements: { "farm-first-garden": now - 500 } } } }));
    const store = new IdleStore(true, () => now, file, "real");
    await store.ready();
    const snapshot = store.getSnapshot();
    assert.equal(snapshot.globalCoins, 321);
    assert.equal(snapshot.modes.farm.balance, 777);
    assert.equal(snapshot.modes.farm.items[0].level, 4);
    assert.equal(snapshot.modes.farm.statistics.passiveEarned, 0);
    assert.deepEqual(new Set(snapshot.purchasedPetDecorations), new Set(PET_DECORATION_IDS));
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
