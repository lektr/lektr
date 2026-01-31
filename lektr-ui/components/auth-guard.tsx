"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["auth"],
    queryFn: getCurrentUser,
  });

  useEffect(() => {
    if (!isLoading && (!data?.user || isError)) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/login?returnUrl=${returnUrl}`);
    }
  }, [data, isLoading, isError, router, pathname]);

  if (isLoading) {
    return (
      <div className="container py-20">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!data?.user) {
    return null;
  }

  return <>{children}</>;
}
