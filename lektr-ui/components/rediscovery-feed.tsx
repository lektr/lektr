"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRediscoveryHighlights } from "@/lib/api";
import { RediscoveryCard } from "@/components/rediscovery-card";
import { RefreshCw, Sparkles } from "lucide-react";
import { useState, useCallback } from "react";

interface RediscoveryFeedProps {
  count?: number;
  showHeader?: boolean;
}

export function RediscoveryFeed({
  count = 5,
  showHeader = true,
}: RediscoveryFeedProps) {
  const queryClient = useQueryClient();
  const [shuffleKey, setShuffleKey] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rediscovery", count, shuffleKey],
    queryFn: () => getRediscoveryHighlights(count),
    staleTime: Infinity, // Don't auto-refetch — user controls shuffle
  });

  const handleShuffle = useCallback(() => {
    setIsShuffling(true);
    setShuffleKey((k) => k + 1);
    // Reset animation state after a short delay
    setTimeout(() => setIsShuffling(false), 600);
  }, []);

  if (isLoading) {
    return <RediscoveryFeedSkeleton count={count} showHeader={showHeader} />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">
          {error instanceof Error
            ? error.message
            : "Couldn't load your highlights"}
        </p>
        <button
          onClick={handleShuffle}
          className="btn btn-secondary mt-3 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  const highlights = data?.highlights ?? [];

  if (highlights.length === 0) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nothing to rediscover yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Import your first highlights from Kindle or KOReader to start
          rediscovering gems from your reading.
        </p>
      </div>
    );
  }

  return (
    <div>
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Rediscover</h2>
              <p className="text-xs text-muted-foreground">
                Random highlights from your library
              </p>
            </div>
          </div>

          <button
            onClick={handleShuffle}
            disabled={isShuffling}
            className="btn btn-secondary px-4! py-2! min-h-0! text-sm gap-2 cursor-pointer"
            title="Show different highlights"
          >
            <RefreshCw
              className={`w-4 h-4 ${isShuffling ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
        </div>
      )}

      <div
        className={`grid gap-5 ${
          count <= 5
            ? "sm:grid-cols-2 lg:grid-cols-3"
            : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }`}
      >
        {highlights.map((hl, i) => (
          <RediscoveryCard key={hl.id} highlight={hl} index={i} />
        ))}
      </div>
    </div>
  );
}

function RediscoveryFeedSkeleton({
  count,
  showHeader,
}: {
  count: number;
  showHeader: boolean;
}) {
  return (
    <div>
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="skeleton w-9 h-9 rounded-xl" />
            <div className="space-y-1.5">
              <div className="skeleton h-5 w-24 rounded" />
              <div className="skeleton h-3 w-40 rounded" />
            </div>
          </div>
          <div className="skeleton h-9 w-24 rounded-full" />
        </div>
      )}
      <div
        className={`grid gap-5 ${
          count <= 5
            ? "sm:grid-cols-2 lg:grid-cols-3"
            : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }`}
      >
        {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-6">
            <div className="skeleton w-6 h-6 rounded mb-3" />
            <div className="space-y-2 mb-4">
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
            <div className="skeleton h-px w-full mb-4" />
            <div className="flex items-center gap-3">
              <div className="skeleton w-8 h-12 rounded-md" />
              <div className="space-y-1.5">
                <div className="skeleton h-4 w-28 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
