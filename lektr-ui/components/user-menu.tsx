"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { logout } from "@/lib/api";
import Link from "next/link";
import { Settings, LogOut, Sun, Moon, Monitor, ChevronDown, Shield } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

interface UserMenuProps {
  user: { email: string; role: string };
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      window.location.href = "/login";
    },
  });

  const initial = user.email[0].toUpperCase();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  const themes = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
    { value: "auto" as const, icon: Monitor, label: "Auto" },
  ];

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Avatar trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-1 rounded-full hover:bg-muted/50 transition-colors cursor-pointer"
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
          {initial}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Email */}
          <div className="px-3 py-2.5 border-b border-border/50">
            <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>

          {/* Theme switcher */}
          <div className="px-3 py-2.5 border-b border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Theme</p>
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
              {themes.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    theme === value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-1.5">
            <Link
              href="/settings/account"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-muted/50 transition-colors"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              Settings
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-muted/50 transition-colors"
              >
                <Shield className="w-4 h-4 text-muted-foreground" />
                Admin
              </Link>
            )}
            <button
              onClick={() => {
                logoutMutation.mutate();
                setIsOpen(false);
              }}
              disabled={logoutMutation.isPending}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-error hover:bg-error/10 transition-colors w-full text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
