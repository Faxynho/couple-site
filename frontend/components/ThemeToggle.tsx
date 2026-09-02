"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { applyTheme, setStoredTheme, Theme } from "@/lib/theme";

export default function ThemeToggle() {
  // Começa como `null` (nada renderizado) até montar no navegador — a classe
  // "dark" já foi decidida por um script síncrono no <head> (ver layout.tsx),
  // então só depois de montado é seguro ler o tema real sem risco de o React
  // "brigar" com o que o script já aplicou (erro de hidratação).
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(current);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setStoredTheme(next);
    setTheme(next);
  };

  if (theme === null) {
    // Placeholder do mesmo tamanho, invisível — evita um "pulo" de layout
    // no primeiro frame enquanto o tema real ainda não foi lido.
    return <div className="fixed right-4 top-4 z-50 h-11 w-11" aria-hidden="true" />;
  }

  return (
    <motion.button
      type="button"
      onClick={toggle}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.9 }}
      aria-label={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
      className="global-control theme-control glass-panel fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full text-ink shadow-soft"
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.span
            key="sun"
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-center"
          >
            <Sun size={18} />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ opacity: 0, rotate: 90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-center"
          >
            <Moon size={18} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
