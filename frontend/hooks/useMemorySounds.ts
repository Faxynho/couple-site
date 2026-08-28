"use client";

import { useCallback } from "react";
import { playSoundEffect } from "@/lib/sound";

export type MemorySound = "flip" | "match" | "wrong" | "combo" | "victory";

export function useMemorySounds() {
  const play = useCallback((sound: MemorySound) => {
    const effect: Parameters<typeof playSoundEffect>[0] = sound === "flip" ? "memoryFlip" : sound === "match" ? "memoryMatch" : sound === "wrong" ? "memoryWrong" : sound === "combo" ? "memoryCombo" : "victory";
    playSoundEffect(effect);
  }, []);

  return { play };
}
