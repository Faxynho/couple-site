const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtemp, rm, readFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { IdleStore } = require("../dist/idle/IdleStore.js");
const config = require("../dist/idle/kittyDevConfig.js");
const { IDLE_CATALOG } = require("../dist/idle/idleConfig.js");

const T0 = Date.parse("2026-10-05T12:00:00-03:00");

function devStore(now = () => T0) {
  return new IdleStore(false, now, "unused.json", "dev");
}
function realStore(now = () => T0) {
  return new IdleStore(false, now, "unused.json", "real");
}
/** Libera os N primeiros personagens com o nível indicado, direto pelo DEV helper. */
function unlock(store, count, level = 1) {
  for (let i = 0; i < count; i += 1) store.devItemAction("kitty", IDLE_CATALOG.kitty[i].id, "setLevel", level);
}

// ---------------------------------------------------------------------------
// O modo normal NÃO pode mudar
// ---------------------------------------------------------------------------
test("modo real: snapshot não expõe nada das mecânicas DEV e a produção é a original", () => {
  const store = realStore();
  store.devItemAction("kitty", "hello-kitty", "setLevel", 30);
  const snapshot = store.getSnapshot();
  assert.equal(snapshot.environment, "real");
  assert.equal(snapshot.modes.kitty.kittyDev, undefined);
  // produção do nível 30 sem multiplicadores: 2 * 1.27^29 (relíquias ainda no nível 0 => x1)
  assert.ok(Math.abs(snapshot.modes.kitty.items[0].production - 2 * Math.pow(1.27, 29)) < 1e-6);
  assert.equal(JSON.stringify(snapshot).includes("kittyDev"), false);
  assert.equal(JSON.stringify(snapshot).includes("starCosts"), false);
});

test("modo real: métodos DEV recusam executar e não alteram o save", () => {
  const store = realStore();
  unlock(store, 1, 40);
  const before = store.getSnapshot();
  for (const result of [
    store.buyKittyConstellation("hello-kitty"),
    store.buyKittyItem("hello-kitty", "click"),
    store.awakenKittyCharacter("hello-kitty"),
    store.setKittyLastWorld(2),
  ]) {
    assert.equal(result.ok, false);
    assert.match(result.error, /ambiente DEV/);
  }
  store.devKittyAction("addStones", "all", 999);
  const after = store.getSnapshot();
  assert.equal(after.modes.kitty.kittyDev, undefined);
  assert.equal(after.modes.kitty.balance, before.modes.kitty.balance);
  assert.equal(after.modes.kitty.totalProduction, before.modes.kitty.totalProduction);
});

test("modo real: o JSON salvo nunca recebe o campo dev", async () => {
  const dir = await mkdtemp(join(tmpdir(), "idle-real-"));
  try {
    const file = join(dir, "idle.json");
    const store = new IdleStore(true, () => T0, file, "real");
    await store.ready();
    store.devItemAction("kitty", "hello-kitty", "setLevel", 25);
    store.enterMode("kitty");
    await new Promise((resolve) => setTimeout(resolve, 900));
    const saved = JSON.parse(await readFile(file, "utf-8"));
    assert.equal("dev" in saved.modes.kitty, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Pedras Estelares
// ---------------------------------------------------------------------------
test("pedra estelar: escalonamento de 1 (iniciais) a 5 (finais) por marco de 10 níveis", () => {
  assert.equal(config.stoneYieldForIndex(0), 1);
  assert.equal(config.stoneYieldForIndex(4), 1);
  assert.equal(config.stoneYieldForIndex(5), 2);
  assert.equal(config.stoneYieldForIndex(14), 3);
  assert.equal(config.stoneYieldForIndex(19), 4);
  assert.equal(config.stoneYieldForIndex(23), 5);
  let previous = 0;
  for (let i = 0; i < 24; i += 1) {
    const yieldNow = config.stoneYieldForIndex(i);
    assert.ok(yieldNow >= previous, "o rendimento nunca diminui ao longo da campanha");
    previous = yieldNow;
  }
});

test("pedra estelar: paga a cada 10 níveis, só uma vez, e retroativamente ao desbloquear", () => {
  const store = devStore();
  store.devItemAction("kitty", "hello-kitty", "setLevel", 9);
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.stones, 0);
  store.devItemAction("kitty", "hello-kitty", "setLevel", 10);
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.stones, 1);
  // repetir o snapshot não paga de novo
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.stones, 1);
  store.devItemAction("kitty", "hello-kitty", "setLevel", 35);
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.stones, 3);
  // personagem final rende 5 por marco
  store.devItemAction("kitty", "little-twin-stars", "setLevel", 20);
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.stones, 3 + 10);
});

test("pedra estelar: melhorar pelo jogo (lote) também paga o marco", () => {
  const store = devStore();
  assert.equal(store.act("kitty", "hello-kitty", "buy").ok, true);
  store.addTestFunds("kitty", 1e15);
  const result = store.upgradeMany("kitty", "hello-kitty", 20);
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.modes.kitty.items[0].level, 21);
  assert.equal(result.snapshot.modes.kitty.kittyDev.stones, 2);
});

// ---------------------------------------------------------------------------
// Constelação / estrelas
// ---------------------------------------------------------------------------
test("constelação: compra níveis em ordem, gasta pedras e aplica os bônus de clique e produção", () => {
  const store = devStore();
  unlock(store, 1, 90); // nível alto o bastante para todos os requisitos
  store.devKittyAction("setStones", "all", 100);
  const base = store.getSnapshot().modes.kitty.items[0].production;
  const baseClick = store.click("kitty", "hello-kitty", "andre", { plain: true }).reward;

  let snapshot = store.getSnapshot();
  const stonesBefore = snapshot.modes.kitty.kittyDev.stones;
  const cost1 = snapshot.modes.kitty.kittyDev.characters["hello-kitty"].nextStarCost;
  assert.equal(cost1, config.constellationCost(0, 1));
  const first = store.buyKittyConstellation("hello-kitty");
  assert.equal(first.ok, true);
  snapshot = first.snapshot;
  assert.equal(snapshot.modes.kitty.kittyDev.stones, stonesBefore - cost1);
  assert.equal(snapshot.modes.kitty.kittyDev.characters["hello-kitty"].stars, 1);
  // nível 1: +25% clique, produção igual
  assert.ok(Math.abs(snapshot.modes.kitty.items[0].production - base) < 1e-9);
  const click1 = (() => { return snapshot.modes.kitty.kittyDev.characters["hello-kitty"].clickMultiplier; })();
  assert.ok(Math.abs(click1 - 1.25) < 1e-9);
  assert.ok(baseClick > 0);

  // nível 2: +15% produção
  const second = store.buyKittyConstellation("hello-kitty");
  assert.equal(second.ok, true);
  assert.ok(Math.abs(second.snapshot.modes.kitty.items[0].production - base * 1.15) < 1e-6);
});

test("constelação: completa com 5 estrelas, bloqueia o 6º nível e valida saldo de pedras", () => {
  const store = devStore();
  unlock(store, 1, 1);
  const poor = store.buyKittyConstellation("hello-kitty");
  assert.equal(poor.ok, false);
  assert.match(poor.error, /insuficientes/);
  store.devItemAction("kitty", "hello-kitty", "setLevel", 90);
  store.devKittyAction("setStones", "all", 1000);
  for (let level = 1; level <= 5; level += 1) assert.equal(store.buyKittyConstellation("hello-kitty").ok, true);
  const sixth = store.buyKittyConstellation("hello-kitty");
  assert.equal(sixth.ok, false);
  assert.match(sixth.error, /completa/);
  const snapshot = store.getSnapshot().modes.kitty.kittyDev.characters["hello-kitty"];
  assert.equal(snapshot.stars, 5);
  assert.equal(snapshot.nextStarCost, null);
  const total = [1, 2, 3, 4, 5].reduce((sum, level) => sum + config.constellationCost(0, level), 0);
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.stones, 1000 - total);
});

test("constelação: cada nível exige um nível mínimo do personagem", () => {
  const store = devStore();
  unlock(store, 1, 1);
  store.devKittyAction("setStones", "all", 500);
  const need1 = config.constellationLevelRequirement(0, 1);
  const blocked = store.buyKittyConstellation("hello-kitty");
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, new RegExp(`nível ${need1}`));
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.stones, 500, "não gasta pedras quando bloqueado");
  store.devItemAction("kitty", "hello-kitty", "setLevel", need1);
  assert.equal(store.buyKittyConstellation("hello-kitty").ok, true);
  const need2 = config.constellationLevelRequirement(0, 2);
  assert.ok(need2 > need1);
  assert.equal(store.buyKittyConstellation("hello-kitty").ok, false);
  const snapshot = store.getSnapshot().modes.kitty.kittyDev.characters["hello-kitty"];
  assert.deepEqual(snapshot.starRequirements, [1, 2, 3, 4, 5].map((level) => config.constellationLevelRequirement(0, level)));
  // personagens finais têm requisitos alcançáveis (nível 24 de referência)
  assert.ok(config.constellationLevelRequirement(23, 5) <= 24);
});

test("constelação: personagem não desbloqueado e id inválido são recusados", () => {
  const store = devStore();
  store.devKittyAction("addStones", "all", 100);
  assert.equal(store.buyKittyConstellation("kuromi").ok, false);
  assert.equal(store.buyKittyConstellation("nao-existe").ok, false);
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.stones, 100);
});

test("constelação: custo total de todas as constelações fica na faixa planejada (~390 pedras)", () => {
  let total = 0;
  for (let i = 0; i < 24; i += 1) for (let level = 1; level <= 5; level += 1) total += config.constellationCost(i, level);
  assert.ok(total > 330 && total < 450, `total=${total}`);
});

// ---------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------
test("itens: compra e melhoria com dinheiro interno, clique e pedras com os bônus certos", () => {
  const store = devStore();
  unlock(store, 1, 1);
  store.devKittyAction("addStones", "all", 0);
  const noMoney = store.buyKittyItem("hello-kitty", "click");
  assert.equal(noMoney.ok, false);
  assert.match(noMoney.error, /insuficiente/);

  store.changeBalance("kitty", "set", 1e18);
  const startBalance = store.getSnapshot().modes.kitty.balance;
  const bought = store.buyKittyItem("hello-kitty", "click");
  assert.equal(bought.ok, true);
  const cost = config.clickItemCost(0, 1);
  assert.ok(Math.abs(bought.snapshot.modes.kitty.balance - (startBalance - cost)) < 1);
  const item = bought.snapshot.modes.kitty.kittyDev.characters["hello-kitty"].clickItem;
  assert.equal(item.level, 1);
  assert.ok(Math.abs(item.multiplier - 1.35) < 1e-9);
  assert.equal(item.nextCost, config.clickItemCost(0, 2));

  const second = store.buyKittyItem("hello-kitty", "click");
  assert.equal(second.ok, true);
  assert.equal(second.snapshot.modes.kitty.kittyDev.characters["hello-kitty"].clickItem.level, 2);
});

test("itens: o item de clique aumenta de verdade a recompensa do clique do personagem", () => {
  const clicks = (itemLevels) => {
    let now = T0;
    const store = devStore(() => now);
    unlock(store, 1, 10);
    store.devKittyAction("addStones", "all", 0);
    store.changeBalance("kitty", "set", 1e30);
    for (let i = 0; i < itemLevels; i += 1) store.buyKittyItem("hello-kitty", "click");
    now += 1_000;
    return store.click("kitty", "hello-kitty", "andre", { plain: true }).reward;
  };
  const without = clicks(0);
  const withThree = clicks(3);
  assert.ok(Math.abs(withThree / without - (1 + 0.35 * 3)) < 0.02, `${withThree / without}`);
});

test("itens: o item estelar aumenta as pedras por marco com fração acumulada", () => {
  const store = devStore();
  store.devItemAction("kitty", "hello-kitty", "setLevel", 1);
  store.changeBalance("kitty", "set", 1e30);
  for (let i = 0; i < 4; i += 1) assert.equal(store.buyKittyItem("hello-kitty", "stone").ok, true); // x2.4
  const snapshot = store.getSnapshot().modes.kitty.kittyDev.characters["hello-kitty"];
  assert.ok(Math.abs(snapshot.stoneYieldEffective - 2.4) < 1e-9);
  // 5 marcos (nível 50) * 2.4 = 12 pedras exatas
  store.devItemAction("kitty", "hello-kitty", "setLevel", 50);
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.stones, 12);
});

test("itens: nível máximo é respeitado", () => {
  const store = devStore();
  unlock(store, 1, 1);
  store.changeBalance("kitty", "set", 1e40);
  for (let i = 0; i < config.CLICK_ITEM_MAX_LEVEL; i += 1) assert.equal(store.buyKittyItem("hello-kitty", "click").ok, true);
  const extra = store.buyKittyItem("hello-kitty", "click");
  assert.equal(extra.ok, false);
  assert.match(extra.error, /máximo/);
});

test("itens: preços crescem com o personagem e com o nível", () => {
  for (let i = 1; i < 24; i += 1) {
    assert.ok(config.clickItemCost(i, 1) > config.clickItemCost(i - 1, 1));
    assert.ok(config.stoneItemCost(i, 1) > config.stoneItemCost(i - 1, 1));
  }
  for (let level = 2; level <= 5; level += 1) assert.ok(config.stoneItemCost(3, level) > config.stoneItemCost(3, level - 1));
  assert.equal(config.KITTY_ITEM_NAMES.length, 24);
  assert.equal(new Set(config.KITTY_ITEM_NAMES.flatMap((names) => [names.click, names.stone])).size, 48);
});

// ---------------------------------------------------------------------------
// Despertar
// ---------------------------------------------------------------------------
test("despertar: exige 5 estrelas e dinheiro, multiplica produção e clique da Hello Kitty", () => {
  const store = devStore();
  unlock(store, 1, 90);
  store.changeBalance("kitty", "set", 1e30);
  const early = store.awakenKittyCharacter("hello-kitty");
  assert.equal(early.ok, false);
  assert.match(early.error, /constelação/);

  store.devKittyAction("setStones", "all", 1000);
  for (let level = 1; level <= 5; level += 1) assert.equal(store.buyKittyConstellation("hello-kitty").ok, true);
  const before = store.getSnapshot().modes.kitty;
  const beforeProduction = before.items[0].production;

  store.changeBalance("kitty", "set", config.AWAKENING_DEFINITIONS["hello-kitty"].cost * 0.5);
  const poor = store.awakenKittyCharacter("hello-kitty");
  assert.equal(poor.ok, false);
  assert.match(poor.error, /insuficiente/);

  store.changeBalance("kitty", "set", 1e30);
  const awake = store.awakenKittyCharacter("hello-kitty");
  assert.equal(awake.ok, true);
  const state = awake.snapshot.modes.kitty;
  assert.equal(state.kittyDev.characters["hello-kitty"].awakening.awakened, true);
  assert.ok(Math.abs(state.items[0].production / beforeProduction - config.AWAKENING_DEFINITIONS["hello-kitty"].multiplier) < 1e-3);
  assert.equal(config.AWAKENING_DEFINITIONS["hello-kitty"].multiplier, 1000);
  assert.equal(state.balance, 1e30 - config.AWAKENING_DEFINITIONS["hello-kitty"].cost);

  const again = store.awakenKittyCharacter("hello-kitty");
  assert.equal(again.ok, false);
  assert.match(again.error, /já despertou/);
});

test("despertar: personagens sem sprite despertado ainda não podem despertar", () => {
  const store = devStore();
  unlock(store, 4, 1);
  store.devKittyAction("addStones", "all", 1000);
  store.devKittyAction("maxStars", "dear-daniel");
  store.changeBalance("kitty", "set", 1e40);
  const result = store.awakenKittyCharacter("dear-daniel");
  assert.equal(result.ok, false);
  assert.match(result.error, /em breve/);
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.characters["dear-kitty"], undefined);
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.characters["dear-daniel"].awakening, null);
});

// ---------------------------------------------------------------------------
// Ilhas / último mundo
// ---------------------------------------------------------------------------
test("ilhas: só lembra uma ilha liberada e permite voltar para a seleção (null)", () => {
  const store = devStore();
  unlock(store, 5, 1); // P5 abre a ilha 2 (índice 1)
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.lastWorld, null);
  assert.equal(store.setKittyLastWorld(1).ok, true);
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.lastWorld, 1);
  const locked = store.setKittyLastWorld(3);
  assert.equal(locked.ok, false);
  assert.match(locked.error, /bloqueada/);
  assert.equal(store.setKittyLastWorld(9).ok, false);
  assert.equal(store.setKittyLastWorld(null).ok, true);
  assert.equal(store.getSnapshot().modes.kitty.kittyDev.lastWorld, null);
});

// ---------------------------------------------------------------------------
// Persistência
// ---------------------------------------------------------------------------
test("persistência DEV: estrelas, itens, pedras e ilha sobrevivem a reiniciar o servidor", async () => {
  const dir = await mkdtemp(join(tmpdir(), "idle-dev-"));
  try {
    const file = join(dir, "idle-dev.json");
    const first = new IdleStore(true, () => T0, file, "dev");
    await first.ready();
    unlock(first, 1, 60);
    first.devKittyAction("addStones", "all", 50);
    first.buyKittyConstellation("hello-kitty");
    first.changeBalance("kitty", "set", 1e20);
    first.buyKittyItem("hello-kitty", "stone");
    first.setKittyLastWorld(0);
    await new Promise((resolve) => setTimeout(resolve, 900));

    const second = new IdleStore(true, () => T0, file, "dev");
    await second.ready();
    const dev = second.getSnapshot().modes.kitty.kittyDev;
    assert.equal(dev.characters["hello-kitty"].stars, 1);
    assert.equal(dev.characters["hello-kitty"].stoneItem.level, 1);
    assert.equal(dev.lastWorld, 0);
    assert.ok(dev.stones > 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("persistência DEV: saves antigos sem o campo dev carregam normalmente e pagam as pedras retroativas", async () => {
  const dir = await mkdtemp(join(tmpdir(), "idle-dev-old-"));
  try {
    const file = join(dir, "idle-dev.json");
    // cria um save "antigo" com a loja REAL (sem campo dev) e abre como DEV
    const legacy = new IdleStore(true, () => T0, file, "real");
    await legacy.ready();
    legacy.devItemAction("kitty", "hello-kitty", "setLevel", 50);
    legacy.enterMode("kitty");
    await new Promise((resolve) => setTimeout(resolve, 900));
    const store = new IdleStore(true, () => T0, file, "dev");
    await store.ready();
    const snapshot = store.getSnapshot();
    assert.equal(snapshot.modes.kitty.items[0].level, 50);
    assert.equal(snapshot.modes.kitty.kittyDev.stones, 5);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("ferramentas DEV: reset geral e max de estrelas funcionam", () => {
  const store = devStore();
  unlock(store, 2, 1);
  store.devKittyAction("addStones", "all", 77);
  store.devKittyAction("maxStars", "all");
  const maxed = store.getSnapshot().modes.kitty.kittyDev;
  assert.equal(maxed.characters["hello-kitty"].stars, 5);
  store.devKittyAction("resetAll", "all");
  const reset = store.getSnapshot().modes.kitty.kittyDev;
  assert.equal(reset.stones, 0);
  assert.equal(reset.characters["hello-kitty"].stars, 0);
});
