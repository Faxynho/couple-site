const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtemp, rm, readFile, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { IdleStore } = require("../dist/idle/IdleStore.js");
const { pickKittyObjectives } = require("../dist/idle/kittyObjectives.js");
const { kittyDevObjectiveById } = require("../dist/idle/kittyDevQuests.js");
const {
  KITTY_OBJECTIVE_POOL,
  KITTY_DAILY_OBJECTIVE_COUNT,
  KITTY_WEEKLY_OBJECTIVE_COUNT,
  RENEWABLE_OBJECTIVES,
  scaledObjectiveTarget,
  kittyObjectiveById,
} = require("../dist/idle/idleConfig.js");

const DAY = 86_400_000;
const MONDAY = Date.parse("2026-09-28T12:00:00-03:00");
const SATURDAY = Date.parse("2026-09-26T12:00:00-03:00");

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

function makeStore(now, seed = 1) {
  const clock = { now };
  const store = new IdleStore(false, () => clock.now, undefined, "real", seeded(seed));
  return { store, clock };
}

function forceSelection(store, daily, weekly, targets = {}) {
  store.data.objectives.daily.kitty = { ids: daily, targets: { ...targets } };
  store.data.objectives.weekly.kitty = { ids: weekly, targets: { ...targets } };
}

test("o Mundo da Hello Kitty mostra 4 diárias e 3 semanais de grupos diferentes, todas do pool", () => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const { store } = makeStore(MONDAY, seed);
    const { daily, weekly } = store.getSnapshot().kittyObjectives;
    assert.equal(daily.length, KITTY_DAILY_OBJECTIVE_COUNT);
    assert.equal(weekly.length, KITTY_WEEKLY_OBJECTIVE_COUNT);
    for (const [list, period] of [[daily, "daily"], [weekly, "weekly"]]) {
      assert.equal(new Set(list.map((item) => item.id)).size, list.length);
      const groups = list.map((item) => (kittyObjectiveById(item.id) ?? kittyDevObjectiveById(item.id)).group);
      assert.equal(new Set(groups).size, groups.length, `grupos repetidos (${period}, seed ${seed})`);
      assert.ok(list.every((item) => item.period === period));
      assert.ok(list.every((item) => item.periodEndsAt > MONDAY));
    }
  }
});

test("as missões mudam de um dia para o outro e de uma semana para a outra", () => {
  const { store, clock } = makeStore(MONDAY, 7);
  const dailySets = new Set();
  for (let day = 0; day < 14; day += 1) {
    const snapshot = store.getSnapshot();
    const ids = snapshot.kittyObjectives.daily.map((item) => item.id);
    assert.equal(ids.length, 4);
    dailySets.add([...ids].sort().join("|"));
    clock.now += DAY;
  }
  assert.ok(dailySets.size >= 8, `pouca variedade nas diárias: ${dailySets.size} combinações em 14 dias`);

  const weeklySets = new Set();
  for (let week = 0; week < 8; week += 1) {
    weeklySets.add(store.getSnapshot().kittyObjectives.weekly.map((item) => item.id).sort().join("|"));
    clock.now += 7 * DAY;
  }
  assert.ok(weeklySets.size >= 4, `pouca variedade nas semanais: ${weeklySets.size} combinações em 8 semanas`);
});

test("o sorteio fica fixo durante o período", () => {
  const { store, clock } = makeStore(MONDAY, 3);
  const first = store.getSnapshot().kittyObjectives;
  clock.now += 6 * 60 * 60 * 1_000; // mesmo dia (12h → 18h)
  const second = store.getSnapshot().kittyObjectives;
  assert.deepEqual(second.daily.map((item) => item.id), first.daily.map((item) => item.id));
  assert.deepEqual(second.weekly.map((item) => item.id), first.weekly.map((item) => item.id));
});

test("missão de visitar em dias diferentes só entra quando ainda cabem 3 dias na semana", () => {
  const random = seeded(99);
  for (let run = 0; run < 400; run += 1) {
    assert.ok(!pickKittyObjectives("weekly", 3, { random, daysLeft: 2 }).includes("kitty-weekly-days"));
  }
  let appeared = false;
  for (let run = 0; run < 400; run += 1) appeared ||= pickKittyObjectives("weekly", 3, { random, daysLeft: 7 }).includes("kitty-weekly-days");
  assert.ok(appeared);

  // No sábado só restam sábado e domingo: a missão nunca pode ser sorteada para a semana.
  for (let seed = 1; seed <= 80; seed += 1) {
    const { store } = makeStore(SATURDAY, seed);
    assert.ok(!store.getSnapshot().kittyObjectives.weekly.some((item) => item.id === "kitty-weekly-days"));
  }
});

test("nenhuma missão do pool depende de algo finito, como desbloquear personagens", () => {
  const allowed = new Set(["farmEntries", "kittyEntries", "upgrades", "kittyUpgrades", "earnings", "kittyEarnings", "minigames", "kittyClicks", "kittyEvents", "kittyBoosts", "kittyBestCombo", "kittyMilestones", "kittyDays"]);
  for (const objective of KITTY_OBJECTIVE_POOL) {
    assert.ok(allowed.has(objective.metric), `${objective.id} usa métrica inesperada ${objective.metric}`);
    assert.ok(Number.isFinite(objective.target) && objective.target > 0 && objective.reward > 0);
    assert.doesNotMatch(`${objective.title} ${objective.description}`, /desbloque|personagem|relíquia/i);
  }
  assert.ok(KITTY_OBJECTIVE_POOL.filter((item) => item.period === "daily").length >= 8);
  assert.ok(KITTY_OBJECTIVE_POOL.filter((item) => item.period === "weekly").length >= 8);
  // diárias são mais leves do que semanais em recompensa média
  const average = (period) => {
    const list = KITTY_OBJECTIVE_POOL.filter((item) => item.period === period);
    return list.reduce((sum, item) => sum + item.reward, 0) / list.length;
  };
  assert.ok(average("weekly") > average("daily") * 2);
});

test("as missões antigas permanecem iguais no pool (só a de dinheiro interno foi substituída)", () => {
  for (const id of ["daily-farm-entry", "daily-kitty-entry", "daily-upgrades", "daily-minigame", "weekly-upgrades", "weekly-minigames"]) {
    const original = RENEWABLE_OBJECTIVES.find((item) => item.id === id);
    const inPool = kittyObjectiveById(id);
    for (const key of ["title", "description", "metric", "target", "reward", "period"]) assert.equal(inPool[key], original[key], `${id}.${key}`);
  }
  assert.equal(kittyObjectiveById("daily-earnings"), undefined);
  assert.equal(kittyObjectiveById("weekly-earnings"), undefined);
});

test("a Fazendinha continua com a lista fixa original de objetivos", () => {
  const { store } = makeStore(MONDAY);
  const { daily, weekly } = store.getSnapshot().objectives;
  assert.deepEqual(daily.map((item) => item.id), ["daily-farm-entry", "daily-kitty-entry", "daily-upgrades", "daily-earnings", "daily-minigame"]);
  assert.deepEqual(weekly.map((item) => item.id), ["weekly-upgrades", "weekly-earnings", "weekly-minigames"]);
  assert.equal(daily.find((item) => item.id === "daily-earnings").target, 5_000);
  assert.equal(weekly.find((item) => item.id === "weekly-earnings").target, 500_000);
});

test("meta de dinheiro interno acompanha a produção: diária mais leve, semanal mais pesada", () => {
  const daily = kittyObjectiveById("kitty-daily-earnings");
  const weekly = kittyObjectiveById("kitty-weekly-earnings");
  assert.equal(scaledObjectiveTarget(daily, 0), 600);
  assert.equal(scaledObjectiveTarget(weekly, 0), 20_000);
  assert.equal(scaledObjectiveTarget(daily, 1e9), 1.2e12); // 20 min × 1B/s
  assert.equal(scaledObjectiveTarget(weekly, 1e9), 1.3e14); // 36 h × 1B/s = 1,296e14 → 2 algarismos
  for (const production of [3, 47, 1e3, 5.5e6, 8e12, 1e20]) {
    const dailyTarget = scaledObjectiveTarget(daily, production);
    const weeklyTarget = scaledObjectiveTarget(weekly, production);
    assert.ok(weeklyTarget > dailyTarget * 90, `semanal deve ser bem mais difícil (produção ${production})`);
    assert.ok(dailyTarget >= production * 20 * 60, "arredonda para cima, nunca facilita além do combinado");
    assert.ok(dailyTarget <= production * 20 * 60 * 1.1 || dailyTarget === 600);
  }
});

test("a meta é calculada com a produção do início do período e não muda durante ele", () => {
  let found = null;
  for (let seed = 1; seed <= 400 && !found; seed += 1) {
    const { store, clock } = makeStore(MONDAY, seed);
    store.devItemAction("kitty", "all", "unlock");
    clock.now += 7 * DAY; // nova semana e novo dia, agora com produção alta
    const { daily, weekly } = store.getSnapshot().kittyObjectives;
    if (daily.some((item) => item.id === "kitty-daily-earnings") && weekly.some((item) => item.id === "kitty-weekly-earnings")) found = { store, clock };
  }
  assert.ok(found, "nenhuma seed sorteou as duas missões de dinheiro interno");
  const { store, clock } = found;
  const first = store.getSnapshot();
  const production = first.modes.kitty.totalProduction;
  const dailyEarn = first.kittyObjectives.daily.find((item) => item.id === "kitty-daily-earnings");
  const weeklyEarn = first.kittyObjectives.weekly.find((item) => item.id === "kitty-weekly-earnings");
  assert.equal(dailyEarn.target, scaledObjectiveTarget(kittyObjectiveById("kitty-daily-earnings"), production));
  assert.equal(weeklyEarn.target, scaledObjectiveTarget(kittyObjectiveById("kitty-weekly-earnings"), production));
  assert.ok(dailyEarn.target > 600 && weeklyEarn.target > dailyEarn.target);
  assert.match(dailyEarn.description, /^Ganhe .+ de dinheiro interno$/);
  assert.equal(dailyEarn.metric, "kittyEarnings");

  store.devItemAction("kitty", "all", "setLevel", 50); // produção explode durante o período
  const later = store.getSnapshot();
  assert.equal(later.kittyObjectives.daily.find((item) => item.id === "kitty-daily-earnings").target, dailyEarn.target);
  assert.equal(later.kittyObjectives.weekly.find((item) => item.id === "kitty-weekly-earnings").target, weeklyEarn.target);

  clock.now += DAY; // dia seguinte: nova meta, agora proporcional à nova produção
  const next = store.getSnapshot().kittyObjectives.daily.find((item) => item.id === "kitty-daily-earnings");
  if (next) assert.ok(next.target > dailyEarn.target * 10);
});

test("a missão de dinheiro interno completa ao ganhar a meta e paga uma única vez", () => {
  const { store } = makeStore(MONDAY);
  forceSelection(store, ["kitty-daily-earnings", "kitty-daily-clicks", "kitty-daily-events", "kitty-daily-combo"], ["kitty-weekly-earnings", "kitty-weekly-clicks", "kitty-weekly-events"], {
    "kitty-daily-earnings": 600, "kitty-weekly-earnings": 20_000,
  });
  store.addTestFunds("kitty", 1_000);
  assert.equal(store.act("kitty", "hello-kitty", "buy").ok, true);
  const coinsBefore = store.getSnapshot().globalCoins;
  // 1 ponto de produção por segundo não basta; simula 10 minutos online.
  store.data.modes.kitty.lastSettledAt -= 10 * 60 * 1_000;
  store.enterMode("kitty");
  const earned = store.getSnapshot().kittyObjectives.daily.find((item) => item.id === "kitty-daily-earnings");
  assert.ok(earned.progress >= 600, `progresso ${earned.progress}`);
  assert.ok(earned.completedAt);
  const coinsAfter = store.getSnapshot().globalCoins;
  // +15 da missão de dinheiro interno e +5 da entrada diária no mundo (missão antiga, inalterada); nada repetido.
  assert.equal(coinsAfter - coinsBefore, 15 + 5);
  store.enterMode("kitty");
  assert.equal(store.getSnapshot().globalCoins, coinsAfter);
  // a meta fixa antiga (5K) não anda mais com o dinheiro da Hello Kitty: ela agora é só da Fazendinha
  assert.equal(store.getSnapshot().objectives.daily.find((item) => item.id === "daily-earnings").progress, 0);
});

test("toques, combo, sequência, eventos e turbos contam nas missões do Mundo da Hello Kitty", () => {
  const { store, clock } = makeStore(MONDAY);
  forceSelection(
    store,
    ["kitty-daily-clicks", "kitty-daily-combo", "kitty-daily-events", "kitty-daily-boost"],
    ["kitty-weekly-clicks", "kitty-weekly-milestones", "kitty-weekly-boosts"],
  );
  store.addTestFunds("kitty", 1_000);
  assert.equal(store.act("kitty", "hello-kitty", "buy").ok, true);
  const base = store.getSnapshot().globalCoins;

  const find = (list, id) => list.find((item) => item.id === id);
  for (let tap = 1; tap <= 150; tap += 1) {
    clock.now += 200;
    assert.equal(store.click("kitty", "hello-kitty", "andre").ok, true);
    const snapshot = store.getSnapshot();
    if (tap === 14) assert.equal(find(snapshot.kittyObjectives.daily, "kitty-daily-combo").completedAt, null);
    if (tap === 15) assert.ok(find(snapshot.kittyObjectives.daily, "kitty-daily-combo").completedAt, "combo de 15 deve completar");
    if (tap === 59) assert.equal(find(snapshot.kittyObjectives.daily, "kitty-daily-clicks").completedAt, null);
    if (tap === 60) assert.ok(find(snapshot.kittyObjectives.daily, "kitty-daily-clicks").completedAt);
    if (tap === 149) assert.equal(find(snapshot.kittyObjectives.weekly, "kitty-weekly-milestones").completedAt, null);
  }
  let snapshot = store.getSnapshot();
  assert.equal(find(snapshot.kittyObjectives.weekly, "kitty-weekly-milestones").progress, 3, "150 toques seguidos = 3 marcos de 50");
  assert.ok(find(snapshot.kittyObjectives.weekly, "kitty-weekly-milestones").completedAt);
  assert.equal(find(snapshot.kittyObjectives.weekly, "kitty-weekly-clicks").progress, 150);
  assert.ok(find(snapshot.kittyObjectives.daily, "kitty-daily-combo").progress >= 15);

  // eventos: dinheiro conta como evento; só os bônus contam como turbo
  const money = store.forceEvent("kitty", "money").modes.kitty.activeEvent;
  store.collectEvent("kitty", money.id);
  snapshot = store.getSnapshot();
  assert.equal(find(snapshot.kittyObjectives.daily, "kitty-daily-events").progress, 1);
  assert.equal(find(snapshot.kittyObjectives.daily, "kitty-daily-boost").progress, 0);
  assert.equal(find(snapshot.kittyObjectives.daily, "kitty-daily-events").completedAt, null);

  const boost = store.forceEvent("kitty", "production2").modes.kitty.activeEvent;
  store.collectEvent("kitty", boost.id);
  snapshot = store.getSnapshot();
  assert.ok(find(snapshot.kittyObjectives.daily, "kitty-daily-events").completedAt);
  assert.ok(find(snapshot.kittyObjectives.daily, "kitty-daily-boost").completedAt);
  assert.equal(find(snapshot.kittyObjectives.weekly, "kitty-weekly-boosts").progress, 1);

  // eventos da Fazendinha não contam nas missões da Hello Kitty
  const farmEvent = store.forceEvent("farm", "production2").modes.farm.activeEvent;
  store.collectEvent("farm", farmEvent.id);
  assert.equal(find(store.getSnapshot().kittyObjectives.weekly, "kitty-weekly-boosts").progress, 1);

  // recompensas: combo 8 + toques 8 + eventos 10 + turbo 10 + sequência 45 (+ conquistas permanentes que possam ter saído no caminho)
  const gained = store.getSnapshot().globalCoins - base;
  assert.ok(gained >= 8 + 8 + 10 + 10 + 45, `moedas ganhas: ${gained}`);
});

test("800 toques completam a missão semanal de toques e ela paga 45 moedas", () => {
  const { store, clock } = makeStore(MONDAY);
  forceSelection(store, ["kitty-daily-clicks", "kitty-daily-combo", "kitty-daily-events", "kitty-daily-boost"], ["kitty-weekly-clicks", "kitty-weekly-events", "kitty-weekly-boosts"]);
  store.addTestFunds("kitty", 1_000);
  store.act("kitty", "hello-kitty", "buy");
  for (let tap = 0; tap < 799; tap += 1) { clock.now += 3_000; store.click("kitty", "hello-kitty", "andre"); }
  let weekly = store.getSnapshot().kittyObjectives.weekly.find((item) => item.id === "kitty-weekly-clicks");
  assert.equal(weekly.completedAt, null);
  const before = store.getSnapshot().globalCoins;
  clock.now += 3_000;
  store.click("kitty", "hello-kitty", "andre");
  weekly = store.getSnapshot().kittyObjectives.weekly.find((item) => item.id === "kitty-weekly-clicks");
  assert.ok(weekly.completedAt);
  assert.equal(store.getSnapshot().globalCoins - before, 45);
});

test("visitar em dias diferentes conta uma vez por dia", () => {
  const { store, clock } = makeStore(MONDAY);
  const weeklyIds = ["kitty-weekly-days", "kitty-weekly-clicks", "kitty-weekly-events"];
  forceSelection(store, ["kitty-daily-clicks", "kitty-daily-combo", "kitty-daily-events", "kitty-daily-boost"], weeklyIds);
  const days = () => store.getSnapshot().kittyObjectives.weekly.find((item) => item.id === "kitty-weekly-days");

  store.enterMode("kitty");
  store.enterMode("kitty");
  assert.equal(days().progress, 1, "várias entradas no mesmo dia contam como um dia");
  clock.now += DAY; // terça
  store.enterMode("kitty");
  store.enterMode("kitty");
  assert.equal(days().progress, 2);
  assert.equal(days().completedAt, null);
  clock.now += DAY; // quarta
  store.enterMode("kitty");
  assert.equal(days().progress, 3);
  assert.ok(days().completedAt);
  // a Fazendinha não conta como visita ao Mundo da Hello Kitty
  clock.now += DAY;
  store.enterMode("farm");
  assert.equal(days().progress, 3);
});

test("missão antiga compartilhada entre as listas paga uma única vez", () => {
  const { store } = makeStore(MONDAY);
  forceSelection(store, ["daily-upgrades", "daily-minigame", "daily-kitty-entry", "kitty-daily-clicks"], ["weekly-upgrades", "weekly-minigames", "kitty-weekly-clicks"]);
  store.addTestFunds("kitty", 100_000);
  store.act("kitty", "hello-kitty", "buy");
  const before = store.getSnapshot().globalCoins;
  const result = store.upgradeMany("kitty", "hello-kitty", 3);
  assert.equal(result.ok, true);
  const after = store.getSnapshot();
  assert.equal(after.globalCoins - before, 10, "daily-upgrades paga 10 uma única vez");
  assert.ok(after.kittyObjectives.daily.find((item) => item.id === "daily-upgrades").completedAt);
  assert.ok(after.objectives.daily.find((item) => item.id === "daily-upgrades").completedAt);
  store.upgradeMany("kitty", "hello-kitty", 1);
  assert.equal(store.getSnapshot().globalCoins - before, 10);
});

test("período informa quando renova (meia-noite de Brasília e segunda-feira)", () => {
  const monday = makeStore(MONDAY).store.getSnapshot().kittyObjectives;
  assert.equal(monday.daily[0].periodEndsAt, Date.parse("2026-09-29T00:00:00-03:00"));
  assert.equal(monday.weekly[0].periodEndsAt, Date.parse("2026-10-05T00:00:00-03:00"));
  const saturday = makeStore(SATURDAY).store.getSnapshot();
  assert.equal(saturday.kittyObjectives.daily[0].periodEndsAt, Date.parse("2026-09-27T00:00:00-03:00"));
  assert.equal(saturday.kittyObjectives.weekly[0].periodEndsAt, Date.parse("2026-09-28T00:00:00-03:00"));
  assert.equal(saturday.objectives.daily[0].periodEndsAt, Date.parse("2026-09-27T00:00:00-03:00"));
  const late = makeStore(Date.parse("2026-09-30T23:59:30-03:00")).store.getSnapshot().kittyObjectives.daily[0];
  assert.equal(late.periodEndsAt - Date.parse("2026-09-30T23:59:30-03:00"), 30_000);
});

test("sorteio, metas e progresso persistem; saves antigos sem sorteio ganham um", async () => {
  const folder = await mkdtemp(join(tmpdir(), "idle-kitty-objectives-"));
  const file = join(folder, "idle-game.json");
  const clock = { now: MONDAY };
  try {
    const first = new IdleStore(true, () => clock.now, file, "real", seeded(5));
    await first.ready();
    forceSelection(first, ["kitty-daily-events", "kitty-daily-boost", "kitty-daily-clicks", "kitty-daily-combo"], ["kitty-weekly-events", "kitty-weekly-boosts", "kitty-weekly-clicks"]);
    const event = first.forceEvent("kitty", "production2").modes.kitty.activeEvent;
    first.collectEvent("kitty", event.id);
    const saved = first.getSnapshot();
    assert.ok(saved.kittyObjectives.daily.find((item) => item.id === "kitty-daily-boost").completedAt);
    await new Promise((resolve) => setTimeout(resolve, 650));

    const reloaded = new IdleStore(true, () => clock.now, file, "real", seeded(6));
    await reloaded.ready();
    const snapshot = reloaded.getSnapshot();
    assert.deepEqual(snapshot.kittyObjectives.daily.map((item) => item.id), saved.kittyObjectives.daily.map((item) => item.id));
    assert.deepEqual(snapshot.kittyObjectives.weekly.map((item) => item.id), saved.kittyObjectives.weekly.map((item) => item.id));
    assert.ok(snapshot.kittyObjectives.daily.find((item) => item.id === "kitty-daily-boost").completedAt, "conclusão da missão nova persiste");
    assert.equal(snapshot.kittyObjectives.daily.find((item) => item.id === "kitty-daily-events").progress, 1);
    assert.equal(snapshot.globalCoins, saved.globalCoins);

    // save antigo: sem o campo `kitty`, e outro corrompido com ids que não existem
    const raw = JSON.parse(await readFile(file, "utf-8"));
    delete raw.objectives.daily.kitty;
    raw.objectives.weekly.kitty = { ids: ["nao-existe", "kitty-weekly-clicks", "kitty-weekly-events"], targets: {} };
    await writeFile(file, JSON.stringify(raw), "utf-8");
    const legacy = new IdleStore(true, () => clock.now, file, "real", seeded(8));
    await legacy.ready();
    const migrated = legacy.getSnapshot().kittyObjectives;
    assert.equal(migrated.daily.length, 4);
    assert.equal(migrated.weekly.length, 3);
    assert.ok(migrated.weekly.every((item) => kittyObjectiveById(item.id)));
    // o progresso e as recompensas já registrados do dia continuam valendo
    assert.equal(legacy.getSnapshot().globalCoins, saved.globalCoins);
    assert.ok(legacy.getSnapshot().objectives.daily.length === 5);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
