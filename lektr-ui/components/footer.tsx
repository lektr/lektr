"use client";

import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@/lib/api";

export function Footer() {
  const { data: versionInfo } = useQuery({
    queryKey: ["version"],
    queryFn: getVersion,
    staleTime: Infinity, // Version doesn't change during session
    retry: false,
  });

  return (
    <footer className="border-t border-border py-4 mt-auto">
      <div className="container flex justify-center text-xs text-muted-foreground">
        {versionInfo && (
          <span>Lektr v{versionInfo.version}</span>
        )}
      </div>
    </footer>
  );
}
