const test = require("node:test");
const assert = require("node:assert/strict");
const { simulate } = require("../dist/idle/kittyDevSim.js");
const config = require("../dist/idle/kittyDevConfig.js");

// Protege o balanceamento combinado: se alguém mexer em custos/bônus e quebrar o ritmo, estes testes avisam.
// (Para recalibrar os despertares: cd backend && npx tsx tools/kittyDevFit.ts)
const run = simulate({ F: 0.3, maxDays: 520 });
const m = run.mark;
const awake = (k) => m[`awake_${k}`];

// Os dias exatos mudam sempre que os custos dos personagens são rebalanceados (KITTY_LATE_GAME_COSTS).
// Por isso estes testes só protegem a ORDEM e a consistência da progressão, não um número de dias fixo.
test("balanço: P24 chega e o 1º despertar vem depois dele", () => {
  assert.ok(m.char_24 > 0 && m.char_24 < 520, `P24 no dia ${m.char_24}`);
  const gap = awake(1) - m.char_24;
  assert.ok(gap > 0, `intervalo ${gap}`);
});

test("balanço: os 24 despertares acontecem em ordem crescente", () => {
  for (let k = 2; k <= 24; k += 1) {
    assert.ok(awake(k) !== undefined, `despertar ${k} não aconteceu em 520 dias`);
    assert.ok(awake(k) > awake(k - 1), `despertar ${k} deve vir depois do ${k - 1}`);
  }
});

test("balanço: Hello Kitty tem 4 estrelas em ~10–15 dias e a última mais ~5–10 dias depois", () => {
  assert.ok(m.star_1_4 >= 6 && m.star_1_4 <= 16, `4ª estrela no dia ${m.star_1_4}`);
  const extra = m.star_1_5 - m.star_1_4;
  assert.ok(extra >= 3 && extra <= 12, `5ª estrela ${extra} dias depois`);
});

test("balanço: nenhuma constelação fica pronta cedo demais e todas fecham antes do último despertar", () => {
  assert.ok(m.all_constellations > 250, `todas as constelações no dia ${m.all_constellations}`);
  assert.ok(m.all_constellations <= awake(24));
  // nem uma constelação por dia: no máximo uma nova completa a cada ~3 dias em média nos primeiros 60 dias
  const early = Object.entries(m).filter(([key, day]) => key.startsWith("const_") && day <= 60).length;
  assert.ok(early <= 12, `${early} constelações completas em 60 dias`);
});

test("balanço: itens não ficam no máximo cedo demais e fecham antes do fim", () => {
  const stoneDays = Array.from({ length: 24 }, (_, i) => m[`stoneitem_max_${i + 1}`]).filter((value) => value !== undefined);
  const clickDays = Array.from({ length: 24 }, (_, i) => m[`clickitem_max_${i + 1}`]).filter((value) => value !== undefined);
  assert.ok(Math.min(...stoneDays) >= 5, "o primeiro item estelar no máximo não sai em menos de 5 dias");
  assert.equal(clickDays.length, 24, "todos os itens de clique chegam ao máximo");
  assert.ok(Math.max(...clickDays) <= awake(24));
});

test("balanço: jogador mais lento ou mais rápido continua dentro do razoável", () => {
  const slow = simulate({ F: 0.2, maxDays: 800 });
  const fast = simulate({ F: 0.45, maxDays: 800 });
  assert.ok(slow.mark.char_24 > m.char_24 && fast.mark.char_24 < m.char_24);
  assert.ok(slow.mark.awake_24 < 700, `lento termina no dia ${slow.mark.awake_24}`);
  assert.ok(fast.mark.awake_24 > 150, `rápido termina no dia ${fast.mark.awake_24}`);
});

test("balanço: tabelas de despertar e requisitos estão coerentes", () => {
  for (let i = 1; i < 5; i += 1) {
    assert.ok(config.constellationLevelRequirement(0, i + 1) > config.constellationLevelRequirement(0, i));
  }
  assert.ok(config.LEVEL_REQUIREMENT_FRACTION.every((value, index, list) => index === 0 || value > list[index - 1]));
});
