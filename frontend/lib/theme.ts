export type Theme = "light" | "dark";

const STORAGE_KEY = "couple-site:theme";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function setStoredTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * Script injetado direto no <head> (ver layout.tsx) — roda ANTES da página
 * pintar, então a classe "dark" já está certa no primeiro frame. Sem isso,
 * a página sempre nasceria clara e só escureceria um instante depois (o
 * clássico "flash" de tema errado), já que o React só sabe a preferência
 * salva depois de hidratar no navegador.
 */
export const themeInitScript = `
(function() {
  try {
    var stored = window.localStorage.getItem("${STORAGE_KEY}");
    var isDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (isDark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;
