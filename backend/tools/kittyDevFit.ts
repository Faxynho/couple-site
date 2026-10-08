/**
 * Calibra o PREÇO e o BÔNUS DE PRODUÇÃO de cada despertar para que a sequência siga o ritmo desejado.
 * Uso:  cd backend && npx tsx tools/kittyDevFit.ts            (imprime as tabelas para colar em kittyDevConfig.ts)
 *
 * Metas (dias contados a partir do save de referência):
 *   1º despertar = dia do P24 + 12; depois um despertar a cada ~10 dias, subindo até ~22 dias no último.
 *   Cada despertar eleva a produção total em ~JUMP (salto visual): ×2,4 no primeiro até ×1,5 no último,
 *   somando um bônus fixo de produção ao personagem (ele não explode quando o personagem sobe de nível).
 * Quando a 5ª estrela do personagem chega depois da meta, o gargalo é a constelação (nível/pedras) e não o preço:
 * a ferramenta avisa para você ajustar as estrelas.
 */
import { simulate } from "../src/idle/kittyDevSim";

const F = 0.3;
const N = 24;
const AFTER_P24 = 12;
const TOLERANCE = 0.4;
const spacing = (k: number) => (k === 1 ? 0 : 10 + 12 * Math.pow((k - 2) / 22, 1.5)); // k = 1..24
const jump = (k: number) => 2.4 - 0.9 * ((k - 1) / 23);

const HUGE = 1e300;
const costs = new Array(N).fill(HUGE);
const flats = new Array(N).fill(0);
const limited: string[] = [];
let p24 = 0;
let previousDay = 0;
let incomeAfterPrevious = 0;

for (let k = 1; k <= N; k++) {
  let lo = 0, hi = Infinity;
  let cost = k === 1 ? 1e17 : Math.max(costs[k - 2] * 1.1, incomeAfterPrevious * spacing(k) * 86_400 * 0.8);
  let done = false;
  for (let pass = 0; pass < 18 && !done; pass++) {
    costs[k - 1] = cost;
    const horizon = Math.max(previousDay, 40) + 70;
    const r = simulate({ F, maxDays: horizon, awakeCosts: costs, awakeFlats: flats });
    p24 = r.mark.char_24 ?? p24;
    const prev = k === 1 ? p24 : r.mark[`awake_${k - 1}`] ?? previousDay;
    const target = k === 1 ? p24 + AFTER_P24 : prev + spacing(k);
    const actual = r.mark[`awake_${k}`];
    const info = r.awakeInfo[k - 1];
    if (info) { flats[k - 1] = ((jump(k) - 1) * info.sumProd) / info.relicsK; incomeAfterPrevious = info.income * jump(k); }
    const starReady = r.mark[`const_${k}`];
    if (actual !== undefined && starReady !== undefined && actual <= starReady + 0.05 && starReady > target + 0.5) {
      limited.push(`P${k}: 5ª estrela só no dia ${starReady.toFixed(0)} (meta do despertar: ${target.toFixed(0)})`);
      done = true; previousDay = actual; break;
    }
    if (actual === undefined || actual > target + TOLERANCE) hi = Math.min(hi, cost);
    else if (actual < target - TOLERANCE) lo = Math.max(lo, cost);
    else { done = true; previousDay = actual; break; }
    cost = hi === Infinity ? cost * 2.5 : lo === 0 ? cost / 2.5 : Math.sqrt(lo * hi);
    if (hi !== Infinity && lo !== 0 && hi / lo < 1.002) { done = true; previousDay = actual ?? previousDay; }
  }
  if (!done) console.error(`aviso: despertar ${k} não convergiu`);
  console.error(`k=${k} custo=${costs[k - 1].toExponential(2)} dia=${previousDay.toFixed(1)}`);
}
const round = (v: number, digits = 3) => Number(v.toPrecision(digits));
const finalRun = simulate({ F, maxDays: 800, awakeCosts: costs, awakeFlats: flats });
console.log(`P24 no dia ${p24.toFixed(1)}; despertares nos dias: ${Array.from({ length: N }, (_, i) => finalRun.mark[`awake_${i + 1}`]?.toFixed(0) ?? "—").join(" ")}`);
console.log(limited.length ? "limitados pelas estrelas:\n  " + limited.join("\n  ") : "nenhum despertar limitado pelas estrelas");
console.log("\nexport const AWAKENING_COSTS: number[] = [" + costs.map((v) => round(v).toExponential(2)).join(", ") + "];");
console.log("export const AWAKENING_BONUSES: number[] = [" + flats.map((v) => round(v).toExponential(2)).join(", ") + "];");
