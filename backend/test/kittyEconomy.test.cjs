const test = require('node:test');
const assert = require('node:assert/strict');
const {
  IDLE_CATALOG,
  KITTY_RELICS,
  itemProduction,
  itemUpgradeCost,
  kittyRelicCost,
} = require('../dist/idle/idleConfig.js');

const T = 1_000_000_000_000;
const Q = 1_000_000_000_000_000;

test('curva late game da Hello Kitty usa os novos marcos sem alterar P1-P17', () => {
  const items = IDLE_CATALOG.kitty;
  const expected = [
    [18, 114 * T],
    [19, 650 * T],
    [20, 2 * Q],
    [21, 6 * Q],
    [22, 15 * Q],
    [23, 35 * Q],
    [24, 75 * Q],
  ];

  expected.forEach(([position, price]) => {
    assert.equal(items[position - 1].baseCost, price, `P${position}`);
  });

  assert.equal(items[16].baseCost, 3_097_915_431_626, 'P17 permanece no preço anterior');
  for (let index = 18; index < 24; index += 1) {
    assert.ok(items[index].baseCost > items[index - 1].baseCost, `P${index + 1} deve ser mais caro que P${index}`);
  }
});

test('melhorias do late game acompanham o preço do personagem e mantêm crescimento maior', () => {
  const items = IDLE_CATALOG.kitty;
  const lateGame = items.slice(17);

  for (const item of lateGame) {
    assert.equal(item.upgradeBaseCost, Math.ceil(item.baseCost * 0.11), item.id);
    assert.equal(item.costGrowth, 1.68, item.id);
    assert.equal(item.productionGrowth, 1.27, item.id);
  }

  const p18 = items[17];
  assert.equal(itemUpgradeCost(p18, 1), Math.ceil(114 * T * 0.11));
  assert.equal(itemUpgradeCost(p18, 2), Math.ceil(114 * T * 0.11 * 1.68));

  // A primeira melhoria de P18 ainda fica bem abaixo de P19, enquanto
  // níveis posteriores começam a disputar o mesmo caixa do próximo personagem.
  assert.ok(itemUpgradeCost(p18, 1) < items[18].baseCost);
  assert.ok(itemUpgradeCost(p18, 4) < items[18].baseCost);
  assert.equal(itemProduction(p18, 1), p18.baseProduction);
  assert.equal(itemProduction(p18, 2), p18.baseProduction * 1.27);
});

test('relíquias das cenas finais competem com personagens em vez de atropelá-los', () => {
  const items = IDLE_CATALOG.kitty;
  const scene5 = KITTY_RELICS.find((relic) => relic.id === 'kitty-scene-5');
  const scene6 = KITTY_RELICS.find((relic) => relic.id === 'kitty-scene-6');
  const scene7 = KITTY_RELICS.find((relic) => relic.id === 'kitty-scene-7');

  assert.ok(scene5 && scene6 && scene7);

  // Cena 5: primeiro nível abaixo de P18; níveis seguintes atravessam P19/P20.
  assert.equal(scene5.baseCost, Math.ceil(items[17].baseCost * 0.55));
  assert.equal(kittyRelicCost(scene5, 0), Math.ceil(114 * T * 0.55));
  assert.equal(kittyRelicCost(scene5, 1), Math.ceil(114 * T * 0.55 * 7));
  assert.ok(kittyRelicCost(scene5, 1) < items[18].baseCost);
  assert.ok(kittyRelicCost(scene5, 2) > items[19].baseCost);

  // Cena 6: o primeiro nível entra na faixa de P22 e o segundo já é
  // um investimento de fim de campanha, próximo de P23.
  assert.equal(scene6.baseCost, Math.ceil(items[21].baseCost * 0.55));
  assert.ok(scene6.baseCost < items[21].baseCost);
  assert.ok(kittyRelicCost(scene6, 1) > items[22].baseCost);

  // Cena final: não fica barata só porque não existe um personagem depois dela.
  assert.equal(scene7.baseCost, Math.ceil(items[23].baseCost * 0.55));
  assert.ok(scene7.baseCost < items[23].baseCost);
});

test('relíquia global mantém o desbloqueio no P9 e cria duas decisões grandes depois disso', () => {
  const items = IDLE_CATALOG.kitty;
  const global = KITTY_RELICS.find((relic) => relic.id === 'kitty-all');
  assert.ok(global);

  assert.equal(global.unlockOrder, 8);
  assert.equal(kittyRelicCost(global, 0), Math.ceil(items[8].baseCost * 6));
  assert.equal(kittyRelicCost(global, 1), items[17].baseCost);
  assert.equal(kittyRelicCost(global, 2), Math.ceil(items[22].baseCost * 0.7));

  // O nível 2 compete diretamente com P18 e o nível 3 entra na mesma região
  // de investimento de P23, como desejado para o fim da campanha.
  assert.equal(kittyRelicCost(global, 1), 114 * T);
  assert.equal(kittyRelicCost(global, 2), 35 * Q * 0.7);
});
