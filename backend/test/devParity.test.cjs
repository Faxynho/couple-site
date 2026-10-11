const test = require("node:test");
const assert = require("node:assert/strict");

const { IdleStore } = require("../dist/idle/IdleStore.js");
const { EXPERIMENTAL_FEATURES, isExperimentalEnabled, experimentalFeaturesFor } = require("../dist/idle/experimental.js");
const { IDLE_CATALOG } = require("../dist/idle/idleConfig.js");

// Regra do projeto: o jogo normal ("real") e o DEV rodam o MESMO código, só com saves separados.
// Tudo que existe num existe no outro, EXCETO o que estiver registrado em src/idle/experimental.ts.
// Se este teste falhar sem você ter registrado nada lá, uma mudança vazou para só um dos lados.

const T0 = Date.parse("2026-10-11T12:00:00-03:00");
const seeded = () => { let seed = 7; return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; };
const make = (environment) => new IdleStore(false, () => T0, "unused.json", environment, seeded());

// Campos que SEMPRE diferem entre os ambientes (identidade do ambiente), não conteúdo.
const ENVIRONMENT_FIELDS = ["environment", "areaName", "experimentalFeatures"];
const content = (snapshot) => {
  const copy = JSON.parse(JSON.stringify(snapshot));
  for (const field of ENVIRONMENT_FIELDS) delete copy[field];
  return copy;
};

function playSame(store) {
  store.addTestFunds("farm", 1e9);
  store.addTestFunds("kitty", 1e9);
  for (const mode of ["farm", "kitty"]) {
    for (const item of store.getSnapshot().modes[mode].items.slice(0, 6)) store.act(mode, item.definition.id, "buy");
  }
  return store.getSnapshot();
}

test("jogo normal e DEV têm exatamente o mesmo conteúdo no começo", () => {
  assert.deepEqual(content(make("real").getSnapshot()), content(make("dev").getSnapshot()));
});

test("jogo normal e DEV reagem igual às mesmas ações (compras, produção, missões, conquistas)", () => {
  assert.deepEqual(content(playSame(make("real"))), content(playSame(make("dev"))));
});

test("catálogos e mecânicas Kitty existem nos dois ambientes (nada some do normal)", () => {
  for (const environment of ["real", "dev"]) {
    const kitty = make(environment).getSnapshot().modes.kitty;
    assert.equal(kitty.items.length, IDLE_CATALOG.kitty.length, environment);
    assert.ok(kitty.items.length >= 24, environment);
    assert.ok(kitty.items.every((item) => item.definition.id), environment);
  }
  const real = make("real").getSnapshot();
  assert.ok(real.modes.kitty.kittyDev, "constelações/despertar/estrelas valem no jogo normal");
});

test("recursos experimentais: só no DEV, e o jogo normal nunca recebe nenhum", () => {
  const registry = { "mundo-novo": { description: "teste" } };
  assert.equal(isExperimentalEnabled("mundo-novo", "dev", registry), true);
  assert.equal(isExperimentalEnabled("mundo-novo", "real", registry), false);
  assert.equal(isExperimentalEnabled("outro", "dev", registry), false);
  assert.deepEqual(experimentalFeaturesFor("dev", registry), ["mundo-novo"]);
  assert.deepEqual(experimentalFeaturesFor("real", registry), []);
  // O registro real: o jogo normal sempre sai vazio e o snapshot informa a lista de cada ambiente.
  assert.deepEqual(make("real").getSnapshot().experimentalFeatures, []);
  assert.deepEqual(make("dev").getSnapshot().experimentalFeatures, Object.keys(EXPERIMENTAL_FEATURES));
});

test("hoje não há nenhum recurso só-DEV registrado (todo o conteúdo do DEV já está liberado)", () => {
  // Ao registrar um recurso experimental, ATUALIZE este teste junto: é o aviso de que o DEV passou a divergir do normal.
  assert.deepEqual(Object.keys(EXPERIMENTAL_FEATURES), []);
});
