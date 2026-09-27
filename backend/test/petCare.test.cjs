const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtemp, readFile, writeFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { PersistentDuoStore, projectPetCare, PET_AFFECTION_PER_HOUR, PET_SATIETY_PER_HOUR } = require("../dist/rooms/persistentDuo.js");
const { IdleStore } = require("../dist/idle/IdleStore.js");
const { PET_FOODS, feedPetPurchase } = require("../dist/pets/petFood.js");

test("decaimento offline, humor pelo menor status e limites", () => {
  const start = 1_000_000;
  const seed = { affection: 100, satiety: 100, lastUpdatedAt: start, revision: 0 };
  const hours = 24;
  const after = projectPetCare(seed, "max", "real", start + hours * 3_600_000);
  assert.equal(after.affection, 100 - hours * PET_AFFECTION_PER_HOUR);
  assert.equal(after.satiety, 100 - hours * PET_SATIETY_PER_HOUR);
  assert.equal(after.mood, "sad");
  const hungry = projectPetCare({ ...seed, satiety: 20 }, "nix", "real", start);
  assert.equal(hungry.mood, "sad");
  assert.equal(projectPetCare({ ...seed, affection: 50 }, "max", "real", start).mood, "neutral");
  assert.equal(projectPetCare(seed, "max", "real", start - 10_000).satiety, 100);
  assert.equal(projectPetCare(seed, "max", "real", start + 200 * 3_600_000).satiety, 0);
});

test("Max e Nix têm cuidado independente, inclusive no PET DEV, e o servidor limita carinho", () => {
  const store = new PersistentDuoStore(false);
  assert.equal(store.strokePet("max", "real", "andre").affection, 100);
  assert.equal(store.strokePet("max", "real", "andre"), null);
  assert.equal(store.feedPet("nix", "real", 20).satiety, 100);
  const state = store.getPetCare("nix", "real");
  assert.equal(state.revision, 1);
  assert.equal(store.getPetCare("max", "real").revision, 1);
  assert.equal(store.getPetCare("nix", "dev").revision, 0);
});

test("cuidado sobrevive à gravação e recarga do estado sem tocar nas decorações", async () => {
  const directory = await mkdtemp(join(tmpdir(), "couple-pet-care-"));
  const file = join(directory, "state.json");
  try {
    const first = new PersistentDuoStore(true, file);
    await first.ready();
    first.feedPet("max", "real", 2);
    first.strokePet("nix", "dev", "andre");
    await new Promise((resolve) => setTimeout(resolve, 950));
    const stored = JSON.parse(await readFile(file, "utf8"));
    assert.ok(stored.petCare.max);
    stored.petCare.max.lastUpdatedAt = Date.now() - 24 * 3_600_000;
    await writeFile(file, JSON.stringify(stored));
    const reloaded = new PersistentDuoStore(true, file);
    await reloaded.ready();
    assert.equal(reloaded.getPetCare("max", "real").revision, 1);
    assert.equal(reloaded.getPetCare("max", "real").mood, "sad");
    assert.equal(reloaded.getPetCare("nix", "dev").revision, 1);
    assert.equal(reloaded.getPetCare("nix", "real").revision, 0);
    assert.equal(reloaded.getPetRoom("max").slots["floor-bed"], "bed");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("comida usa saldo global real, falha sem moedas e progressão cabe nos prêmios diários", () => {
  const wallet = new IdleStore(false);
  const first = PET_FOODS[0];
  assert.equal(first.price, 2);
  assert.equal(wallet.spendPetFood(first.price).ok, false);
  wallet.changeBalance("global", "set", 5);
  assert.equal(wallet.spendPetFood(first.price).snapshot.globalCoins, 3);
  assert.equal(wallet.spendPetFood(PET_FOODS[4].price).ok, false);
  assert.equal(wallet.getSnapshot().globalCoins, 3);
  assert.ok(PET_FOODS.every((food, index) => !index || food.price > PET_FOODS[index - 1].price && food.satiety > PET_FOODS[index - 1].satiety));
});

test("drop validado não cobra quando cheio ou sem moedas, e limita saciedade em 100", () => {
  const wallet = new IdleStore(false);
  wallet.changeBalance("global", "set", 15);
  const values = { max: 100, nix: 90 };
  const pets = {
    getPetCare: (id) => ({ petId: id, satiety: values[id] }),
    feedPet: (id, _env, gain) => ({ petId: id, satiety: values[id] = Math.min(100, values[id] + gain) }),
  };
  const premium = PET_FOODS[4];
  assert.equal(feedPetPurchase(pets, wallet, "max", "real", premium).reason, "full");
  assert.equal(wallet.getSnapshot().globalCoins, 15);
  assert.equal(feedPetPurchase(pets, wallet, "nix", "real", premium).care.satiety, 100);
  assert.equal(wallet.getSnapshot().globalCoins, 1);
  values.nix = 50;
  assert.equal(feedPetPurchase(pets, wallet, "nix", "real", premium).reason, "coins");
  assert.equal(values.nix, 50);
  assert.equal(values.max, 100);
});
