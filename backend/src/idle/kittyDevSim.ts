// NOME LEGADO: este arquivo faz parte do jogo normal E do DEV (não é experimental). Ver CLAUDE.md e experimental.ts.
/**
 * Simulador de progressão do Mundo da Hello Kitty (modo DEV).
 * Uso:  cd backend && npx tsx src/idle/kittyDevSim.ts [fator] [dias]
 *
 * Parte do save de referência (P18, ~2B/s, relíquias 1–4 e de clique no máximo) e simula um jogador que
 * "joga bem, mas não perfeito": melhor retorno entre níveis/relíquias/personagens, compra estrelas assim que
 * pode, itens quando custam pouco perto da renda e despertares em ordem. O fator `F` já embute cliques,
 * eventos e a eficiência real (calibrado: P17 em ~7 dias e P18 em ~12 dias a partir de um save novo).
 * As fórmulas vêm direto do código do jogo, então o resultado acompanha qualquer ajuste em kittyDevConfig.ts.
 */
import { IDLE_CATALOG, itemProduction, itemUpgradeCost, KITTY_RELICS, kittyRelicCost } from "./idleConfig";
import * as C from "./kittyDevConfig";

const cat = IDLE_CATALOG.kitty;
const N = cat.length;
const DAY = 86_400;

export interface SimOptions { F: number; maxDays: number; verbose?: boolean; awakeCosts?: number[]; awakeFlats?: number[] }

/** Níveis do save de referência: P1..P4 informados; os demais seguem a queda natural da curva. */
export function referenceLevels(scale = 1.6): number[] {
  const known = [60, 55, 48, 39, 34, 30, 27, 24, 21, 19, 17, 15, 13, 11, 9, 7, 5, 2];
  return known.map((value, index) => (index < 4 ? value : Math.max(1, Math.round(value * scale))));
}

export function simulate(options: SimOptions) {
  const { F, maxDays } = options;
  const awakeCost = (k: number) => options.awakeCosts?.[k] ?? C.awakeningFor(cat[k].id)!.cost;
  const awakeFlat = (k: number) => options.awakeFlats?.[k] ?? C.awakeningFor(cat[k].id)!.bonus;
  const awakeInfo: Array<{ sumProd: number; relicsK: number; income: number } | undefined> = [];
  let bal = 0, t = 0, next = 18;
  const level = referenceLevels().concat(new Array(N - 18).fill(0));
  const relic: Record<string, number> = {};
  KITTY_RELICS.forEach((relicDef) => { relic[relicDef.id] = 0; });
  for (const id of ["kitty-scene-1", "kitty-scene-2", "kitty-scene-3", "kitty-scene-4", "kitty-click"]) relic[id] = 4;
  const stars = new Array(N).fill(0), clickItem = new Array(N).fill(0), stoneItem = new Array(N).fill(0);
  const claimed = new Array(N).fill(0), frac = new Array(N).fill(0), awakened = new Array(N).fill(false);
  let stones = 0, totalStones = 0;
  const mark: Record<string, number> = {};
  const note = (key: string) => { if (mark[key] === undefined) mark[key] = t / DAY; };
  const rm = (id: string) => 1 + relic[id];
  const relicsOf = (i: number) => rm(`kitty-scene-${cat[i].scene + 1}`) * rm("kitty-all");
  // despertar = bônus FIXO de produção (como um personagem 25, 26…), multiplicado pelas relíquias
  const prodOf = (i: number) => (level[i] > 0 ? (itemProduction(cat[i], level[i]) * C.constellationProductionMultiplier(stars[i]) + (awakened[i] ? awakeFlat(i) : 0)) * relicsOf(i) : 0);
  const prod = () => { let sum = 0; for (let i = 0; i < N; i++) sum += prodOf(i); return sum * F; };
  const claim = () => {
    for (let i = 0; i < N; i++) {
      const m = Math.floor(level[i] / 10);
      if (level[i] > 0 && m > claimed[i]) {
        const exact = frac[i] + (m - claimed[i]) * C.stoneYieldForIndex(i) * C.stoneItemMultiplier(stoneItem[i]);
        const whole = Math.floor(exact + 1e-9); frac[i] = exact - whole; claimed[i] = m; stones += whole; totalStones += whole;
      }
    }
  };
  const buyStars = () => {
    for (;;) {
      // o jogador gasta as pedras onde elas rendem mais produção por pedra
      let best = -1, bestCost = Infinity, bestValue = -1;
      for (let i = 0; i < N; i++) if (level[i] > 0 && stars[i] < 5) {
        const cost = C.constellationCost(i, stars[i] + 1);
        if (stones < cost || level[i] < C.constellationLevelRequirement(i, stars[i] + 1)) continue;
        const value = (prodOf(i) * (C.constellationProductionMultiplier(stars[i] + 1) / C.constellationProductionMultiplier(stars[i]) - 1) + 1e-9 * (24 - i)) / cost;
        if (value > bestValue) { bestValue = value; bestCost = cost; best = i; }
      }
      if (best < 0) break;
      stones -= bestCost; stars[best]++; note(`star_${best + 1}_${stars[best]}`);
      if (stars[best] === 5) note(`const_${best + 1}`);
      if (stars.reduce((a, b) => a + b, 0) === 24 * 5) note("all_constellations");
    }
  };
  const nextAwake = () => awakened.findIndex((value) => !value);
  type Act = { cost: number; dprod: number; apply: () => void; goal?: boolean };
  const actions = (income: number): Act[] => {
    const out: Act[] = []; const base = prod();
    for (let i = 0; i < N; i++) if (level[i] > 0) {
      const cost = itemUpgradeCost(cat[i], level[i]);
      const before = prodOf(i); level[i]++; const after = prodOf(i); level[i]--;
      let gain = (after - before) * F;
      // meta de estrela: se faltam só níveis para liberar a próxima estrela (e já há pedras), esses níveis valem mais
      if (stars[i] < 5 && stones >= C.constellationCost(i, stars[i] + 1)) {
        const need = C.constellationLevelRequirement(i, stars[i] + 1) - level[i];
        if (need > 0) gain += (prodOf(i) * (C.constellationProductionMultiplier(stars[i] + 1) / C.constellationProductionMultiplier(stars[i]) - 1) * F) / need;
      }
      out.push({ cost, dprod: gain, apply: () => { level[i]++; claim(); buyStars(); } });
    }
    for (const relicDef of KITTY_RELICS) {
      if (relicDef.kind === "click" || !(level[relicDef.unlockOrder] > 0) || relic[relicDef.id] >= relicDef.maxLevel) continue;
      const l = relic[relicDef.id]; const cost = kittyRelicCost(relicDef, l);
      relic[relicDef.id] = l + 1; const after = prod(); relic[relicDef.id] = l;
      out.push({ cost, dprod: after - base, apply: () => { relic[relicDef.id] = l + 1; } });
    }
    for (let i = 0; i < N; i++) if (level[i] > 0) {
      if (stoneItem[i] < C.STONE_ITEM_MAX_LEVEL) { const c = C.stoneItemCost(i, stoneItem[i] + 1); if (c <= income * 3600 * 6) out.push({ cost: c, dprod: c / (DAY * 2), apply: () => { stoneItem[i]++; if (stoneItem[i] === 5) note(`stoneitem_max_${i + 1}`); } }); }
      if (clickItem[i] < C.CLICK_ITEM_MAX_LEVEL) { const c = C.clickItemCost(i, clickItem[i] + 1); if (c <= income * 3600 * 3) out.push({ cost: c, dprod: c / (DAY * 1), apply: () => { clickItem[i]++; if (clickItem[i] === 8) note(`clickitem_max_${i + 1}`); } }); }
    }
    // despertar em ordem: exige todos os personagens, 5 estrelas e o despertar anterior
    const k = nextAwake();
    if (k >= 0 && next >= N && stars[k] >= 5 && level[k] > 0) {
      const before = prodOf(k); awakened[k] = true; const after = prodOf(k); awakened[k] = false;
      out.push({ cost: awakeCost(k), dprod: (after - before) * F, goal: true, apply: () => {
        let sumProd = 0; for (let i = 0; i < N; i++) sumProd += prodOf(i);
        awakeInfo[k] = { sumProd, relicsK: relicsOf(k), income: prod() };
        awakened[k] = true; note(`awake_${k + 1}`);
      } });
    }
    return out;
  };
  const checkpoints = [10, 20, 30, 40, 60, 90, 120, 180, 240, 300, 365, 450];
  const cps: string[] = []; let cp = 0; let guard = 0;
  claim(); buyStars();
  const snapshot = () => `d${checkpoints[cp]}: chars=${level.filter((l) => l > 0).length} pedras=${totalStones} estrelas=${stars.reduce((a, b) => a + b, 0)} desp=${awakened.filter(Boolean).length} prod=${prod().toExponential(2)}`;
  while (t < maxDays * DAY && guard++ < 4_000_000) {
    while (cp < checkpoints.length && t / DAY >= checkpoints[cp]) { cps.push(snapshot()); cp++; }
    const income = prod();
    const nextCost = next < N ? cat[next].baseCost : Infinity;
    if (next < N && bal >= nextCost) { bal -= nextCost; level[next] = 1; next++; note(`char_${next}`); claim(); buyStars(); continue; }
    const list = actions(income);
    let target: Act | null = null; let bestPayback = Infinity;
    const goal = list.find((a) => a.goal && a.cost <= income * DAY * 30);
    if (goal) target = goal;
    else for (const a of list) { if (a.dprod <= 0) continue; const pb = a.cost / a.dprod; if (pb < bestPayback) { bestPayback = pb; target = a; } }
    const waitNext = next < N ? Math.max(0, (nextCost - bal) / income) : Infinity;
    if (target && !goal && next < N && !(bestPayback < waitNext * 0.6)) target = null;
    if (target) {
      const wait = Math.max(0, (target.cost - bal) / income);
      if (t + wait > maxDays * DAY) break;
      t += wait; bal = Math.max(0, bal + income * wait - target.cost); target.apply(); claim(); buyStars(); continue;
    }
    if (next < N) { t += waitNext; bal = nextCost; continue; }
    t += DAY; bal += income * DAY;
  }
  while (cp < checkpoints.length) { cps.push(snapshot()); cp++; }
  return { mark, cps, level, stars, awakened, totalStones, income: prod(), awakeInfo };
}

const fmt = (value?: number) => (value === undefined ? "—" : value < 10 ? value.toFixed(1) : String(Math.round(value)));
if (require.main === module) {
  const F = Number(process.argv[2] ?? 0.3);
  const result = simulate({ F, maxDays: Number(process.argv[3] ?? 600) });
  const m = result.mark;
  console.log(`F=${F}`);
  console.log(result.cps.join("\n"));
  console.log(`P19 ${fmt(m.char_19)} | P20 ${fmt(m.char_20)} | P22 ${fmt(m.char_22)} | P24 ${fmt(m.char_24)}`);
  console.log("estrelas 5 (personagem): " + [1, 2, 3, 6, 12, 18, 24].map((n) => `P${n} ${fmt(m[`const_${n}`])}`).join(" | "), "| todas", fmt(m.all_constellations));
  console.log("despertares (dia): " + Array.from({ length: 24 }, (_, i) => fmt(m[`awake_${i + 1}`])).join(" "));
  console.log(`itens estelares máx: P1 ${fmt(m.stoneitem_max_1)} P12 ${fmt(m.stoneitem_max_12)} P24 ${fmt(m.stoneitem_max_24)} | cliques: P1 ${fmt(m.clickitem_max_1)} P12 ${fmt(m.clickitem_max_12)} P24 ${fmt(m.clickitem_max_24)}`);
}
