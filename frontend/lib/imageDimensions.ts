"use client";

/**
 * Mede a dimensão REAL de uma imagem no navegador (naturalWidth/naturalHeight).
 * É essa medida — não um metadado digitado à mão — que decide a proporção
 * do quebra-cabeça, para nunca esticar ou girar a imagem original.
 */
export function measureImage(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      } else {
        reject(new Error("Dimensões inválidas"));
      }
    };
    img.onerror = () => reject(new Error("Falha ao carregar a imagem"));
    img.src = src;
  });
}
