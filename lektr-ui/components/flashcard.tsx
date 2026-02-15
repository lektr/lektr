"use client";

import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/markdown-renderer";

interface FlashcardProps {
  front: string;
  back: string;
  isFlipped: boolean;
  onFlip: () => void;
  className?: string;
  cardType?: "basic" | "cloze";
  highlight?: { id: string; bookId: string; bookTitle: string } | null;
}

// Regex pattern for Cloze syntax: {{c1::content}}
const CLOZE_PATTERN = /\{\{c(\d+)::(.*?)\}\}/;

function hasCloze(text: string): boolean {
  // Use non-global regex for test to avoid state issues
  return CLOZE_PATTERN.test(text);
}

function renderClozeFront(text: string): string {
  // Replace cloze with a blank indicator (use global here for replace)
  return text.replace(/\{\{c(\d+)::(.*?)\}\}/g, '<span class="inline-block px-2 py-0.5 bg-primary/20 text-primary font-semibold rounded">[...]</span>');
}

function renderClozeBack(text: string): string {
  // Replace cloze with the revealed answer, highlighted
  return text.replace(/\{\{c(\d+)::(.*?)\}\}/g, '<span class="inline-block px-2 py-0.5 bg-success/20 text-success font-semibold rounded">$2</span>');
}

function stripCloze(text: string): string {
  return text.replace(/\{\{c\d+::(.*?)\}\}/g, (_, content) => {
    return content.split("::")[0];
  });
}

export function Flashcard({ front, back, isFlipped, onFlip, className, highlight }: FlashcardProps) {
  const isClozeCard = hasCloze(front);

  // Check if front is just a truncated version of back (virtual card case)
  const frontTrimmed = front.replace(/\.\.\.$/,'').trim();
  const isVirtualCard = back.startsWith(frontTrimmed) && front.endsWith("...");
  const isSameContent = front.trim() === back.trim();

  // For cloze cards, we parse front and sanitize to prevent XSS.
  const frontDisplay = isClozeCard ? DOMPurify.sanitize(renderClozeFront(front)) : null;
  const backDisplay = isClozeCard ? DOMPurify.sanitize(renderClozeBack(front)) : null;

  // Determine labels based on card type
  const frontLabel = isClozeCard ? "Fill in the Blank" : (isVirtualCard || isSameContent) ? "Preview" : "Question";
  const backLabel = isClozeCard ? "Answer" : (isVirtualCard || isSameContent) ? "Full Highlight" : "Answer";

  return (
    <div
      className={cn("w-full max-w-2xl mx-auto h-[400px] cursor-pointer group", className)}
      onClick={onFlip}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onFlip(); } }}
      tabIndex={0}
      role="button"
      aria-label={isFlipped ? "Flashcard showing answer. Press Space to flip." : "Flashcard showing question. Press Space to flip."}
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative w-full h-full transition-transform duration-500 shadow-xl rounded-2xl border border-border/50"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front Face */}
        <div
          className="absolute inset-0 bg-card rounded-2xl p-8 flex flex-col items-center justify-center text-center overflow-y-auto"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg)",
          }}
        >
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            {frontLabel}
          </div>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {isClozeCard ? (
              <div dangerouslySetInnerHTML={{ __html: frontDisplay! }} />
            ) : (
              <MarkdownRenderer content={front} />
            )}
          </div>
          <div className="absolute bottom-4 text-xs text-muted-foreground opacity-50">
            Click or Space to Flip
          </div>
        </div>

        {/* Back Face */}
        <div
          className="absolute inset-0 bg-muted/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center overflow-y-auto"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            {backLabel}
          </div>
          <div className="prose prose-lg dark:prose-invert max-w-none mb-6">
            {isClozeCard ? (
              <>
                <div dangerouslySetInnerHTML={{ __html: backDisplay! }} />
                {back && (
                  <div className="mt-6 pt-4 border-t border-border/50 text-sm text-muted-foreground">
                    <MarkdownRenderer content={stripCloze(back)} />
                  </div>
                )}
              </>
            ) : (
              <MarkdownRenderer content={stripCloze(back)} />
            )}
          </div>

          {highlight && (
            <div className="mt-auto pt-4" onClick={(e) => e.stopPropagation()}>
              <Link
                href={`/library/${highlight.bookId}?highlight=${highlight.id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-full transition-colors"
                target="_blank"
                title="Open book to this highlight"
              >
                <span>📖</span>
                <span>Open in "{highlight.bookTitle}"</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
