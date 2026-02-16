"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/api";
import posthog from "posthog-js";

type Theme = "auto" | "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "dark" | "light";
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("auto");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  // Fetch default theme from API
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000,
  });

  // Initialize theme from localStorage or API default
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const apiDefault = settingsData?.settings?.theme_default?.value as Theme || "auto";
    const initialTheme = stored || apiDefault;
    setThemeState(initialTheme);
    setMounted(true);
  }, [settingsData]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    root.classList.remove("dark", "light");

    let resolved: "dark" | "light";
    if (theme === "auto") {
      resolved = getSystemTheme();
    } else {
      resolved = theme;
    }

    root.classList.add(resolved);
    setResolvedTheme(resolved);

    // Listen for system theme changes when in auto mode
    if (theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? "dark" : "light";
        root.classList.remove("dark", "light");
        root.classList.add(newTheme);
        setResolvedTheme(newTheme);
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    
    if (process.env.NODE_ENV !== 'development') {
      posthog.capture('theme_changed', { theme: newTheme });
    }
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
