"use client";

import { type Book, getCoverUrl } from "@/lib/api";
import { useFaviconGradient, isFaviconUrl } from "@/lib/favicon-colors";
import { DigitalSpineCover } from "@/components/digital-spine-cover";
import { cn } from "@/lib/utils";

interface BookCoverProps {
  book: Book;
  size?: "sm" | "md" | "lg";
  className?: string; // Allow custom classes
}

/**
 * BookCover component that handles regular covers and uses Digital Spine for others.
 */
export function BookCover({ book, size = "lg", className }: BookCoverProps) {
  const isFavicon = isFaviconUrl(book.coverImageUrl);

  // Size-specific classes
  const sizeClasses = {
    sm: "w-32",
    md: "w-48",
    lg: "w-48 md:w-full",
  };

  const containerClass = cn(
    "aspect-[2/3] rounded-xl shadow-lg ring-1 ring-border/10 mx-auto md:mx-0 overflow-hidden relative",
    sizeClasses[size],
    className
  );

  if (book.coverImageUrl && !isFavicon) {
    // Regular cover image
    return (
      <img
        src={getCoverUrl(book.coverImageUrl) || ""}
        alt={`${book.title} cover`}
        className={cn(containerClass, "object-cover")}
      />
    );
  }

  // No cover OR favicon - display Digital Spine Cover
  // We wrap it in a container that matches the sizing
  return (
    <div className={containerClass}>
       <DigitalSpineCover book={book} />
    </div>
  );
}
