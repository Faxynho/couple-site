"use client";

import { useEffect, useState } from "react";
import { measureImage } from "@/lib/imageDimensions";

export interface PuzzleImageOption {
  file: string;
  label: string;
  width: number;
  height: number;
}

export function usePuzzleImages() {
  const [images, setImages] = useState<PuzzleImageOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/puzzle-images");
        const data: { images: { file: string; label: string }[] } = await res.json();
        const list = data.images ?? [];

        const withDims = await Promise.all(
          list.map(async (img) => {
            try {
              const { width, height } = await measureImage(img.file);
              return { ...img, width, height };
            } catch {
              return { ...img, width: 1000, height: 1000 };
            }
          })
        );

        if (!cancelled) setImages(withDims);
      } catch {
        if (!cancelled) setImages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { images, loading };
}