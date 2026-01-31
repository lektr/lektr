"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  backUrl?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  backUrl,
  backLabel = "Back",
  actions,
  children,
  className,
}: PageHeaderProps) {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("from");
  
  // Determine effective back URL
  // If 'from' param exists, we prioritize it (assuming it's safe/internal)
  // Otherwise fall back to provided backUrl
  const effectiveBackUrl = fromUrl || backUrl;

  const effectiveBackLabel = fromUrl 
    ? (fromUrl === "/" ? "Home" : "Back") 
    : backLabel;

  return (
    <div className={cn("flex flex-col gap-6 mb-8 animate-fade-in", className)}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-4 flex-1">
          {effectiveBackUrl && (
            <Link 
              href={effectiveBackUrl}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-0 py-1 rounded-full -ml-1 text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{effectiveBackLabel}</span>
            </Link>
          )}
          
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <div className="mt-2 text-muted-foreground text-lg">
                {description}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-3 pt-1 md:pt-8">
            {actions}
          </div>
        )}
      </div>

      {children && (
        <div className="w-full">
          {children}
        </div>
      )}
    </div>
  );
}
