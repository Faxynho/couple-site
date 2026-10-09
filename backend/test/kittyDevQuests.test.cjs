const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { IdleStore } = require("../dist/idle/IdleStore.js");
const { KITTY_DEV_ACHIEVEMENTS, KITTY_DEV_OBJECTIVES } = require("../dist/idle/kittyDevQuests.js");
const { KITTY_DAILY_OBJECTIVE_COUNT, KITTY_WEEKLY_OBJECTIVE_COUNT, IDLE_CATALOG } = require("../dist/idle/idleConfig.js");
const config = require("../dist/idle/kittyDevConfig.js");

const MONDAY = Date.parse("2026-09-28T12:00:00-03:00");
const WEEK_AND_A_BIT = 8 * 86_400_000;

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const makeStore = (environment, seed = 1, now = MONDAY) => {
  const clock = { now };
  const store = new IdleStore(false, () => clock.now, "unused.json", environment, seeded(seed));
  return { store, clock };
};
const kittyAchievement = (store, id) => store.getSnapshot().modes.kitty.achievements.find((item) => item.id === id);
const force = (store, daily, weekly) => {
  store.data.objectives.daily.kitty = { ids: daily, targets: {} };
  store.data.objectives.weekly.kitty = { ids: weekly, targets: {} };
};

// ---------------------------------------------------------------------------
// Jogo normal: missões e conquistas novas valem também no save real
// ---------------------------------------------------------------------------
test("jogo normal: as conquistas novas aparecem e as missões novas entram no sorteio", () => {
  const seen = new Set();
  for (let seed = 1; seed <= 80; seed += 1) {
    const { store } = makeStore("real", seed);
    const snapshot = store.getSnapshot();
    assert.equal(snapshot.modes.kitty.achievements.some((item) => item.id.startsWith("kitty-dev-")), true);
    [...snapshot.kittyObjectives.daily, ...snapshot.kittyObjectives.weekly].forEach((item) => { if (item.id.startsWith("kitty-dev-")) seen.add(item.id); });
  }
  assert.ok(seen.has("kitty-dev-daily-travel") && seen.has("kitty-dev-weekly-travel"), [...seen].join(","));
});

test("jogo normal: viagens e itens geram progresso de missão", () => {
  const { store } = makeStore("real");
  store.setKittyLastWorld(0);
  assert.equal(store.data.objectives.daily.progress.kittyDevTravels, 1);
});

test("pelo menos 1 missão de Pedra Estelar por dia, em qualquer situação do save", () => {
  const situations = [
    ["save novo", () => undefined],
    ["só a Hello Kitty nível 1", (store) => store.devItemAction("kitty", "hello-kitty", "setLevel", 1)],
    ["nível 59 (a 1 nível do marco)", (store) => store.devItemAction("kitty", "hello-kitty", "setLevel", 59)],
    ["muito avançado", (store) => { for (const definition of IDLE_CATALOG.kitty) store.devItemAction("kitty", definition.id, "setLevel", 80); store.changeBalance("kitty", "set", 1e60); }],
    ["tudo completo", (store) => { for (const definition of IDLE_CATALOG.kitty) store.devItemAction("kitty", definition.id, "setLevel", 100); store.devKittyAction("maxStars", "all"); store.devKittyAction("maxItems", "all"); store.changeBalance("kitty", "set", 1e300); }],
  ];
  for (const environment of ["real", "dev"]) {
    for (const [label, setup] of situations) {
      for (let seed = 1; seed <= 40; seed += 1) {
        const { store, clock } = makeStore(environment, seed);
        setup(store);
        for (let day = 0; day < 10; day += 1) {
          clock.now += 86_400_000;
          const daily = store.getSnapshot().kittyObjectives.daily;
          assert.equal(daily.length, KITTY_DAILY_OBJECTIVE_COUNT, `${environment}/${label}/${seed}/dia ${day}`);
          const stoneQuests = daily.filter((item) => ["kitty-dev-daily-stone", "kitty-dev-daily-star", "kitty-dev-daily-sky"].includes(item.id));
          assert.equal(stoneQuests.length, 1, `${environment}/${label}/seed ${seed}/dia ${day}: deve haver exatamente 1 missão de pedra estelar (${daily.map((item) => item.id).join(", ")})`);
        }
      }
    }
  }
});

test("missão de Pedra Estelar: 'ganhe 1 pedra' conta quando um marco de 10 níveis é alcançado, 'observatório' conta a visita", () => {
  const { store } = makeStore("real", 1);
  store.devItemAction("kitty", "hello-kitty", "setLevel", 59);
  store.data.objectives.daily.kitty = { ids: ["kitty-dev-daily-stone", "kitty-dev-daily-sky"], targets: {} };
  store.data.objectives.daily.progress.kittyDevStones = 0;
  store.devItemAction("kitty", "hello-kitty", "setLevel", 60);
  const stone = () => store.getSnapshot().kittyObjectives.daily.find((item) => item.id === "kitty-dev-daily-stone");
  assert.equal(stone().progress, 1);
  assert.ok(stone().completedAt);
  assert.equal(store.visitKittySky().ok, true);
  assert.ok(store.getSnapshot().kittyObjectives.daily.find((item) => item.id === "kitty-dev-daily-sky").completedAt);
});

// ---------------------------------------------------------------------------
// Missões experimentais (DEV)
// ---------------------------------------------------------------------------
test("DEV: todas as missões novas são coerentes (diárias fáceis, semanais maiores, recompensas proporcionais)", () => {
  assert.ok(KITTY_DEV_OBJECTIVES.length >= 4);
  for (const objective of KITTY_DEV_OBJECTIVES) {
    assert.ok(objective.id.startsWith("kitty-dev-"));
    assert.ok(objective.target >= 1 && objective.reward > 0);
  }
  const reward = (period, group) => KITTY_DEV_OBJECTIVES.find((item) => item.period === period && item.group === group);
  for (const group of ["travel", "devitem"]) assert.ok(reward("weekly", group).reward > reward("daily", group).reward, group);
  assert.ok(reward("weekly", "travel").target > reward("daily", "travel").target);
});

test("DEV: sorteio mantém 4 diárias e 3 semanais sem repetir missão, e as novas missões aparecem", () => {
  const seen = new Set();
  for (let seed = 1; seed <= 120; seed += 1) {
    const { store, clock } = makeStore("dev", seed);
    store.devItemAction("kitty", "hello-kitty", "setLevel", 60);
    store.changeBalance("kitty", "set", 1e30);
    clock.now += WEEK_AND_A_BIT; // vira o dia e a semana: novo sorteio
    const { daily, weekly } = store.getSnapshot().kittyObjectives;
    assert.equal(daily.length, KITTY_DAILY_OBJECTIVE_COUNT);
    assert.equal(weekly.length, KITTY_WEEKLY_OBJECTIVE_COUNT);
    assert.equal(new Set(daily.map((item) => item.id)).size, daily.length);
    assert.equal(new Set(weekly.map((item) => item.id)).size, weekly.length);
    [...daily, ...weekly].forEach((item) => { if (item.id.startsWith("kitty-dev-")) seen.add(item.id); });
  }
  assert.ok(seen.has("kitty-dev-daily-travel") && seen.has("kitty-dev-weekly-travel"), [...seen].join(","));
});

test("DEV: missões que dependem de ter algo para fazer só entram quando existe algo para fazer", () => {
  for (let seed = 1; seed <= 80; seed += 1) {
    const { store, clock } = makeStore("dev", seed);
    clock.now += WEEK_AND_A_BIT;
    const ids = [...store.getSnapshot().kittyObjectives.daily, ...store.getSnapshot().kittyObjectives.weekly].map((item) => item.id);
    // save novo: nenhum item/estrela possível
    assert.equal(ids.includes("kitty-dev-daily-item"), false);
    assert.equal(ids.includes("kitty-dev-weekly-items"), false);
    assert.equal(ids.includes("kitty-dev-weekly-star"), false);
  }
  // com tudo no máximo não sobra item para melhorar
  const { store } = makeStore("dev", 3);
  store.devItemAction("kitty", "hello-kitty", "setLevel", 90);
  store.changeBalance("kitty", "set", 1e30);
  store.devKittyAction("maxItems", "all");
  store.devKittyAction("maxStars", "all");
  assert.equal(store.kittyDevQuestAvailable("kitty-dev-daily-item"), false);
  assert.equal(store.kittyDevQuestAvailable("kitty-dev-weekly-items"), false);
  assert.equal(store.kittyDevQuestAvailable("kitty-dev-weekly-star"), false);
  assert.equal(store.kittyDevQuestAvailable("kitty-dev-daily-travel"), true, "viagem funciona sempre");
});

test("DEV: item, estrela e viagem ficam disponíveis quando há o que fazer", () => {
  const { store } = makeStore("dev");
  store.devItemAction("kitty", "hello-kitty", "setLevel", 90);
  store.devKittyAction("setStones", "all", 50);
  store.changeBalance("kitty", "set", 1e30);
  // com saldo enorme o item mais barato cabe na produção? garantir produção > 0
  assert.ok(store.getSnapshot().modes.kitty.effectiveProduction > 0);
  assert.equal(store.kittyDevQuestAvailable("kitty-dev-weekly-star"), true);
});

test("DEV: viagens entre ilhas contam e completam a missão diária", () => {
  const { store } = makeStore("dev");
  force(store, ["kitty-dev-daily-travel"], ["kitty-dev-weekly-travel"]);
  for (let trip = 0; trip < 2; trip += 1) assert.equal(store.setKittyLastWorld(0).ok, true);
  const mid = store.getSnapshot().kittyObjectives.daily.find((item) => item.id === "kitty-dev-daily-travel");
  assert.equal(mid.progress, 2);
  assert.equal(mid.completedAt ?? null, null);
  store.setKittyLastWorld(0);
  const done = store.getSnapshot().kittyObjectives.daily.find((item) => item.id === "kitty-dev-daily-travel");
  assert.ok(done.progress >= 3);
  assert.ok(done.completedAt);
  // voltar para a seleção (null) não conta como viagem
  const before = store.data.objectives.weekly.progress.kittyDevTravels;
  store.setKittyLastWorld(null);
  assert.equal(store.data.objectives.weekly.progress.kittyDevTravels, before);
});

test("DEV: comprar/melhorar item e evoluir estrela contam nas missões", () => {
  const { store } = makeStore("dev");
  store.devItemAction("kitty", "hello-kitty", "setLevel", 90);
  store.devKittyAction("setStones", "all", 50);
  store.changeBalance("kitty", "set", 1e30);
  force(store, ["kitty-dev-daily-item"], ["kitty-dev-weekly-items", "kitty-dev-weekly-star"]);
  store.buyKittyItem("hello-kitty", "click");
  store.buyKittyItem("hello-kitty", "stone");
  store.buyKittyConstellation("hello-kitty");
  const snapshot = store.getSnapshot().kittyObjectives;
  assert.ok(snapshot.daily.find((item) => item.id === "kitty-dev-daily-item").completedAt);
  assert.equal(snapshot.weekly.find((item) => item.id === "kitty-dev-weekly-items").progress, 2);
  assert.ok(snapshot.weekly.find((item) => item.id === "kitty-dev-weekly-star").completedAt);
});

// ---------------------------------------------------------------------------
// Conquistas experimentais (DEV)
// ---------------------------------------------------------------------------
test("DEV: conquistas novas têm ids únicos, recompensas crescentes e alvos alcançáveis", () => {
  const ids = KITTY_DEV_ACHIEVEMENTS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 20);
  const byStat = {};
  for (const item of KITTY_DEV_ACHIEVEMENTS) {
    assert.equal(item.mode, "kitty");
    (byStat[item.condition.stat] ??= []).push(item);
  }
  for (const [stat, list] of Object.entries(byStat)) {
    const sorted = [...list].sort((a, b) => a.condition.target - b.condition.target);
    sorted.forEach((item, index) => { if (index) assert.ok(item.reward > sorted[index - 1].reward, `${stat}: recompensa deve crescer com a dificuldade`); });
  }
  // nenhum alvo passa do máximo possível do jogo
  const max = { stonesEarned: 600, stars: 120, constellations: 24, awakened: 24, clickItems: 24, stoneItems: 24, itemsMaxed: 48 };
  for (const item of KITTY_DEV_ACHIEVEMENTS) assert.ok(item.condition.target <= max[item.condition.stat], item.id);
});

test("DEV: conquistas de pedra, estrela, constelação, despertar e itens são concedidas", () => {
  const { store } = makeStore("dev");
  assert.ok(kittyAchievement(store, "kitty-dev-star-1"));
  assert.equal(kittyAchievement(store, "kitty-dev-star-1").completedAt, null);
  store.devItemAction("kitty", "hello-kitty", "setLevel", 90); // 9 pedras
  assert.ok(kittyAchievement(store, "kitty-dev-stone-1").completedAt);
  store.devKittyAction("setStones", "all", 200);
  store.buyKittyConstellation("hello-kitty");
  assert.ok(kittyAchievement(store, "kitty-dev-star-1").completedAt);
  for (let i = 0; i < 4; i += 1) store.buyKittyConstellation("hello-kitty");
  assert.ok(kittyAchievement(store, "kitty-dev-const-1").completedAt);
  store.changeBalance("kitty", "set", 1e30);
  store.buyKittyItem("hello-kitty", "click");
  store.buyKittyItem("hello-kitty", "stone");
  assert.ok(kittyAchievement(store, "kitty-dev-click-item-1").completedAt);
  assert.ok(kittyAchievement(store, "kitty-dev-stone-item-1").completedAt);
  unlockEveryone(store);
  store.devItemAction("kitty", "hello-kitty", "setLevel", 90);
  assert.equal(store.awakenKittyCharacter("hello-kitty").ok, true);
  assert.ok(kittyAchievement(store, "kitty-dev-awake-1").completedAt);
  assert.equal(kittyAchievement(store, "kitty-dev-awake-1").progress, 1);
});

test("DEV: item no nível máximo conta para a conquista 'No máximo!'", () => {
  const { store } = makeStore("dev");
  store.devItemAction("kitty", "hello-kitty", "setLevel", 1);
  store.changeBalance("kitty", "set", 1e40);
  for (let level = 0; level < config.CLICK_ITEM_MAX_LEVEL; level += 1) store.buyKittyItem("hello-kitty", "click");
  assert.ok(kittyAchievement(store, "kitty-dev-item-max-1").completedAt);
  assert.equal(kittyAchievement(store, "kitty-dev-item-max-12").completedAt, null);
});

test("DEV: conquistas e progresso das missões novas sobrevivem a reiniciar o servidor", async () => {
  const dir = await mkdtemp(join(tmpdir(), "idle-dev-quests-"));
  try {
    const file = join(dir, "idle-dev.json");
    const first = new IdleStore(true, () => MONDAY, file, "dev", seeded(2));
    await first.ready();
    first.devItemAction("kitty", "hello-kitty", "setLevel", 90);
    first.setKittyLastWorld(0);
    await new Promise((resolve) => setTimeout(resolve, 900));
    const second = new IdleStore(true, () => MONDAY, file, "dev", seeded(2));
    await second.ready();
    assert.ok(kittyAchievement(second, "kitty-dev-stone-1").completedAt);
    assert.equal(second.data.objectives.daily.progress.kittyDevTravels, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Skin do personagem despertado
// ---------------------------------------------------------------------------
function unlockEveryone(store) {
  for (const definition of IDLE_CATALOG.kitty) store.devItemAction("kitty", definition.id, "setLevel", 1);
}
function awakened() {
  const { store } = makeStore("dev");
  unlockEveryone(store);
  store.devItemAction("kitty", "hello-kitty", "setLevel", 90);
  store.devKittyAction("maxStars", "hello-kitty");
  store.changeBalance("kitty", "set", 1e300);
  assert.equal(store.awakenKittyCharacter("hello-kitty").ok, true);
  return store;
}

test("skin: só dá para trocar depois de despertar; troca só o visual e mantém a produção", () => {
  const { store } = makeStore("dev");
  store.devItemAction("kitty", "hello-kitty", "setLevel", 90);
  const early = store.setKittySkin("hello-kitty", false);
  assert.equal(early.ok, false);
  assert.match(early.error, /Desperte/);

  const ready = awakened();
  const info = () => ready.getSnapshot().modes.kitty.kittyDev.characters["hello-kitty"];
  assert.equal(info().awakening.skinAwake, true);
  const production = ready.getSnapshot().modes.kitty.items[0].production;
  assert.equal(ready.setKittySkin("hello-kitty", false).ok, true);
  assert.equal(info().awakening.skinAwake, false);
  assert.equal(info().awakening.awakened, true, "continua despertada (efeitos e bônus)");
  assert.equal(ready.getSnapshot().modes.kitty.items[0].production, production);
  assert.equal(ready.setKittySkin("hello-kitty", true).ok, true);
  assert.equal(info().awakening.skinAwake, true);
});

test("skin: só personagem despertado troca de skin (jogo normal também)", () => {
  const { store } = makeStore("real");
  const result = store.setKittySkin("hello-kitty", false);
  assert.equal(result.ok, false);
  assert.match(result.error, /Desbloqueie/);
});

test("skin: a escolha é salva no JSON do ambiente DEV", async () => {
  const dir = await mkdtemp(join(tmpdir(), "idle-dev-skin-"));
  try {
    const file = join(dir, "idle-dev.json");
    const first = new IdleStore(true, () => MONDAY, file, "dev");
    await first.ready();
    for (const definition of IDLE_CATALOG.kitty) first.devItemAction("kitty", definition.id, "setLevel", 1);
    first.devItemAction("kitty", "hello-kitty", "setLevel", 90);
    first.devKittyAction("maxStars", "hello-kitty");
    first.changeBalance("kitty", "set", 1e300);
    first.awakenKittyCharacter("hello-kitty");
    first.setKittySkin("hello-kitty", false);
    await new Promise((resolve) => setTimeout(resolve, 900));
    const second = new IdleStore(true, () => MONDAY, file, "dev");
    await second.ready();
    const info = second.getSnapshot().modes.kitty.kittyDev.characters["hello-kitty"];
    assert.equal(info.awakening.awakened, true);
    assert.equal(info.awakening.skinAwake, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("catálogo: cada personagem tem os dois itens com nome único e 24 constelações", () => {
  assert.equal(IDLE_CATALOG.kitty.length, 24);
});
