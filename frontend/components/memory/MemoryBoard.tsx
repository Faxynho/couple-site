"use client";

import { MemoryPlayerProgress, MemoryPublicSlot } from "@/lib/memoryTypes";
import MemoryCard from "./MemoryCard";

interface MemoryBoardProps {
  slots: MemoryPublicSlot[];
  rows: number;
  cols: number;
  progress: MemoryPlayerProgress;
  previewing: boolean;
  locked: boolean;
  onFlip: (slotId: string) => void;
  celebrating: boolean;
}

export default function MemoryBoard({ slots, rows, cols, progress, previewing, locked, onFlip, celebrating }: MemoryBoardProps) {
  const wrong = progress.mismatchUntil !== null;
  return (
    <div
      className="glass-panel w-full max-w-[min(94vw,620px)] rounded-xl3 p-3 sm:p-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {slots.map((slot) => {
          const revealed = previewing || progress.openSlotIds.includes(slot.id);
          const matched = progress.matchedSlotIds.includes(slot.id);
          const celebrationIndex = matched ? progress.matchedSlotIds.indexOf(slot.id) : -1;
          return (
            <MemoryCard
              key={slot.id}
              slot={slot}
              revealed={revealed}
              matched={matched}
              wrong={wrong && progress.openSlotIds.includes(slot.id)}
              disabled={locked || previewing || progress.mismatchUntil !== null}
              onFlip={() => onFlip(slot.id)}
              celebrating={celebrating}
              celebrationIndex={Math.max(0, celebrationIndex)}
            />
          );
        })}
      </div>
      <p className="sr-only">Grade de {rows} por {cols}</p>
    </div>
  );
}
