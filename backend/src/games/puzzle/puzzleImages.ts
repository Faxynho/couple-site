/**
 * As imagens agora são descobertas dinamicamente pela pasta
 * `frontend/public/images/puzzle/` (ver `frontend/app/api/puzzle-images/route.ts`)
 * — não existe mais uma lista fixa aqui. O `imageId` que chega neste servidor
 * já é o caminho completo do arquivo (ex.: "/images/puzzle/aurora.jpg"),
 * então só validamos que ele parece um caminho seguro dessa pasta.
 */
const SAFE_IMAGE_ID_PATTERN = /^\/images\/puzzle\/[a-zA-Z0-9 _.-]+\.(jpg|jpeg|png|webp)$/i;

export function isValidImageId(id: string): boolean {
  return typeof id === "string" && id.length < 300 && SAFE_IMAGE_ID_PATTERN.test(id);
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