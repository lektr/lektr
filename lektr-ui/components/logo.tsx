"use client";

import Image from "next/image";
import { useTheme } from "@/lib/theme-context";

export function Logo({ className = "" }: { className?: string }) {
  const { resolvedTheme } = useTheme();

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Mobile Icon (always visible on small screens, hidden on md) */}
      <div className="nav:hidden">
        <Image
          src="/logo-icon.svg"
          alt="Lektr Logo"
          width={36}
          height={36}
          priority
          className="w-9 h-9"
        />
      </div>

      {/* Desktop Full Logo (hidden on small screens, visible on md) */}
      <div className="hidden nav:block">
        <Image
          src={resolvedTheme === "dark" ? "/logo-inverted.svg" : "/logo.svg"}
          alt="Lektr"
          width={112}
          height={36}
          priority
          className="h-9 w-auto"
        />
      </div>
    </div>
  );
}
