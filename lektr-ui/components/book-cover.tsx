"use client";

import { getCoverUrl } from "@/lib/api";
import { getBookGradient } from "@/lib/colors";
import { useFaviconGradient, isFaviconUrl } from "@/lib/favicon-colors";

interface BookCoverProps {
  book: {
    title: string;
    coverImageUrl?: string | null;
  };
  size?: "sm" | "md" | "lg";
}

/**
 * BookCover component that handles regular covers, favicons, and default gradients
 * Favicons are displayed in a centered circle with a gradient background
 * extracted from the favicon's dominant colors
 */
export function BookCover({ book, size = "lg" }: BookCoverProps) {
  const isFavicon = isFaviconUrl(book.coverImageUrl);
  const faviconUrl = isFavicon ? getCoverUrl(book.coverImageUrl!) : null;
  const faviconGradient = useFaviconGradient(faviconUrl);

  // Size-specific classes
  const sizeClasses = {
    sm: "w-32",
    md: "w-48",
    lg: "w-48 md:w-full",
  };
  
  const iconSizes = {
    sm: { container: "w-12 h-12", icon: "w-8 h-8", emoji: "text-xl" },
    md: { container: "w-16 h-16", icon: "w-12 h-12", emoji: "text-2xl" },
    lg: { container: "w-20 h-20", icon: "w-14 h-14", emoji: "text-3xl" },
  };

  if (book.coverImageUrl && !isFavicon) {
    // Regular cover image
    return (
      <img
        src={getCoverUrl(book.coverImageUrl) || ""}
        alt={`${book.title} cover`}
        className={`${sizeClasses[size]} aspect-[2/3] object-cover rounded-xl shadow-lg ring-1 ring-border/10 mx-auto md:mx-0`}
      />
    );
  }

  // No cover OR favicon - display gradient with icon/favicon
  const gradientStyle = faviconGradient ? { background: faviconGradient } : undefined;
  const gradientClass = faviconGradient ? "" : getBookGradient(book.title);

  return (
    <div 
      className={`${sizeClasses[size]} aspect-[2/3] rounded-xl flex flex-col items-center justify-center p-4 text-center shadow-lg ring-1 ring-border/10 mx-auto md:mx-0 ${gradientClass}`}
      style={gradientStyle}
    >
      <div className={`${iconSizes[size].container} mb-4 bg-white/30 dark:bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm overflow-hidden`}>
        {isFavicon ? (
          <img 
            src={getCoverUrl(book.coverImageUrl!) || ""} 
            alt={book.title}
            className={`${iconSizes[size].icon} object-contain`}
          />
        ) : (
          <span className={iconSizes[size].emoji}>📖</span>
        )}
      </div>
    </div>
  );
}
