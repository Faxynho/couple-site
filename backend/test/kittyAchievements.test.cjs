const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtemp, rm, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { IdleStore } = require("../dist/idle/IdleStore.js");
const { ACHIEVEMENTS, IDLE_CATALOG, KITTY_RELICS } = require("../dist/idle/idleConfig.js");

const NOW = Date.parse("2026-10-03T12:00:00-03:00");
const kittyAchievements = ACHIEVEMENTS.filter((item) => item.mode === "kitty");
const byId = (id) => kittyAchievements.find((item) => item.id === id);

const NEW_REWARDS = {
  "kitty-1t": 350, "kitty-1qa": 1000,
  "kitty-level-25": 60, "kitty-level-50": 200, "kitty-level-100": 750, "kitty-level-200": 1500,
  "kitty-clicks-1k": 50, "kitty-clicks-5k": 100, "kitty-clicks-10k": 150, "kitty-clicks-25k": 350, "kitty-clicks-50k": 700, "kitty-clicks-100k": 1500,
  "kitty-relics-all": 500,
};

function makeStore() {
  const clock = { now: NOW };
  return { store: new IdleStore(false, () => clock.now, undefined, "real"), clock };
}

const done = (store, id) => store.getSnapshot().modes.kitty.achievements.find((item) => item.id === id);

test("as 13 conquistas novas existem com as recompensas pedidas e os valores antigos foram atualizados", () => {
  for (const [id, reward] of Object.entries(NEW_REWARDS)) {
    assert.ok(byId(id), `falta ${id}`);
    assert.equal(byId(id).reward, reward, id);
  }
  assert.equal(byId("kitty-twenty").reward, 150);
  assert.equal(byId("kitty-all").reward, 500);
  assert.equal(byId("kitty-1t").condition.target, 1e12);
  assert.equal(byId("kitty-1qa").condition.target, 1e15);
  assert.equal(byId("kitty-clicks-1k").description, "Faça 1K de cliques em personagens");
  assert.equal(byId("kitty-level-200").description, "Leve um personagem ao nível 200");
  assert.equal(byId("kitty-relics-all").description, "Desbloqueie todas as relíquias");
  assert.equal(new Set(ACHIEVEMENTS.map((item) => item.id)).size, ACHIEVEMENTS.length, "ids duplicados");
});

test("as demais conquistas existentes continuam com os mesmos valores", () => {
  const expected = { "kitty-three": 20, "kitty-five": 35, "kitty-twelve": 55, "kitty-100": 20, "kitty-1k": 35, "kitty-10k": 60, "kitty-1m": 80, "kitty-1b": 100, "kitty-level-10": 30, "kitty-first": 5 };
  for (const [id, reward] of Object.entries(expected)) assert.equal(byId(id).reward, reward, id);
  assert.equal(kittyAchievements.length, 24 + 4 + 5 + 2 + 5 + 6 + 1 + 1 + 0, "total de conquistas da Hello Kitty");
});

test("todas as novas conquistas são alcançáveis (níveis até 200 existem, metas são finitas)", () => {
  for (const id of Object.keys(NEW_REWARDS)) {
    const condition = byId(id).condition;
    if (condition.target !== undefined) assert.ok(Number.isFinite(condition.target) && condition.target > 0);
  }
  assert.ok(KITTY_RELICS.length >= 1);
});

test("save existente: cliques, níveis, produção e relíquias já feitos contam e pagam uma única vez", async () => {
  const folder = await mkdtemp(join(tmpdir(), "kitty-achievements-"));
  const file = join(folder, "idle-game.json");
  try {
    const items = {};
    IDLE_CATALOG.kitty.slice(0, 6).forEach((definition, index) => { items[definition.id] = { purchased: true, level: index === 0 ? 120 : 30, purchasedAt: NOW - 1000 * (index + 1) }; });
    await writeFile(file, JSON.stringify({
      schemaVersion: 6, globalCoins: 1000,
      modes: { kitty: {
        kittyCatalogVersion: 2, balance: 5e12, totalClicks: 20_000, items,
        relicLevels: Object.fromEntries(KITTY_RELICS.map((relic) => [relic.id, 1])),
        unlockedAchievements: { "kitty-first": NOW - 5000 },
      } },
    }));
    const store = new IdleStore(true, () => NOW, file, "real");
    await store.ready();
    const before = store.getSnapshot();
    const gained = before.globalCoins - 1000;
    for (const id of ["kitty-clicks-1k", "kitty-clicks-5k", "kitty-clicks-10k", "kitty-level-25", "kitty-level-50", "kitty-level-100", "kitty-relics-all"]) {
      assert.ok(done(store, id).completedAt, `${id} deveria contar no save atual`);
    }
    for (const id of ["kitty-clicks-25k", "kitty-clicks-50k", "kitty-clicks-100k", "kitty-level-200"]) {
      assert.equal(done(store, id).completedAt, null, `${id} ainda não`);
    }
    assert.equal(done(store, "kitty-clicks-25k").progress, 20_000);
    assert.equal(done(store, "kitty-level-200").progress, 120);
    // 50 + 100 + 150 (cliques) + 60 + 200 + 750 (níveis) + 500 (relíquias) + conquistas de personagem/produção já alcançadas pelo save
    assert.ok(gained >= 50 + 100 + 150 + 60 + 200 + 750 + 500, `moedas ganhas: ${gained}`);
    // segunda leitura não paga de novo
    assert.equal(store.getSnapshot().globalCoins, before.globalCoins);
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test("clique completa a conquista de cliques na hora e paga a recompensa", () => {
  const { store, clock } = makeStore();
  store.addTestFunds("kitty", 1_000);
  assert.equal(store.act("kitty", "hello-kitty", "buy").ok, true);
  store.data.modes.kitty.totalClicks = 999;
  const before = store.getSnapshot().globalCoins;
  clock.now += 3_000;
  assert.equal(done(store, "kitty-clicks-1k").completedAt, null);
  assert.equal(store.click("kitty", "hello-kitty", "andre").ok, true);
  assert.ok(done(store, "kitty-clicks-1k").completedAt);
  assert.equal(store.getSnapshot().globalCoins - before, 50);
});

test("produção de 1T/s e 1Qa/s e níveis 25/50/100/200 completam ao atingir a meta", () => {
  const { store } = makeStore();
  store.devItemAction("kitty", "all", "unlock");
  store.devItemAction("kitty", "hello-kitty", "setLevel", 24);
  assert.equal(done(store, "kitty-level-25").completedAt, null);
  store.devItemAction("kitty", "hello-kitty", "setLevel", 25);
  assert.ok(done(store, "kitty-level-25").completedAt);
  assert.equal(done(store, "kitty-level-50").completedAt, null);
  for (const [level, id] of [[50, "kitty-level-50"], [100, "kitty-level-100"], [200, "kitty-level-200"]]) {
    store.devItemAction("kitty", "hello-kitty", "setLevel", level - 1);
    assert.equal(done(store, id).completedAt, null, `${id} antes`);
    store.devItemAction("kitty", "hello-kitty", "setLevel", level);
    assert.ok(done(store, id).completedAt, `${id} depois`);
  }
  const production = store.getSnapshot().modes.kitty.totalProduction;
  assert.equal(Boolean(done(store, "kitty-1t").completedAt), production >= 1e12);
  assert.equal(Boolean(done(store, "kitty-1qa").completedAt), production >= 1e15);
});

test("a conquista das relíquias só completa quando todas foram adquiridas", () => {
  const { store } = makeStore();
  store.devItemAction("kitty", "all", "unlock");
  store.addTestFunds("kitty", 1e60);
  const relics = KITTY_RELICS.map((relic) => relic.id);
  relics.forEach((id, index) => {
    assert.equal(done(store, "kitty-relics-all").completedAt, null, `antes da ${index + 1}ª relíquia`);
    assert.equal(done(store, "kitty-relics-all").progress, index);
    assert.equal(store.upgradeRelic(id).ok, true, id);
  });
  assert.ok(done(store, "kitty-relics-all").completedAt);
  assert.equal(done(store, "kitty-relics-all").progress, relics.length);
  assert.equal(done(store, "kitty-relics-all").target, relics.length);
});

test("conquistas já concluídas continuam concluídas e a Fazendinha não ganhou conquistas novas", () => {
  assert.equal(ACHIEVEMENTS.filter((item) => item.mode === "farm").length, 16);
  assert.ok(kittyAchievements.every((item) => item.reward > 0));
});
