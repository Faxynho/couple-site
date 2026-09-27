const test = require('node:test');
const assert = require('node:assert/strict');
const { IDLE_CATALOG, KITTY_RELICS, itemProduction, itemUpgradeCost, kittyRelicCost } = require('../dist/idle/idleConfig.js');

// Deterministic purchasing model: eight offline hours and 30 active minutes
// every day. Active play assumes two taps/s, an established combo, milestone
// payouts and occasional events; choices compare marginal production per cost.
function simulateCampaign(activeHours = .5) {
  const items = IDLE_CATALOG.kitty;
  const levels = Array(24).fill(0);
  const relics = Object.fromEntries(KITTY_RELICS.map((relic) => [relic.id, 0]));
  const reached = {};
  let balance = items[0].baseCost;
  const productions = () => items.map((item, index) => levels[index]
    ? itemProduction(item, levels[index]) * (1 + relics[`kitty-scene-${item.scene + 1}`]) * (1 + relics['kitty-all']) : 0);
  for (let day = 0; day < 45; day++) for (let tick = 0; tick < 48; tick++) {
    let production = productions();
    const total = production.reduce((a, b) => a + b, 0);
    const strongest = Math.max(...production);
    balance += total * (8 * 3600 / 48)
      + strongest * .55 * (1 + relics['kitty-click']) * 2.1 * 2 * activeHours * 3600 / 48
      + total * activeHours * 3600 / 48 * 1.4;
    for (let choice = 0; choice < 35; choice++) {
      production = productions();
      const sum = production.reduce((a, b) => a + b, 0);
      const next = levels.findIndex((level) => !level);
      if (next === -1) return reached;
      const nextItem = items[next];
      const options = [{ type: 'character', index: next, cost: nextItem.baseCost,
        score: next === 0 ? Infinity : itemProduction(nextItem, 1) / nextItem.baseCost * 3 }];
      for (let i = 0; i < next; i++) {
        const cost = itemUpgradeCost(items[i], levels[i]);
        options.push({ type: 'upgrade', index: i, cost,
          score: production[i] * (items[i].productionGrowth - 1) / cost });
      }
      for (const relic of KITTY_RELICS) {
        const level = relics[relic.id];
        if (level >= relic.maxLevel || !levels[relic.unlockOrder]) continue;
        const cost = kittyRelicCost(relic, level);
        const gain = relic.kind === 'scene'
          ? production.filter((_, i) => items[i].scene === relic.scene).reduce((a, b) => a + b, 0) / (level + 1)
          : relic.kind === 'global' ? sum / (level + 1) : sum * .3 / (level + 1);
        options.push({ type: 'relic', id: relic.id, cost, score: gain / cost });
      }
      const best = options.filter((option) => option.cost <= balance).sort((a, b) => b.score - a.score)[0];
      if (!best) break;
      balance -= best.cost;
      if (best.type === 'character') { levels[best.index] = 1; reached[best.index + 1] = day + tick / 48; }
      else if (best.type === 'upgrade') levels[best.index]++;
      else relics[best.id]++;
    }
  }
  return reached;
}

test('curva Hello Kitty: começo acessível e P24 em semanas com investimento ativo diário', () => {
  const normal = simulateCampaign();
  const lighter = simulateCampaign(.2);
  assert.ok(normal[5] > .08 && normal[5] < 1, `P5: ${normal[5]} dias`);
  assert.ok(normal[12] > 1 && normal[12] < 5, `P12: ${normal[12]} dias`);
  assert.ok(normal[20] > 6 && normal[20] < 18, `P20: ${normal[20]} dias`);
  assert.ok(normal[24] > 20 && normal[24] < 36, `P24: ${normal[24]} dias`);
  assert.ok(lighter[24] > normal[24] && lighter[24] < 42);
});
