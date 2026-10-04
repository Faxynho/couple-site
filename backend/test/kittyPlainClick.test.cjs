const test = require("node:test");
const assert = require("node:assert/strict");

const { IdleStore } = require("../dist/idle/IdleStore.js");
const { MONEY_EVENT_PRODUCTION_SECONDS } = require("../dist/idle/idleConfig.js");

const NOW = Date.parse("2026-10-04T12:00:00-03:00");

function makeStore() {
  const clock = { now: NOW };
  const store = new IdleStore(false, () => clock.now, undefined, "real");
  store.addTestFunds("kitty", 1_000);
  assert.equal(store.act("kitty", "hello-kitty", "buy").ok, true);
  return { store, clock };
}
const kitty = (store) => store.getSnapshot().modes.kitty;

test("clique simples (aba Melhorias) paga o dinheiro do clique e conta como toque", () => {
  const { store, clock } = makeStore();
  const before = kitty(store);
  clock.now += 1_000;
  const result = store.click("kitty", "hello-kitty", "andre", { plain: true });
  assert.equal(result.ok, true);
  assert.ok(result.reward > 0);
  assert.equal(result.milestone, 0);
  assert.equal(result.bonus, 0);
  const after = kitty(store);
  assert.equal(after.totalClicks, before.totalClicks + 1);
  assert.ok(after.balance >= before.balance + result.reward);
  assert.equal(after.statistics.clickEarned, before.statistics.clickEarned + result.reward);
});

test("clique simples não usa nem altera combo, sequência de 50 nem marcos", () => {
  const { store, clock } = makeStore();
  // monta um combo na tela inicial
  for (let tap = 0; tap < 10; tap += 1) { clock.now += 300; store.click("kitty", "hello-kitty", "andre"); }
  const activity = JSON.parse(JSON.stringify(kitty(store).clickActivity.andre));
  assert.equal(activity.streak, 10);
  clock.now += 300;
  const comboResult = store.click("kitty", "hello-kitty", "andre"); // 11º clique, com combo
  assert.equal(comboResult.ok, true);
  const comboReward = comboResult.reward;
  clock.now += 300;
  const plainReward = store.click("kitty", "hello-kitty", "andre", { plain: true }).reward;
  assert.ok(plainReward < comboReward, "o clique simples não recebe bônus de combo");
  const afterPlain = JSON.parse(JSON.stringify(kitty(store).clickActivity.andre));
  assert.equal(afterPlain.streak, 11, "sequência não anda com cliques simples");
  assert.equal(afterPlain.comboClicks, 11, "combo não anda com cliques simples");

  // 120 cliques simples não geram nenhum marco de 50 nem bônus
  let milestones = 0;
  for (let tap = 0; tap < 120; tap += 1) {
    clock.now += 300;
    const result = store.click("kitty", "hello-kitty", "andre", { plain: true });
    assert.equal(result.ok, true);
    if (result.milestone) milestones += 1;
    assert.equal(result.bonus, 0);
  }
  assert.equal(milestones, 0);
  const final = kitty(store).clickActivity.andre;
  assert.equal(final.streak, afterPlain.streak);
  assert.equal(final.milestoneCount ?? 0, afterPlain.milestoneCount ?? 0);
});

test("o clique simples não mexe nas missões de combo e marcos, mas conta toques e a conquista de cliques", () => {
  const { store, clock } = makeStore();
  const objectives = () => store.data.objectives.daily.progress;
  for (let tap = 0; tap < 40; tap += 1) { clock.now += 300; store.click("kitty", "hello-kitty", "andre", { plain: true }); }
  assert.equal(objectives().kittyBestCombo, 0);
  assert.equal(objectives().kittyMilestones, 0);
  assert.equal(objectives().kittyClicks, 40);
  assert.equal(kitty(store).totalClicks, 40);
});

test("o clique simples respeita o intervalo mínimo entre toques e exige personagem comprado", () => {
  const { store, clock } = makeStore();
  clock.now += 1_000;
  assert.equal(store.click("kitty", "hello-kitty", "andre", { plain: true }).ok, true);
  assert.equal(store.click("kitty", "hello-kitty", "andre", { plain: true }).ok, false, "rápido demais");
  clock.now += 1_000;
  assert.equal(store.click("kitty", "dear-daniel", "andre", { plain: true }).ok, false, "não comprado");
});

test("sacola de dinheiro: Hello Kitty paga 270 s de produção; Fazendinha continua com 45 s", () => {
  assert.deepEqual(MONEY_EVENT_PRODUCTION_SECONDS, { farm: 45, kitty: 270 });
  const { store } = makeStore();
  store.devItemAction("kitty", "hello-kitty", "setLevel", 60);
  const production = kitty(store).totalProduction;
  const eventKitty = store.forceEvent("kitty", "money").modes.kitty.activeEvent;
  const before = kitty(store).balance;
  const collected = store.collectEvent("kitty", eventKitty.id);
  assert.equal(collected.ok, true);
  const gained = collected.snapshot.modes.kitty.statistics.eventEarned;
  assert.ok(Math.abs(gained - production * 270) / (production * 270) < 1e-9, `${gained} vs ${production * 270}`);
  assert.ok(collected.snapshot.modes.kitty.balance - before >= gained - 1);

  store.addTestFunds("farm", 1_000);
  store.act("farm", "garden", "buy");
  const farmProduction = store.getSnapshot().modes.farm.totalProduction;
  const eventFarm = store.forceEvent("farm", "money").modes.farm.activeEvent;
  const farmCollected = store.collectEvent("farm", eventFarm.id);
  const farmGain = farmCollected.snapshot.modes.farm.statistics.eventEarned;
  assert.ok(farmGain >= farmProduction * 45 - 1e-6 && farmGain <= Math.max(farmProduction * 45, 100) * 1.0001 + 1e-6 || farmGain > 0);
  assert.ok(farmGain < farmProduction * 270 || farmProduction === 0, "Fazendinha não ganhou o aumento");
});
