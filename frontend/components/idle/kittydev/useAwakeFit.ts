"use client";

import { useEffect, useState } from "react";
import { AwakeFit, measureAwakeFit, measureSpriteBody } from "@/lib/spriteBody";

/** Ajuste (tamanho + posição) do sprite despertado na tela inicial; undefined enquanto não foi medido. */
export function useAwakeFit(normalSrc: string, awakeSrc: string | null): AwakeFit | null | undefined {
  const [fit, setFit] = useState<AwakeFit | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setFit(undefined);
    if (!awakeSrc) return;
    void measureAwakeFit(normalSrc, awakeSrc).then((value) => { if (alive) setFit(value); });
    return () => { alive = false; };
  }, [normalSrc, awakeSrc]);
  return fit;
}

/** Centro do corpo do sprite normal (para a aura de quem já despertou usando a skin normal). */
export function useBodyCenter(src: string, enabled: boolean): { x: number; y: number } | undefined {
  const [center, setCenter] = useState<{ x: number; y: number } | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    if (!enabled) return;
    void measureSpriteBody(src).then((body) => { if (alive && body) setCenter({ x: body.cx * 100, y: body.cy * 100 }); });
    return () => { alive = false; };
  }, [src, enabled]);
  return center;
}
