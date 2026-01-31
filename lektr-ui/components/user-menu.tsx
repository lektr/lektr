"use client";

import { useMutation } from "@tanstack/react-query";
import { logout } from "@/lib/api";

export function UserMenu() {
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      window.location.href = "/login";
    },
  });

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
        A
      </div>
      <button
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap cursor-pointer"
      >
        Sign Out
      </button>
    </div>
  );
}
