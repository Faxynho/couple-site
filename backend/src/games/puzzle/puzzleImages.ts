/**
 * As imagens agora são descobertas dinamicamente pela pasta
 * `frontend/public/images/puzzle/` (ver `frontend/app/api/puzzle-images/route.ts`)
 * — não existe mais uma lista fixa aqui. O `imageId` que chega neste servidor
 * já é o caminho completo do arquivo, com o nome codificado como URL (ex.:
 * "/images/puzzle/imagem%20dois.jpg" para um arquivo "imagem dois.jpg") —
 * então validamos a forma codificada e, depois de decodificar, o nome em si.
 */
const ENCODED_IMAGE_ID_PATTERN = /^\/images\/puzzle\/[a-zA-Z0-9 _.%-]+\.(jpg|jpeg|png|webp)$/i;
const DECODED_IMAGE_ID_PATTERN = /^\/images\/puzzle\/[a-zA-Z0-9 _.-]+\.(jpg|jpeg|png|webp)$/i;

export function isValidImageId(id: string): boolean {
  if (typeof id !== "string" || id.length >= 300) return false;
  if (!ENCODED_IMAGE_ID_PATTERN.test(id)) return false;
  try {
    // Decodifica e valida de novo com o mesmo conjunto de caracteres seguro —
    // sem isso, uma sequência "%2e%2e%2f" (".." codificado) passaria batida
    // pelo primeiro regex e poderia tentar escapar da pasta de imagens.
    const decoded = decodeURIComponent(id);
    return DECODED_IMAGE_ID_PATTERN.test(decoded) && !decoded.includes("..");
  } catch {
    return false;
  }
}

/** Fallback genérico, usado só se o cliente não enviar a dimensão real medida. */
export function getFallbackDimensions(): { width: number; height: number } {
  return { width: 1000, height: 1000 };
}

/**
 * Dificuldades disponíveis. Cada uma é só uma META aproximada de peças — a
 * combinação real de linhas x colunas é calculada por `computeGrid` em
 * PuzzleGame.ts, respeitando a proporção de cada imagem. Para adicionar uma
 * nova dificuldade (ex.: 300 peças), basta acrescentar uma entrada aqui.
 */
export const DIFFICULTIES = {
  easy: { label: "Fácil", targetPieces: 30 },
  medium: { label: "Médio", targetPieces: 70 },
  hard: { label: "Difícil", targetPieces: 150 },
} as const;

export type Difficulty = keyof typeof DIFFICULTIES;

export function isValidDifficulty(value: string): value is Difficulty {
  return Object.prototype.hasOwnProperty.call(DIFFICULTIES, value);
}
