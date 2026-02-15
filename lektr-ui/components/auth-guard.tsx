"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: "admin";
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["auth"],
    queryFn: getCurrentUser,
  });

  useEffect(() => {
    if (!isLoading && (!data?.user || isError)) {
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/login?returnUrl=${returnUrl}`);
    }
  }, [data, isLoading, isError, router, pathname]);

  if (isLoading) {
    return (
      <div className="container py-20">
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      </div>
    );
  }

  if (!data?.user) {
    return null;
  }

  if (requiredRole && data.user.role !== requiredRole) {
    return (
      <div className="container py-20">
        <div className="text-center">
          <h1 className="text-2xl font-serif font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
