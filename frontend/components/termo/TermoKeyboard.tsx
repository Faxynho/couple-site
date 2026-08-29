"use client";

import { Delete } from "lucide-react";
import { TermoLetterState } from "@/lib/termoTypes";

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

interface TermoKeyboardProps {
  states: Record<string, (TermoLetterState | null)[]>;
  boardCount: number;
  disabled: boolean;
  onKey: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}

const PRIORITY: Record<TermoLetterState, number> = { absent: 1, present: 2, correct: 3 };
const CLASS: Record<TermoLetterState, string> = {
  correct: "bg-green-600 text-white",
  present: "bg-amber-500 text-white",
  absent: "bg-stone-500 text-white",
};

function aggregate(states: (TermoLetterState | null)[]) {
  return states.reduce<TermoLetterState | null>((best, state) => !state || (best && PRIORITY[best] >= PRIORITY[state]) ? best : state, null);
}

export default function TermoKeyboard({ states, boardCount, disabled, onKey, onEnter, onBackspace }: TermoKeyboardProps) {
  return (
    <div className="w-full max-w-[min(96vw,620px)] select-none space-y-[clamp(.3rem,.65vh,.5rem)]" aria-label="Teclado virtual">
      {ROWS.map((row, rowIndex) => (
        <div key={row} className={`flex justify-center gap-[clamp(.2rem,.55vw,.375rem)] ${rowIndex === 2 ? "px-0" : "px-2 sm:px-6"}`}>
          {rowIndex === 2 && <KeyButton label="Enter" disabled={disabled} onClick={onEnter} wide />}
          {[...row].map((key) => {
            const keyStates = states[key] ?? Array.from({ length: boardCount }, () => null);
            const primary = aggregate(keyStates);
            return (
              <KeyButton key={key} label={key} disabled={disabled} onClick={() => onKey(key)} state={primary} indicators={boardCount > 1 ? keyStates : undefined} />
            );
          })}
          {rowIndex === 2 && <KeyButton label="Apagar" disabled={disabled} onClick={onBackspace} wide icon />}
        </div>
      ))}
    </div>
  );
}

function KeyButton({ label, disabled, onClick, state, indicators, wide, icon }: { label: string; disabled: boolean; onClick: () => void; state?: TermoLetterState | null; indicators?: (TermoLetterState | null)[]; wide?: boolean; icon?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={`relative flex h-[clamp(2.1rem,4.6vh,3rem)] min-w-0 items-center justify-center overflow-hidden rounded-lg px-1 text-xs font-semibold uppercase shadow-sm transition-transform active:scale-95 disabled:opacity-60 ${
        wide ? "w-[16%] max-w-20 text-[10px] sm:text-xs" : "flex-1 max-w-12"
      } ${state ? CLASS[state] : "bg-surface/85 text-ink hover:bg-surface"}`}
    >
      {icon ? <Delete size={17} /> : label}
      {indicators && (
        <span className="absolute inset-x-1 bottom-0.5 flex h-1 gap-px" aria-hidden="true">
          {indicators.map((indicator, index) => <span key={index} className={`flex-1 rounded-full ${indicator ? CLASS[indicator].split(" ")[0] : "bg-ink-soft/20"}`} />)}
        </span>
      )}
    </button>
  );
}
