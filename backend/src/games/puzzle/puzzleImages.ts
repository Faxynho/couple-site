/**
 * Catálogo de imagens disponíveis para o quebra-cabeça.
 * Para adicionar uma nova imagem: solte o arquivo em
 * `frontend/public/images/puzzle/` e acrescente uma linha aqui.
 */
export const PUZZLE_IMAGES = [
  { id: "aurora", label: "Aurora", file: "/images/puzzle/aurora.jpg" },
  { id: "jardim", label: "Jardim", file: "/images/puzzle/jardim.jpg" },
  { id: "oceano", label: "Oceano", file: "/images/puzzle/oceano.jpg" },
  { id: "por-do-sol", label: "Pôr do sol", file: "/images/puzzle/por-do-sol.jpg" },
  { id: "fravia", label: "Fravia", file: "/images/puzzle/fravia.jpg" },
] as const;

export type PuzzleImageId = (typeof PUZZLE_IMAGES)[number]["id"];

export function isValidImageId(id: string): id is PuzzleImageId {
  return PUZZLE_IMAGES.some((img) => img.id === id);
}
