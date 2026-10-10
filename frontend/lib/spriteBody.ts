/**
 * Mede o "corpo" de um sprite (o maior pedaço opaco, sem brilhos/partículas soltos) dentro do quadrado onde ele é desenhado
 * com object-fit: contain. É assim que o jogo iguala o tamanho do sprite DESPERTADO ao do sprite NORMAL na tela inicial,
 * para QUALQUER personagem — inclusive sprites novos colocados em /idle/characters/awake/ — sem tabelas manuais.
 *
 * Todas as medidas são frações (0–1) do quadrado do sprite.
 */
export interface SpriteBody {
  /** Largura/altura do corpo. */
  w: number;
  h: number;
  /** Centro do corpo. */
  cx: number;
  cy: number;
  /** Área ocupada pelo corpo (fração do quadrado). */
  area: number;
}

const SIZE = 160;
const cache = new Map<string, Promise<SpriteBody | null>>();

function analyse(image: HTMLImageElement): SpriteBody | null {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE; canvas.height = SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || !image.naturalWidth || !image.naturalHeight) return null;
  const scale = SIZE / Math.max(image.naturalWidth, image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  context.drawImage(image, (SIZE - width) / 2, (SIZE - height) / 2, width, height);
  let pixels: Uint8ClampedArray;
  try { pixels = context.getImageData(0, 0, SIZE, SIZE).data; } catch { return null; }
  return bodyOfAlpha(Uint8ClampedArray.from({ length: SIZE * SIZE }, (_, index) => pixels[index * 4 + 3]), SIZE);
}

/** Núcleo da medição (separado para poder ser testado sem canvas). */
export function bodyOfAlpha(alpha: ArrayLike<number>, size: number): SpriteBody | null {
  const total = size * size;
  const solid = new Uint8Array(total);
  for (let index = 0; index < total; index += 1) if (alpha[index] > 110) solid[index] = 1;
  // "engorda" 3 px para unir o corpo e deixar de fora brilhos e estrelinhas separados
  const grown = new Uint8Array(total);
  const radius = 3;
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    if (!solid[y * size + x]) continue;
    for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < size && ny < size) grown[ny * size + nx] = 1;
    }
  }
  const seen = new Uint8Array(total);
  let best: { count: number; minX: number; minY: number; maxX: number; maxY: number } | null = null;
  const stack: number[] = [];
  for (let start = 0; start < total; start += 1) {
    if (!grown[start] || seen[start]) continue;
    let count = 0, minX = size, minY = size, maxX = 0, maxY = 0;
    stack.push(start); seen[start] = 1;
    while (stack.length) {
      const current = stack.pop()!;
      const x = current % size, y = (current - x) / size;
      if (solid[current]) { count += 1; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      for (const next of [current - 1, current + 1, current - size, current + size]) {
        if (next < 0 || next >= total || !grown[next] || seen[next]) continue;
        if ((next === current - 1 && x === 0) || (next === current + 1 && x === size - 1)) continue;
        seen[next] = 1; stack.push(next);
      }
    }
    if (count > 0 && (!best || count > best.count)) best = { count, minX, minY, maxX, maxY };
  }
  if (!best) return null;
  const w = (best.maxX - best.minX + 1) / size, h = (best.maxY - best.minY + 1) / size;
  return { w, h, cx: (best.minX + best.maxX + 1) / 2 / size, cy: (best.minY + best.maxY + 1) / 2 / size, area: best.count / total };
}

export function measureSpriteBody(src: string): Promise<SpriteBody | null> {
  if (typeof window === "undefined" || typeof Image === "undefined") return Promise.resolve(null);
  let cached = cache.get(src);
  if (!cached) {
    cached = new Promise<SpriteBody | null>((resolve) => {
      const image = new window.Image();
      image.decoding = "async";
      image.onload = () => resolve(analyse(image));
      image.onerror = () => resolve(null);
      image.src = src;
    });
    cache.set(src, cached);
  }
  return cached;
}

export interface AwakeFit {
  /** transform CSS (translate + scale, origem no centro) aplicado ao sprite despertado. */
  transform: string;
  /** Centro do corpo (em % do quadro) — onde a aura deve ficar. */
  centerX: number;
  centerY: number;
}

/**
 * Ajuste para o sprite despertado ocupar o MESMO espaço do normal: mesma "massa" visual (raiz da razão das áreas),
 * limitada para evitar erros bobos, e mesmo centro do corpo.
 */
export function awakeFitFor(normal: SpriteBody, awake: SpriteBody): AwakeFit {
  const scale = Math.max(.55, Math.min(1.6, Math.sqrt(normal.area / Math.max(awake.area, 1e-6))));
  const x = normal.cx - .5 - scale * (awake.cx - .5);
  const y = normal.cy - .5 - scale * (awake.cy - .5);
  return { transform: `translate(${(x * 100).toFixed(2)}%, ${(y * 100).toFixed(2)}%) scale(${scale.toFixed(4)})`, centerX: normal.cx * 100, centerY: normal.cy * 100 };
}

const fitCache = new Map<string, Promise<AwakeFit | null>>();
export function measureAwakeFit(normalSrc: string, awakeSrc: string): Promise<AwakeFit | null> {
  const key = `${normalSrc}|${awakeSrc}`;
  let cached = fitCache.get(key);
  if (!cached) {
    cached = Promise.all([measureSpriteBody(normalSrc), measureSpriteBody(awakeSrc)]).then(([normal, awake]) => (normal && awake ? awakeFitFor(normal, awake) : null));
    fitCache.set(key, cached);
  }
  return cached;
}
