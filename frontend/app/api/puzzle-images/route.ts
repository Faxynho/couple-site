import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Garante que a pasta seja sempre relida (nunca cacheada) — mesmo em produção.
export const dynamic = "force-dynamic";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function toLabel(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  return base
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Lê de verdade a pasta public/images/puzzle a cada chamada — não existe
 * lista fixa no código. Basta soltar um novo arquivo .jpg/.png/.webp ali
 * que ele aparece aqui automaticamente.
 */
export async function GET() {
  const dir = path.join(process.cwd(), "public", "images", "puzzle");

  let files: string[] = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    files = [];
  }

  const images = files
    .filter((f) => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((filename) => {
      // Codifica o nome do arquivo na URL — sem isso, nomes com espaço (ou
      // outros caracteres especiais) geram uma URL como
      // "/images/puzzle/imagem Dois.jpg", que quebra o `url(...)` do CSS
      // usado para recortar as peças (o navegador só reconhece o pedaço até
      // o primeiro espaço) e a imagem simplesmente não aparece.
      const file = `/images/puzzle/${encodeURIComponent(filename)}`;
      return { file, label: toLabel(filename) };
    });

  return NextResponse.json({ images });
}
