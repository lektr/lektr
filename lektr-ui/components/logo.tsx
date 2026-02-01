"use client";

import Image from "next/image";
import { useTheme } from "@/lib/theme-context";

export function Logo({ className = "" }: { className?: string }) {
  const { resolvedTheme } = useTheme();

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Mobile Icon (always visible on small screens, hidden on md) */}
      <div className="md:hidden">
        <Image
          src="/logo-icon.svg"
          alt="Lektr Logo"
          width={32}
          height={32}
          priority
          className="w-8 h-8"
        />
      </div>

      {/* Desktop Full Logo (hidden on small screens, visible on md) */}
      <div className="hidden md:block">
        <Image
          src={resolvedTheme === "dark" ? "/logo-inverted.svg" : "/logo.svg"}
          alt="Lektr"
          width={100}
          height={32}
          priority
          className="h-8 w-auto"
        />
      </div>
    </div>
  );
}
