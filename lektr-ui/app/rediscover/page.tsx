"use client";

import { AuthGuard } from "@/components/auth-guard";
import { RediscoveryFeed } from "@/components/rediscovery-feed";
import { PageHeader } from "@/components/page-header";
import { RefreshCw } from "lucide-react";

export default function RediscoverPage() {
  return (
    <AuthGuard>
      <div className="container py-8 min-h-screen">
        <PageHeader
          title="Rediscover"
          description="Random highlights surfaced from across your library"
        />
        <RediscoveryFeed count={12} />
      </div>
    </AuthGuard>
  );
}
