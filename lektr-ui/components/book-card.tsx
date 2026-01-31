"use client";

import Link from "next/link";
import { type Book, getCoverUrl } from "@/lib/api";
import { getBookGradient } from "@/lib/colors";
import { TagList } from "@/components/tag-badge";
import { Pin } from "lucide-react";
import { useFaviconGradient, isFaviconUrl } from "@/lib/favicon-colors";

interface BookCardProps {
  book: Book;
  onTagClick: (e: React.MouseEvent) => void;
  onPinClick: (e: React.MouseEvent) => void;
}

export function BookCard({ book, onTagClick, onPinClick }: BookCardProps) {
  const isPinned = !!book.pinnedAt;
  const isFavicon = isFaviconUrl(book.coverImageUrl);
  const faviconUrl = isFavicon ? getCoverUrl(book.coverImageUrl!) : null;
  const faviconGradient = useFaviconGradient(faviconUrl);
  
  return (
    <div className="group relative flex flex-col h-full">
      {/* Cover Image - Clickable link */}
      <Link href={`/library/${book.id}`} className="block group/card">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-sm border border-border/50 transition-all duration-300 group-hover/card:shadow-md group-hover/card:-translate-y-1">
          {(() => {
            if (book.coverImageUrl && !isFavicon) {
              // Regular cover image - display full size
              return (
                <img
                  src={getCoverUrl(book.coverImageUrl) || ""}
                  alt={`Cover of ${book.title}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                  loading="lazy"
                />
              );
            } else {
              // No cover OR favicon - display gradient with icon/favicon in circle
              // Use extracted favicon color gradient if available, otherwise fallback to title-based gradient
              const gradientStyle = faviconGradient ? { background: faviconGradient } : undefined;
              const gradientClass = faviconGradient ? '' : getBookGradient(book.title);
              return (
                <div 
                  className={`w-full h-full flex flex-col items-center justify-center p-6 text-center ${gradientClass}`}
                  style={gradientStyle}
                >
                  <div className="w-14 h-14 mb-3 bg-white/30 dark:bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm overflow-hidden">
                    {isFavicon ? (
                      <img 
                        src={getCoverUrl(book.coverImageUrl!) || ""} 
                        alt={book.title}
                        className="w-10 h-10 object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-2xl">📖</span>
                    )}
                  </div>
                  <h3 className="font-serif font-medium text-zinc-700 dark:text-zinc-100 line-clamp-3 text-sm leading-relaxed">
                    {book.title}
                  </h3>
                </div>
              );
            }
          })()}
          
          {/* Highlight Count Badge */}
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            {book.highlightCount}
          </div>

          {/* Pin Badge (when pinned) */}
          {isPinned && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground p-1 rounded-full shadow-sm">
              <Pin className="w-3 h-3" />
            </div>
          )}

          {/* Quick Actions Overlay (Desktop) */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex justify-between">
            <button
              onClick={onPinClick}
              className={`!w-8 !h-8 !min-w-0 !min-h-0 !p-0 rounded-full flex items-center justify-center shadow-lg transition-colors border cursor-pointer ${
                isPinned 
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/80" 
                  : "bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-100"
              }`}
              title={isPinned ? "Unpin" : "Pin to top"}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onTagClick}
              className="!w-8 !h-8 !min-w-0 !min-h-0 !p-0 rounded-full bg-white text-zinc-900 flex items-center justify-center shadow-lg hover:bg-zinc-100 transition-colors border border-zinc-200 cursor-pointer"
              title="Edit tags"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l5 5a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828l-5-5z"/>
                <circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </Link>

      {/* Book Details - Separate from cover link */}
      <div className="mt-3 space-y-1">
        <Link href={`/library/${book.id}`} className="block group/title">
          <h3 className="font-semibold text-base leading-tight line-clamp-2 text-foreground group-hover/title:text-primary transition-colors">
            {book.title}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground truncate">
          {book.author || "Unknown Author"}
        </p>
        
        {/* Tags - NOT inside a Link to prevent nested <a> */}
        <div className="pt-1 flex flex-wrap gap-1 min-h-[24px]">
          {book.tags && book.tags.length > 0 ? (
            <TagList tags={book.tags} size="xs" maxVisible={2} />
          ) : (
            <span className="text-xs text-muted-foreground/40 italic opacity-0 group-hover:opacity-100 transition-opacity">
              No tags
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
