"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getBookStudySession,
  submitDeckReview,
  getBook,
  type StudyItem
} from "@/lib/api";

import { AuthGuard } from "@/components/auth-guard";
import { Flashcard } from "@/components/flashcard";
import { ArrowLeft, CheckCircle2, BookOpen } from "lucide-react";
import Link from "next/link";

type Rating = 1 | 2 | 3 | 4;

const ratingConfig: Record<Rating, { label: string; key: string; color: string; desc: string }> = {
  1: { label: "Again", key: "1", color: "bg-error/15 text-error hover:bg-error/25", desc: "< 1m" },
  2: { label: "Hard", key: "2", color: "bg-warning/15 text-warning hover:bg-warning/25", desc: "2d" },
  3: { label: "Good", key: "3", color: "bg-success/15 text-success hover:bg-success/25", desc: "4d" },
  4: { label: "Easy", key: "4", color: "bg-primary/15 text-primary hover:bg-primary/25", desc: "7d" },
};

export default function BookStudyPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookId = params.bookId as string;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0 });

  // Fetch book info for display
  const { data: bookData } = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => getBook(bookId),
    refetchOnWindowFocus: false,
  });

  const bookTitle = bookData?.book?.title ?? "Book";

  const { data, isLoading } = useQuery({
    queryKey: ["book-study-session", bookId],
    queryFn: () => getBookStudySession(bookId, { limit: 20 }),
    refetchOnWindowFocus: false,
  });

  const cards = data?.cards ?? [];
  const currentCard = cards[currentIndex];
  const isFinished = currentIndex >= cards.length && cards.length > 0;
  const isEmpty = cards.length === 0 && !isLoading;

  const reviewMutation = useMutation({
    mutationFn: async ({ card, rating }: { card: StudyItem; rating: Rating }) => {
      if (card.isVirtual) {
        // Virtual cards (raw highlights) in book study mode are for passive review only
        // We skip saving the review since there's no deck to assign them to
        // Just return a dummy response to trigger onSuccess
        return { skipped: true };
      } else {
        return submitDeckReview(card.id, rating);
      }
    },
    onSuccess: () => {
      setSessionStats(prev => ({ reviewed: prev.reviewed + 1 }));
      handleNext();
    },
    onError: (error) => {
      toast.error("Failed to submit review");
      console.error(error);
    },
  });


  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex(prev => prev + 1);
  }, []);

  const handleRate = useCallback((rating: Rating) => {
    if (!currentCard || reviewMutation.isPending) return;
    reviewMutation.mutate({ card: currentCard, rating });
  }, [currentCard, reviewMutation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished || isEmpty || isLoading) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (isFlipped) {
        if (e.key === "1") handleRate(1);
        if (e.key === "2") handleRate(2);
        if (e.key === "3") handleRate(3);
        if (e.key === "4") handleRate(4);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, isFinished, isEmpty, isLoading, handleRate]);

  if (isLoading) {
    return (
      <div className="container py-8 max-w-[800px] mx-auto min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Preparing study session...</p>
        </div>
      </div>
    );
  }

  if (isEmpty || isFinished) {
    return (
      <AuthGuard>
        <div className="container py-8 max-w-[800px] mx-auto min-h-screen flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6 text-success animate-slide-up">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {isEmpty ? "All Caught Up!" : "Session Complete!"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isEmpty
              ? "No highlights to review from this book yet."
              : `You reviewed ${sessionStats.reviewed} cards. Great job!`
            }
          </p>
          <div className="flex gap-4">
            <Link href={`/library/${bookId}`} className="btn btn-secondary flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Back to Book
            </Link>
            <Link href="/library" className="btn btn-primary">
              Library
            </Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="container py-6 max-w-[900px] mx-auto min-h-screen flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <Link
            href={`/library/${bookId}`}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit to</span> {bookTitle.slice(0, 30)}{bookTitle.length > 30 ? "..." : ""}
          </Link>
          <div className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {cards.length}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <Flashcard
            front={currentCard.front}
            back={currentCard.back}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
            cardType={currentCard.cardType}
            highlight={currentCard.highlight}
          />

          <div className="mt-12 w-full max-w-2xl h-24">
            {isFlipped ? (
              <div className="grid grid-cols-4 gap-4 animate-slide-up">
                {(Object.entries(ratingConfig) as [string, typeof ratingConfig[1]][]).map(([rating, config]) => (
                  <button
                    key={rating}
                    onClick={() => handleRate(Number(rating) as Rating)}
                    disabled={reviewMutation.isPending}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${config.color} border border-transparent hover:scale-105 active:scale-95`}
                  >
                    <span className="text-sm font-bold mb-1">{config.label}</span>
                    <span className="text-xs opacity-70 mb-1">{config.desc}</span>
                    <kbd className="px-2 py-0.5 bg-background/50 rounded text-[10px] font-mono opacity-60">
                      {config.key}
                    </kbd>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-full text-muted-foreground text-sm animate-fade-in">
                <p>Press <kbd className="px-2 py-1 bg-muted rounded font-mono mx-1">Space</kbd> to show answer</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
