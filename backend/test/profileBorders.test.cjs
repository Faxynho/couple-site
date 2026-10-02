const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtemp, readFile, writeFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { AccountStore } = require("../dist/accounts/AccountStore.js");
const { IdleStore } = require("../dist/idle/IdleStore.js");
const {
  PROFILE_BORDER_IDS,
  PROFILE_BORDER_PRICES,
  getProfileBorderState,
  isProfileBorderId,
  purchaseProfileBorder,
} = require("../dist/accounts/profileBorders.js");

async function makeStores(initialCoins = 0) {
  const dir = await mkdtemp(join(tmpdir(), "borders-"));
  const file = join(dir, "accounts.json");
  const accounts = new AccountStore(file);
  await accounts.ready();
  const wallet = new IdleStore(false, () => 1_000_000);
  if (initialCoins > 0) wallet.changeBalance("global", "add", initialCoins);
  return { dir, file, accounts, wallet, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

test("catálogo: ao menos uma borda e todo preço é um inteiro positivo", () => {
  assert.ok(PROFILE_BORDER_IDS.length >= 1);
  for (const id of PROFILE_BORDER_IDS) {
    const price = PROFILE_BORDER_PRICES[id];
    assert.ok(Number.isInteger(price) && price > 0, `preço inválido em ${id}: ${price}`);
    assert.match(id, /^[a-z0-9-]+$/, `id fora do padrão: ${id}`);
  }
  assert.equal(new Set(PROFILE_BORDER_IDS).size, PROFILE_BORDER_IDS.length, "ids duplicados");
  assert.ok(isProfileBorderId(PROFILE_BORDER_IDS[0]));
  assert.ok(!isProfileBorderId("nao-existe"));
  assert.ok(!isProfileBorderId("__proto__"));
  assert.ok(!isProfileBorderId(42));
});

test("perfil novo começa sem borda equipada nem possuída", async () => {
  const { accounts, cleanup } = await makeStores();
  try {
    for (const id of ["andre", "flavia"]) {
      assert.deepEqual(accounts.getBorderState(id), { equipped: null, owned: [] });
    }
    assert.deepEqual(accounts.getPublicProfiles().map((p) => p.border), [null, null]);
  } finally {
    await cleanup();
  }
});

test("compra desconta as moedas globais, registra a posse e NÃO equipa sozinha", async () => {
  const { accounts, wallet, cleanup } = await makeStores(1_000);
  try {
    const price = PROFILE_BORDER_PRICES["laco-rosa"];
    const result = purchaseProfileBorder(accounts, wallet, "flavia", "laco-rosa");
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.alreadyOwned, false);
    assert.equal(result.body.globalCoins, 1_000 - price);
    assert.deepEqual(result.body.owned, ["laco-rosa"]);
    assert.equal(result.body.equipped, null);
    assert.equal(wallet.getSnapshot().globalCoins, 1_000 - price);
    assert.ok(accounts.ownsBorder("flavia", "laco-rosa"));
  } finally {
    await cleanup();
  }
});

test("comprar de novo a mesma borda não cobra duas vezes", async () => {
  const { accounts, wallet, cleanup } = await makeStores(1_000);
  try {
    purchaseProfileBorder(accounts, wallet, "andre", "laco-rosa");
    const afterFirst = wallet.getSnapshot().globalCoins;
    const again = purchaseProfileBorder(accounts, wallet, "andre", "laco-rosa");
    assert.equal(again.status, 200);
    assert.equal(again.body.alreadyOwned, true);
    assert.equal(wallet.getSnapshot().globalCoins, afterFirst);
    assert.deepEqual(accounts.getBorderState("andre").owned, ["laco-rosa"]);
  } finally {
    await cleanup();
  }
});

test("saldo insuficiente responde 409 e não muda nada (nem posse, nem moedas)", async () => {
  const { accounts, wallet, cleanup } = await makeStores(PROFILE_BORDER_PRICES["coroa-real"] - 1);
  try {
    const before = wallet.getSnapshot().globalCoins;
    const result = purchaseProfileBorder(accounts, wallet, "andre", "coroa-real");
    assert.equal(result.status, 409);
    assert.equal(result.body.ok, false);
    assert.match(result.body.error, /insuficientes/);
    assert.equal(result.body.globalCoins, before);
    assert.equal(wallet.getSnapshot().globalCoins, before);
    assert.ok(!accounts.ownsBorder("andre", "coroa-real"));
  } finally {
    await cleanup();
  }
});

test("saldo exatamente igual ao preço compra e zera a carteira", async () => {
  const { accounts, wallet, cleanup } = await makeStores(PROFILE_BORDER_PRICES["ciranda-coracoes"]);
  try {
    const result = purchaseProfileBorder(accounts, wallet, "andre", "ciranda-coracoes");
    assert.equal(result.status, 200);
    assert.equal(result.body.globalCoins, 0);
  } finally {
    await cleanup();
  }
});

test("id inválido responde 400 e não cobra nada", async () => {
  const { accounts, wallet, cleanup } = await makeStores(5_000);
  try {
    for (const bad of ["nao-existe", "", null, undefined, 7, { id: "laco-rosa" }, "__proto__", "constructor"]) {
      const result = purchaseProfileBorder(accounts, wallet, "andre", bad);
      assert.equal(result.status, 400, `esperava 400 para ${JSON.stringify(bad)}`);
    }
    assert.equal(wallet.getSnapshot().globalCoins, 5_000);
    assert.deepEqual(accounts.getBorderState("andre").owned, []);
  } finally {
    await cleanup();
  }
});

test("a posse é de cada conta, mas as moedas globais são as mesmas do casal", async () => {
  const { accounts, wallet, cleanup } = await makeStores(1_000);
  try {
    purchaseProfileBorder(accounts, wallet, "andre", "laco-rosa");
    assert.ok(accounts.ownsBorder("andre", "laco-rosa"));
    assert.ok(!accounts.ownsBorder("flavia", "laco-rosa"), "flavia não herda a borda do andre");
    // A compra da flavia sai do mesmo saldo que o andre já usou.
    const afterAndre = wallet.getSnapshot().globalCoins;
    purchaseProfileBorder(accounts, wallet, "flavia", "laco-rosa");
    assert.equal(wallet.getSnapshot().globalCoins, afterAndre - PROFILE_BORDER_PRICES["laco-rosa"]);
  } finally {
    await cleanup();
  }
});

test("só equipa borda possuída; null remove; borda inexistente ou alheia é ignorada", async () => {
  const { accounts, wallet, cleanup } = await makeStores(1_000);
  try {
    // Sem possuir: o store recusa em silêncio (a rota responde 403 antes disso).
    assert.equal(accounts.updateProfile("andre", { border: "laco-rosa" }).border, null);
    purchaseProfileBorder(accounts, wallet, "andre", "laco-rosa");
    assert.equal(accounts.updateProfile("andre", { border: "laco-rosa" }).border, "laco-rosa");
    assert.equal(accounts.getPublicProfiles().find((p) => p.id === "andre").border, "laco-rosa");
    // Uma borda que só o andre tem não pode ser equipada pela flavia.
    assert.equal(accounts.updateProfile("flavia", { border: "laco-rosa" }).border, null);
    // Id fora do catálogo nunca é equipado.
    assert.equal(accounts.updateProfile("andre", { border: "nao-existe" }).border, "laco-rosa");
    // Alterar só o nome não mexe na borda.
    assert.equal(accounts.updateProfile("andre", { name: "Novo" }).border, "laco-rosa");
    // null remove a moldura, mas a posse continua.
    assert.equal(accounts.updateProfile("andre", { border: null }).border, null);
    assert.ok(accounts.ownsBorder("andre", "laco-rosa"));
  } finally {
    await cleanup();
  }
});

test("grantBorder é idempotente e ignora id fora do catálogo", async () => {
  const { accounts, cleanup } = await makeStores();
  try {
    assert.equal(accounts.grantBorder("andre", "ceu-estrelado"), true);
    assert.equal(accounts.grantBorder("andre", "ceu-estrelado"), false);
    assert.equal(accounts.grantBorder("andre", "nao-existe"), false);
    assert.deepEqual(accounts.getBorderState("andre").owned, ["ceu-estrelado"]);
  } finally {
    await cleanup();
  }
});

test("getProfileBorderState entrega equipada, possuídas, preços do servidor e saldo", async () => {
  const { accounts, wallet, cleanup } = await makeStores(300);
  try {
    purchaseProfileBorder(accounts, wallet, "flavia", "laco-rosa");
    accounts.updateProfile("flavia", { border: "laco-rosa" });
    const state = getProfileBorderState(accounts, wallet, "flavia");
    assert.equal(state.equipped, "laco-rosa");
    assert.deepEqual(state.owned, ["laco-rosa"]);
    assert.equal(state.globalCoins, 300 - PROFILE_BORDER_PRICES["laco-rosa"]);
    assert.deepEqual(state.prices, PROFILE_BORDER_PRICES);
  } finally {
    await cleanup();
  }
});

test("posse e borda equipada sobrevivem a salvar e recarregar do disco", async () => {
  const { file, accounts, wallet, cleanup } = await makeStores(2_000);
  try {
    purchaseProfileBorder(accounts, wallet, "andre", "ceu-estrelado");
    accounts.updateProfile("andre", { border: "ceu-estrelado", name: "Xibatudo" });
    await accounts.flushNow();

    const saved = JSON.parse(await readFile(file, "utf-8"));
    assert.equal(saved.profiles.andre.border, "ceu-estrelado");
    assert.deepEqual(saved.profiles.andre.ownedBorders, ["ceu-estrelado"]);

    const reloaded = new AccountStore(file);
    await reloaded.ready();
    assert.deepEqual(reloaded.getBorderState("andre"), { equipped: "ceu-estrelado", owned: ["ceu-estrelado"] });
    assert.equal(reloaded.getPublicProfiles().find((p) => p.id === "andre").name, "Xibatudo");
    assert.deepEqual(reloaded.getBorderState("flavia"), { equipped: null, owned: [] });
  } finally {
    await cleanup();
  }
});

test("accounts.json antigo (sem campos de borda) carrega com padrões e mantém nome e foto", async () => {
  const { dir, file, cleanup } = await makeStores();
  try {
    const legacy = {
      profiles: {
        andre: { id: "andre", name: "Xibatudo", photo: "data:image/png;base64,AAAA", updatedAt: 1 },
        flavia: { id: "flavia", name: "Flávia", photo: null, updatedAt: 2 },
      },
    };
    await writeFile(file, JSON.stringify(legacy), "utf-8");
    const store = new AccountStore(file);
    await store.ready();
    const [andre, flavia] = store.getPublicProfiles();
    assert.equal(andre.name, "Xibatudo");
    assert.equal(andre.photo, "data:image/png;base64,AAAA");
    assert.equal(andre.border, null);
    assert.equal(flavia.border, null);
    assert.deepEqual(store.getBorderState("andre"), { equipped: null, owned: [] });
  } finally {
    await rm(dir, { recursive: true, force: true });
    await cleanup();
  }
});

test("carregar descarta ids removidos do catálogo e borda equipada que a conta não possui", async () => {
  const { file, cleanup } = await makeStores();
  try {
    const dirty = {
      profiles: {
        andre: {
          id: "andre", name: "André", photo: null, updatedAt: 1,
          border: "borda-que-foi-removida", ownedBorders: ["laco-rosa", "borda-que-foi-removida", "laco-rosa", 5],
        },
        flavia: {
          id: "flavia", name: "Flávia", photo: null, updatedAt: 1,
          border: "coroa-real", ownedBorders: ["laco-rosa"],
        },
      },
    };
    await writeFile(file, JSON.stringify(dirty), "utf-8");
    const store = new AccountStore(file);
    await store.ready();
    assert.deepEqual(store.getBorderState("andre"), { equipped: null, owned: ["laco-rosa"] });
    assert.deepEqual(store.getBorderState("flavia"), { equipped: null, owned: ["laco-rosa"] });
  } finally {
    await cleanup();
  }
});

test("a visão geral (overview) inclui a borda e as possuídas de cada perfil", async () => {
  const { accounts, wallet, cleanup } = await makeStores(500);
  try {
    purchaseProfileBorder(accounts, wallet, "flavia", "ciranda-coracoes");
    const { profiles } = accounts.getOverview();
    assert.deepEqual(profiles.flavia.ownedBorders, ["ciranda-coracoes"]);
    assert.equal(profiles.andre.border, null);
  } finally {
    await cleanup();
  }
});
