"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { hsvToHex } from "@/lib/colorTypes";

interface ColorPickerProps {
  round: number;
  totalRounds: number;
  onSubmit: (h: number, s: number, v: number) => void;
}

interface SliderProps {
  label: string;
  value: number;
  max: number;
  trackBackground: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, max, trackBackground, onChange }: SliderProps) {
  const percent = (value / max) * 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-soft">
        <span>{label}</span>
        <span className="tabular-nums text-ink">{value}</span>
      </div>
      <div className="relative h-4 w-full">
        <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full" style={{ background: trackBackground }} />
        <input
          type="range"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-4 w-full cursor-pointer opacity-0"
        />
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-ink bg-white shadow-soft"
          style={{ left: `calc(${percent}% - 10px)` }}
        />
      </div>
    </div>
  );
}

export default function ColorPicker({ round, totalRounds, onSubmit }: ColorPickerProps) {
  const [h, setH] = useState(180);
  const [s, setS] = useState(50);
  const [v, setV] = useState(50);

  const preview = hsvToHex(h, s, v);
  const hueRainbow =
    "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)";
  const satTrack = `linear-gradient(to right, #ffffff, hsl(${h}, 100%, 50%))`;
  const valTrack = `linear-gradient(to right, #000000, hsl(${h}, ${s}%, 50%))`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex w-full max-w-md flex-col items-center gap-4"
    >
      <div className="flex w-full items-center justify-between px-1">
        <p className="text-xs uppercase tracking-wide text-ink-soft">
          Rodada {round + 1} de {totalRounds}
        </p>
        <p className="text-xs font-medium text-ink-soft">Recriem de memória</p>
      </div>

      <div
        className="aspect-[4/5] w-full rounded-xl3 shadow-glow transition-colors duration-150 sm:aspect-square"
        style={{ background: preview }}
      />

      <div className="glass-panel flex w-full flex-col gap-4 rounded-xl3 p-5">
        <Slider label="Matiz" value={h} max={359} trackBackground={hueRainbow} onChange={setH} />
        <Slider label="Saturação" value={s} max={100} trackBackground={satTrack} onChange={setS} />
        <Slider label="Brilho" value={v} max={100} trackBackground={valTrack} onChange={setV} />

        <button
          onClick={() => onSubmit(h, s, v)}
          className="mt-1 w-full rounded-full bg-rose px-6 py-3 font-display font-medium text-white shadow-glow transition-colors hover:bg-rose-deep"
        >
          Confirmar palpite
        </button>
      </div>
    </motion.div>
  );
}
