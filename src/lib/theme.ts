import { useEffect, useState } from "react";

export type ThemeMode = "system" | "dark" | "light";

const THEME_KEY = "blocks-app:theme-mode";

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const raw = window.localStorage.getItem(THEME_KEY);
  if (raw === "dark" || raw === "light" || raw === "system") return raw;
  return "system";
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  if (mode === "dark") root.classList.add("dark");
  else if (mode === "light") root.classList.add("light");
  // 'system' removes both classes so prefers-color-scheme takes over.
}

export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_KEY, mode);
    }
  }, [mode]);

  return [mode, setMode];
}
