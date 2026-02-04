"use client";

import Link from "next/link";
import { type Book, getCoverUrl } from "@/lib/api";
import { TagList } from "@/components/tag-badge";
import { Pin, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFaviconUrl } from "@/lib/favicon-colors";
import { DigitalSpineCover } from "@/components/digital-spine-cover";

interface BookListCardProps {
  book: Book;
  onTagClick: (e: React.MouseEvent) => void;
  onPinClick: (e: React.MouseEvent) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function BookListCard({
  book,
  onTagClick,
  onPinClick,
  isSelectionMode,
  isSelected,
  onToggleSelect,
}: BookListCardProps) {
  const isPinned = !!book.pinnedAt;
  const isFavicon = isFaviconUrl(book.coverImageUrl);
  const hasRealCover = book.coverImageUrl && !isFavicon;

  const handleSelect = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSelect?.();
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
        isSelected
          ? "bg-primary/5 border-primary/50 shadow-sm"
          : "bg-card border-border/40 hover:border-border hover:shadow-sm hover:bg-muted/30",
        isSelectionMode && "cursor-pointer"
      )}
      onClick={isSelectionMode ? handleSelect : undefined}
    >
      {/* Selection Checkbox - Matching grid view exactly */}
      {(isSelectionMode || isSelected) && (
        <div
          onClick={handleSelect}
          className={cn(
            "shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-transform duration-200 shadow-sm cursor-pointer",
            isSelected
              ? "bg-primary border-primary scale-110"
              : "bg-background/80 border-muted-foreground/50 hover:scale-110"
          )}
        >
           {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
        </div>
      )}

      {/* Cover Preview - Proper sizing */}
      <div className="shrink-0 w-10 h-14 relative rounded-md overflow-hidden shadow-sm border border-border/50 bg-muted">
        {hasRealCover ? (
          <img
            src={getCoverUrl(book.coverImageUrl) || ""}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <DigitalSpineCover book={book} variant="micro" />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex items-center">
        {/* Title & Author Block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {/* Pin Icon BEFORE title */}
            {isPinned && <Pin className="w-3 h-3 text-primary fill-primary shrink-0" />}

            {isSelectionMode ? (
              <span className="font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors">
                {book.title}
              </span>
            ) : (
              <Link href={`/library/${book.id}`} className="font-medium text-foreground truncate hover:text-primary transition-colors block">
                {book.title}
              </Link>
            )}
          </div>

          <p className="text-sm text-muted-foreground truncate">
            {book.author || "Unknown Author"}
          </p>

          {/* Tags Row */}
          {book.tags && book.tags.length > 0 && (
            <div className="mt-1.5">
              <TagList tags={book.tags} size="xs" maxVisible={3} />
            </div>
          )}
        </div>

        {/* Right Side - Vertically Centered */}
        <div className="flex items-center gap-4 shrink-0 ml-4">
          {/* Highlights Count */}
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-sm font-medium text-foreground tabular-nums">
              {book.highlightCount}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {book.highlightCount === 1 ? 'Highlight' : 'Highlights'}
            </span>
          </div>

          {/* Actions (Hidden in select mode) */}
          {!isSelectionMode && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onPinClick}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  isPinned
                    ? "text-primary bg-primary/10 hover:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={isPinned ? "Unpin" : "Pin to top"}
              >
                <Pin className="w-4 h-4" />
              </button>
              <button
                onClick={onTagClick}
                className="p-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Edit tags"
              >
                <Tag className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
