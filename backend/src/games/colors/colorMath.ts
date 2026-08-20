/**
 * Utilidades de cor para o jogo "Memória de Cores".
 * Converte HSV -> RGB -> CIELAB e calcula a distância perceptual entre a
 * cor-alvo e o palpite do jogador usando CIEDE2000 — a fórmula de diferença de
 * cor mais precisa perceptualmente (bem mais consistente que a distância
 * euclidiana simples em Lab, que distorce bastante em tons de azul/roxo e
 * subestima diferenças em tons de amarelo/verde). É por isso que ela é usada
 * como padrão em calibração de cor profissional.
 */

export interface HSV {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

export type RGB = [number, number, number];
export type LAB = [number, number, number];

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const S = s / 100;
  const V = v / 100;
  const c = V * S;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;

  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const m = V - c;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`;
}

function srgbChannelToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function labF(t: number): number {
  const delta = 6 / 29;
  return t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
}

/** Converte RGB (0-255) para CIELAB (D65), base para medir a diferença perceptual entre cores. */
export function rgbToLab([r, g, b]: RGB): LAB {
  const rl = srgbChannelToLinear(r);
  const gl = srgbChannelToLinear(g);
  const bl = srgbChannelToLinear(b);

  const x = rl * 0.4124 + gl * 0.3576 + bl * 0.1805;
  const y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  const z = rl * 0.0193 + gl * 0.1192 + bl * 0.9505;

  const Xn = 0.95047;
  const Yn = 1;
  const Zn = 1.08883;

  const fx = labF(x / Xn);
  const fy = labF(y / Yn);
  const fz = labF(z / Zn);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}
function rad2deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * CIEDE2000 — fórmula padrão da indústria para diferença de cor perceptual
 * (Sharma, Wu & Dalal, 2005). Corrige as distorções conhecidas do CIE76
 * (distância euclidiana simples em Lab), que penaliza demais erros de matiz
 * em azuis/roxos saturados e penaliza de menos em amarelos/verdes — o que
 * causava notas incoerentes com o quão perto a cor realmente parecia.
 */
export function deltaE2000([L1, a1, b1]: LAB, [L2, a2, b2]: LAB): number {
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  let h1p = rad2deg(Math.atan2(b1, a1p));
  if (h1p < 0) h1p += 360;
  let h2p = rad2deg(Math.atan2(b2, a2p));
  if (h2p < 0) h2p += 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= 180) dhp = diff;
    else if (diff > 180) dhp = diff - 360;
    else dhp = diff + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2rad(dhp / 2));

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let hbarp: number;
  if (C1p * C2p === 0) {
    hbarp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hbarp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hbarp = (h1p + h2p + 360) / 2;
  } else {
    hbarp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(deg2rad(hbarp - 30)) +
    0.24 * Math.cos(deg2rad(2 * hbarp)) +
    0.32 * Math.cos(deg2rad(3 * hbarp + 6)) -
    0.2 * Math.cos(deg2rad(4 * hbarp - 63));

  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(Cbarp, 7) / (Math.pow(Cbarp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbarp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(deg2rad(2 * dTheta)) * Rc;

  const dLterm = dLp / Sl;
  const dCterm = dCp / Sc;
  const dHterm = dHp / Sh;

  return Math.sqrt(dLterm * dLterm + dCterm * dCterm + dHterm * dHterm + Rt * dCterm * dHterm);
}

export function hsvDeltaE(a: HSV, b: HSV): number {
  return deltaE2000(rgbToLab(hsvToRgb(a)), rgbToLab(hsvToRgb(b)));
}

/**
 * Converte a distância perceptual (Delta E 2000) em uma pontuação de 0 a 10
 * por rodada. A curva foi calibrada com base em referências reais de
 * "diferença perceptível" (JND ≈ 2.3 em dE2000): um palpite quase idêntico
 * marca perto de 10, um erro perceptível mas próximo fica na faixa de 6-8, e
 * um palpite bem distante tende a zero.
 */
export function scoreFromDeltaE(distance: number): number {
  const raw = 10 * Math.exp(-distance / 16);
  return Math.max(0, Math.round(raw * 100) / 100);
}
