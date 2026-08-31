"use client";

import { useRef } from "react";
import { Search, X } from "lucide-react";

/** Normaliza nomes e buscas para que acentos, caixa e pontuação não impeçam
 * um resultado (por exemplo, "memoria" encontra "Memória"). */
export function normalizeGameSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

interface GameSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export default function GameSearch({ value, onChange }: GameSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <Search
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
      />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Pesquisar jogos..."
        aria-label="Pesquisar jogos"
        type="search"
        className="w-full appearance-none rounded-xl3 border border-surface/70 bg-surface/55 py-3 pl-11 pr-11 text-sm text-ink shadow-sm outline-none backdrop-blur-sm transition focus:border-rose/70 focus:bg-surface/75 focus:ring-2 focus:ring-rose/15 placeholder:text-ink-soft/70"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Limpar pesquisa"
          title="Limpar pesquisa"
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface hover:text-ink"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
