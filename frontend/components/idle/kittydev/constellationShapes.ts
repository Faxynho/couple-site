/**
 * 24 desenhos de constelação, um para cada personagem (nenhum se repete).
 * Cada desenho tem 5 estrelas, numeradas na ordem em que são acesas (nível 1 a 5), e as linhas entre elas.
 * Uma linha só aparece quando as DUAS estrelas dela já foram acesas. Coordenadas em um quadro 0–100.
 */
export interface ConstellationShape {
  name: string;
  nodes: Array<[number, number]>;
  /** Pares de estrelas (números de 1 a 5) ligados por uma linha. */
  links: Array<[number, number]>;
}

export const CONSTELLATION_SHAPES: ConstellationShape[] = [
  { name: "Laço", nodes: [[50, 52], [14, 28], [14, 76], [86, 28], [86, 76]], links: [[1, 2], [2, 3], [3, 1], [1, 4], [4, 5], [5, 1]] },
  { name: "Carruagem", nodes: [[10, 26], [30, 40], [50, 46], [70, 34], [80, 64]], links: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 3]] },
  { name: "Pentágono", nodes: [[50, 8], [88, 38], [74, 86], [26, 86], [12, 38]], links: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 1]] },
  { name: "Estrelona", nodes: [[50, 8], [75, 86], [10, 38], [90, 38], [25, 86]], links: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 1]] },
  { name: "Onda", nodes: [[8, 72], [28, 28], [50, 72], [72, 28], [92, 72]], links: [[1, 2], [2, 3], [3, 4], [4, 5]] },
  { name: "Diamante", nodes: [[50, 8], [16, 44], [84, 44], [50, 92], [50, 44]], links: [[1, 2], [1, 3], [2, 4], [3, 4], [1, 5], [5, 4]] },
  { name: "Coroa", nodes: [[12, 74], [12, 30], [50, 58], [88, 30], [88, 74]], links: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 1]] },
  { name: "Cruz", nodes: [[50, 50], [50, 8], [50, 92], [8, 50], [92, 50]], links: [[1, 2], [1, 3], [1, 4], [1, 5]] },
  { name: "Árvore", nodes: [[50, 92], [50, 62], [20, 34], [80, 34], [50, 8]], links: [[1, 2], [2, 3], [2, 4], [3, 5], [4, 5]] },
  { name: "Escada", nodes: [[10, 86], [30, 66], [52, 66], [72, 34], [90, 14]], links: [[1, 2], [2, 3], [3, 4], [4, 5]] },
  { name: "Seta", nodes: [[50, 8], [50, 54], [50, 92], [20, 40], [80, 40]], links: [[1, 2], [2, 3], [1, 4], [1, 5]] },
  { name: "Pipa", nodes: [[14, 16], [14, 84], [66, 50], [90, 22], [90, 78]], links: [[1, 2], [2, 3], [3, 1], [3, 4], [3, 5]] },
  { name: "Raio", nodes: [[64, 8], [34, 50], [62, 50], [34, 94], [88, 30]], links: [[1, 2], [2, 3], [3, 4], [1, 5]] },
  { name: "Caracol", nodes: [[50, 52], [70, 46], [60, 22], [28, 28], [14, 66]], links: [[1, 2], [2, 3], [3, 4], [4, 5]] },
  { name: "Casinha", nodes: [[14, 50], [50, 12], [86, 50], [86, 90], [14, 90]], links: [[1, 2], [2, 3], [1, 3], [3, 4], [4, 5], [5, 1]] },
  { name: "Peixinho", nodes: [[10, 50], [46, 22], [72, 50], [46, 78], [96, 50]], links: [[1, 2], [2, 3], [3, 4], [4, 1], [3, 5]] },
  { name: "Letra A", nodes: [[50, 8], [18, 90], [82, 90], [30, 60], [70, 60]], links: [[1, 2], [1, 3], [4, 5]] },
  { name: "Letra K", nodes: [[24, 10], [24, 50], [24, 90], [80, 10], [80, 90]], links: [[1, 2], [2, 3], [2, 4], [2, 5]] },
  { name: "Letra N", nodes: [[14, 90], [14, 10], [50, 50], [86, 90], [86, 10]], links: [[1, 2], [2, 3], [3, 4], [4, 5]] },
  { name: "Serpente", nodes: [[80, 12], [22, 24], [76, 50], [22, 76], [80, 88]], links: [[1, 2], [2, 3], [3, 4], [4, 5]] },
  { name: "Arco", nodes: [[10, 70], [28, 36], [54, 18], [78, 26], [92, 52]], links: [[1, 2], [2, 3], [3, 4], [4, 5]] },
  { name: "Janela", nodes: [[18, 18], [82, 18], [94, 82], [6, 82], [50, 50]], links: [[1, 2], [2, 3], [3, 4], [4, 1], [1, 5], [5, 3]] },
  { name: "Lira", nodes: [[50, 8], [26, 32], [74, 32], [32, 84], [68, 84]], links: [[1, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5]] },
  { name: "Letra T", nodes: [[10, 14], [50, 14], [90, 14], [50, 52], [50, 90]], links: [[1, 2], [2, 3], [2, 4], [4, 5]] },
];

export function constellationShape(index: number): ConstellationShape {
  return CONSTELLATION_SHAPES[((index % CONSTELLATION_SHAPES.length) + CONSTELLATION_SHAPES.length) % CONSTELLATION_SHAPES.length];
}

/** Nível da constelação em que a linha aparece (a estrela de maior número entre as duas). */
export function linkLevel(link: [number, number]): number {
  return Math.max(link[0], link[1]);
}

/** Pontos (x,y) de uma estrela de 5 pontas centrada em (cx, cy). */
export function starPolygon(cx: number, cy: number, outer: number, inner = outer * .46): string {
  return Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 ? inner : outer;
    const angle = (-90 + i * 36) * Math.PI / 180;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}
