const test = require("node:test");
const assert = require("node:assert/strict");
const { simulate } = require("../dist/idle/kittyDevSim.js");
const config = require("../dist/idle/kittyDevConfig.js");

// Protege o balanceamento combinado: se alguém mexer em custos/bônus e quebrar o ritmo, estes testes avisam.
// (Para recalibrar os despertares: cd backend && npx tsx tools/kittyDevFit.ts)
const run = simulate({ F: 0.3, maxDays: 520 });
const m = run.mark;
const awake = (k) => m[`awake_${k}`];

test("balanço: P24 chega entre 30 e 40 dias a partir do save de referência", () => {
  assert.ok(m.char_24 >= 30 && m.char_24 <= 40, `P24 no dia ${m.char_24}`);
});

test("balanço: o 1º despertar vem 10–15 dias depois do P24", () => {
  const gap = awake(1) - m.char_24;
  assert.ok(gap >= 10 && gap <= 15, `intervalo ${gap}`);
});

test("balanço: despertares seguintes a cada ~10–25 dias, com o último mais distante", () => {
  const gaps = [];
  for (let k = 2; k <= 24; k += 1) {
    assert.ok(awake(k) !== undefined, `despertar ${k} não aconteceu em 520 dias`);
    gaps.push(awake(k) - awake(k - 1));
  }
  for (const gap of gaps) assert.ok(gap >= 8 && gap <= 25, `intervalo ${gap}`);
  // ritmo de referência do pedido: ~10, 20, 31, 42 dias depois do 1º
  assert.ok(Math.abs(awake(2) - awake(1) - 10) < 3, `P2 ${awake(2) - awake(1)}`);
  assert.ok(Math.abs(awake(3) - awake(1) - 21) < 4);
  assert.ok(Math.abs(awake(4) - awake(1) - 31) < 5);
  assert.ok(Math.abs(awake(5) - awake(1) - 42) < 6);
  const early = gaps.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  const late = gaps.slice(-5).reduce((a, b) => a + b, 0) / 5;
  assert.ok(late > early + 6, `últimos (${late.toFixed(1)}) devem ser bem mais distantes que os primeiros (${early.toFixed(1)})`);
  assert.ok(gaps[gaps.length - 1] >= 20, "o último é o mais distante");
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
