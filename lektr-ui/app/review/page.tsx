"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { getReviewQueue, submitRating, type ReviewItem } from "@/lib/api";
import { AuthGuard } from "@/components/auth-guard";
import { PageHeader } from "@/components/page-header";

type Rating = "again" | "hard" | "good" | "easy";

const ratingConfig: Record<Rating, { label: string; key: string; color: string }> = {
  again: { label: "Again", key: "1", color: "bg-error/15 text-error hover:bg-error/25" },
  hard: { label: "Hard", key: "2", color: "bg-warning/15 text-warning hover:bg-warning/25" },
  good: { label: "Good", key: "3", color: "bg-success/15 text-success hover:bg-success/25" },
  easy: { label: "Easy", key: "4", color: "bg-primary/15 text-primary hover:bg-primary/25" },
};

export default function ReviewPage() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["review"],
    queryFn: getReviewQueue,
  });

  const ratingMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: Rating }) => submitRating(id, rating),
    onSuccess: (_, variables) => {
      setShowAnswer(false);
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      queryClient.invalidateQueries({ queryKey: ["review"] });
      
      // Show completion toast on last item
      if (nextIndex >= total) {
        toast.success("Review session complete!", {
          description: `You reviewed ${total} highlight${total !== 1 ? 's' : ''} today.`,
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to save rating", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    },
  });

  const items = data?.items ?? [];
  const total = items.length;
  const currentItem = items[currentIndex];

  const handleRate = useCallback(
    (rating: Rating) => {
      if (!currentItem || ratingMutation.isPending) return;
      ratingMutation.mutate({ id: currentItem.id, rating });
    },
    [currentItem, ratingMutation]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showAnswer) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setShowAnswer(true);
        }
        return;
      }

      const keyMap: Record<string, Rating> = { "1": "again", "2": "hard", "3": "good", "4": "easy" };
      if (keyMap[e.key]) {
        e.preventDefault();
        handleRate(keyMap[e.key]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAnswer, handleRate]);

  if (isLoading) {
    return (
      <div className="container pt-10 pb-8 sm:pt-14 sm:pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="skeleton h-2 w-full rounded-full mb-8" />
          <div className="card min-h-[400px] animate-pulse">
            <div className="space-y-4 p-6">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-6 w-full" />
              <div className="skeleton h-6 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-8 sm:pt-8 sm:pb-12">
        <div className="max-w-md mx-auto text-center">
          <p className="text-error mb-4">{error instanceof Error ? error.message : "Failed to load review"}</p>
          <Link href="/login" className="btn btn-primary">Sign in to start reviewing</Link>
        </div>
      </div>
    );
  }

  if (currentIndex >= total || total === 0) {
    return (
      <div className="container py-16 sm:py-24">
        <div className="max-w-md mx-auto text-center animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-success/10 flex items-center justify-center">
            <span className="text-5xl">{total === 0 ? "📚" : "🎉"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">
            {total === 0 ? "No highlights to review" : "Review Complete!"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {total === 0 ? "Import some highlights to start your daily review." : "Great work! Come back tomorrow for more."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/library" className="btn btn-primary">View Library</Link>
            {total > 0 && (
              <button onClick={() => { setCurrentIndex(0); refetch(); }} className="btn btn-secondary">Review Again</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="container py-8 max-w-[1200px] mx-auto min-h-screen">
        <div className="max-w-2xl mx-auto">
          <PageHeader
            title="Daily Review"
            description={
              <div className="flex items-center justify-between text-sm text-muted-foreground w-full">
                <span>{currentIndex + 1} of {total}</span>
              </div>
            }
          >
             <div className="progress mt-2">
              <div className="progress-bar" style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
            </div>
          </PageHeader>

          {/* Card */}
          <div
            className={`card min-h-[350px] sm:min-h-[400px] flex flex-col cursor-pointer transition-all animate-slide-up ${showAnswer ? "" : "hover:border-primary/30"}`}
            onClick={() => !showAnswer && setShowAnswer(true)}
          >
            <div className="text-sm text-muted-foreground mb-4 sm:mb-6">
              <span className="font-medium">{currentItem.book.title}</span>
              {currentItem.book.author && <span className="text-muted-foreground/70"> · {currentItem.book.author}</span>}
            </div>

            <blockquote className="flex-1 text-lg sm:text-xl leading-relaxed" style={{ fontFamily: "var(--font-literata), Georgia, serif" }}>
              "{currentItem.content}"
            </blockquote>

            {showAnswer && currentItem.note && (
              <div className="mt-6 pt-6 border-t border-border animate-fade-in">
                <p className="text-sm text-muted-foreground italic">
                  <span className="font-medium not-italic">Your note:</span> {currentItem.note}
                </p>
              </div>
            )}

            {!showAnswer && (
              <p className="text-center text-sm text-muted-foreground mt-6 animate-pulse">Tap to reveal · Space/Enter</p>
            )}
          </div>

          {/* Rating buttons */}
          {showAnswer && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 sm:mt-6 animate-slide-up">
              {(Object.entries(ratingConfig) as [Rating, typeof ratingConfig[Rating]][]).map(([rating, { label, key, color }]) => (
                <button
                  key={rating}
                  onClick={() => handleRate(rating)}
                  disabled={ratingMutation.isPending}
                  className={`py-3 sm:py-4 rounded-full font-medium transition-all disabled:opacity-50 ${color}`}
                >
                  <span className="block">{label}</span>
                  <span className="text-xs opacity-60 hide-mobile">{key}</span>
                </button>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6 hide-mobile">Keyboard: 1-4 to rate, Space/Enter to reveal</p>
        </div>
      </div>
    </AuthGuard>
  );
}
