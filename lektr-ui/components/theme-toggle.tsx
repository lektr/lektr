"use client";

import { useTheme } from "@/lib/theme-context";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "auto" : "light";
    setTheme(next);
  };

  const icon = theme === "dark" ? (
    <Moon className="w-4 h-4" />
  ) : theme === "light" ? (
    <Sun className="w-4 h-4" />
  ) : (
    <Monitor className="w-4 h-4" />
  );

  const label = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "Auto";

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-1.5 p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/50 rounded-full cursor-pointer"
      title={`Theme: ${label} (click to cycle)`}
    >
      {icon}
      <span className="hidden lg:inline text-xs font-medium">{label}</span>
    </button>
  );
}
