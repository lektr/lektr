"use client";

import Link from "next/link";
import { type Book, getCoverUrl } from "@/lib/api";
import { getBookGradient } from "@/lib/colors";
import { TagList } from "@/components/tag-badge";
import { Pin } from "lucide-react";
import { useFaviconGradient, isFaviconUrl } from "@/lib/favicon-colors";
import { DigitalSpineCover } from "@/components/digital-spine-cover";
import { cn } from "@/lib/utils";

interface BookCardProps {
  book: Book;
  onTagClick: (e: React.MouseEvent) => void;
  onPinClick: (e: React.MouseEvent) => void;

  // Selection Props
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function BookCard({
  book,
  onTagClick,
  onPinClick,
  isSelectionMode,
  isSelected,
  onToggleSelect
}: BookCardProps) {
  const isPinned = !!book.pinnedAt;
  const isFavicon = isFaviconUrl(book.coverImageUrl);
  const faviconUrl = isFavicon ? getCoverUrl(book.coverImageUrl!) : null;
  const faviconGradient = useFaviconGradient(faviconUrl);


  /* Content for the Cover area */
  const CoverContent = (
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
          // No cover OR favicon - display Digital Spine Cover
          const showFavicon = isFavicon && faviconUrl;

          if (showFavicon) {
             return <DigitalSpineCover book={book} />;
          }

          // Standard Digital Spine
          return <DigitalSpineCover book={book} />;
        }
      })()}

      {/* Highlight Count Badge */}
      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
        {book.highlightCount}
      </div>


      {/* Hover Selection Checkbox (When NOT in selection mode) */}
      {!isSelectionMode && (
        <div
          className="absolute top-2 left-2 z-30 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-pointer transform hover:scale-105"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect?.();
          }}
        >
          <div className="w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm border-2 border-white/70 hover:bg-primary hover:border-primary flex items-center justify-center transition-colors shadow-sm">
            {/* Empty circle by default, clicking it selects and switches mode */}
          </div>
        </div>
      )}

       {/* Selection Overlay (When IN selection mode) */}
      {isSelectionMode && (
         <div
           className={cn(
             "absolute inset-0 z-20 transition-colors cursor-pointer",
             isSelected ? "bg-primary/20" : "bg-black/10 hover:bg-black/20"
           )}
           // Note: The click here is redundant if parent div handles it,
           // but keeping it ensures the overlay itself is the target if needed.
           // However, if we wrap the whole card in onClick, we propagate it.
         >
           <div
             className={cn(
                "absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-transform duration-200 shadow-sm",
                isSelected
                  ? "bg-primary border-primary scale-110"
                  : "bg-background/80 border-muted-foreground/50 hover:scale-110"
             )}
           >
             {isSelected && <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
           </div>
         </div>
      )}

      {/* Pin Badge (when pinned) - Hide in selection mode, and hide on hover to show checkbox */}
      {isPinned && !isSelectionMode && (
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground p-1 rounded-full shadow-sm group-hover/card:opacity-0 transition-opacity">
          <Pin className="w-3 h-3" />
        </div>
      )}

      {/* Quick Actions Overlay (Desktop) - Hide in selection mode */}
      {!isSelectionMode && (
         <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex justify-between z-10">
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
      )}
    </div>
  );

  return (
    <div className="group relative flex flex-col h-full">
      {/* Cover Area */}
      {isSelectionMode ? (
        <div
          onClick={(e) => { e.preventDefault(); onToggleSelect?.(); }}
          className="block group/card cursor-pointer"
        >
          {CoverContent}
        </div>
      ) : (
        <Link href={`/library/${book.id}`} className="block group/card">
          {CoverContent}
        </Link>
      )}

      {/* Book Details */}
      <div className="mt-3 space-y-1">
        {isSelectionMode ? (
             <div
               className="block group/title cursor-pointer"
               onClick={(e) => { e.preventDefault(); onToggleSelect?.(); }}
             >
                <h3 className="font-semibold text-base leading-tight line-clamp-2 text-foreground group-hover/title:text-primary transition-colors">
                  {book.title}
                </h3>
             </div>
        ) : (
            <Link href={`/library/${book.id}`} className="block group/title">
              <h3 className="font-semibold text-base leading-tight line-clamp-2 text-foreground group-hover/title:text-primary transition-colors">
                {book.title}
              </h3>
            </Link>
        )}

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
