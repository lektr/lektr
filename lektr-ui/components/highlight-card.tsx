"use client";

import { useState } from "react";
import Link from "next/link";
import { type Highlight } from "@/lib/api";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { TagList } from "@/components/tag-badge";
import { decodeHtmlEntities } from "@/lib/html-entities";
import {
  Quote,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  FileText,
  ExternalLink
} from "lucide-react";

export interface HighlightCardProps {
  highlight: Highlight & {
    bookId?: string;
    bookTitle?: string;
    bookAuthor?: string;
    tags?: any[];
    sourceUrl?: string | null;
  };
  showBookInfo?: boolean;
  accentColor?: string;
  className?: string;
  collapseLength?: number;
  searchQuery?: string;
  onEdit?: (highlight: Highlight) => void;
  onDelete?: (highlight: Highlight) => void;
  onAddTag?: (highlight: Highlight) => void;
  onCreateFlashcard?: (highlight: Highlight) => void;
}

// Helper function to highlight matching text
function highlightText(text: string, query: string): React.ReactNode {
  if (!query || query.trim().length < 2) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/30 text-foreground rounded-sm px-0.5">{part}</mark>
    ) : part
  );
}

export function HighlightCard({
  highlight,
  showBookInfo = false,
  accentColor,
  className,
  collapseLength = 500,
  searchQuery,
  onEdit,
  onDelete,
  onAddTag,
  onCreateFlashcard
}: HighlightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const isLong = highlight.content.length > collapseLength;
  const isEdited = highlight.originalContent && highlight.originalContent !== highlight.content;

  return (
    <div
      className={`group bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden ${className || ""}`}
    >
      {/* Accent Bar (Optional) */}
      {accentColor && (
        <div
          className="absolute top-0 left-0 w-1.5 h-full opacity-40 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: accentColor }}
        />
      )}

      {/* Quote Icon */}
      <Quote className="w-8 h-8 text-muted-foreground/10 absolute top-4 right-4" />

      {/* Content */}
      <blockquote
        className="font-serif text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap mb-4 relative z-10"
        style={{ fontFamily: 'var(--font-literata), Georgia, serif' }}
      >
        {isLong && !isExpanded ? (
          <>
            "{highlightText(decodeHtmlEntities(highlight.content.slice(0, collapseLength)), searchQuery || '')}
            <span className="text-muted-foreground">...</span>"
          </>
        ) : (
          <>"{highlightText(decodeHtmlEntities(highlight.content), searchQuery || '')}"</>
        )}
      </blockquote>

      {/* Controls: Expand / Show Original */}
      <div className="flex flex-wrap gap-4 text-xs font-medium mb-4 relative z-10">
        {isLong && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer transition-colors"
          >
            {isExpanded ? (
              <>Show less <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Show more <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        )}

        {isEdited && (
           <button
             onClick={() => setShowOriginal(!showOriginal)}
             className="text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
           >
             <span className="w-1.5 h-1.5 bg-accent rounded-full" />
             Edited
             {showOriginal ? " (Hide original)" : " (Show original)"}
           </button>
        )}
      </div>

      {/* Expanded Original Content */}
      {showOriginal && highlight.originalContent && (
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50 mb-4 animate-in fade-in slide-in-from-top-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Original</p>
          <p className="text-sm text-muted-foreground/80 font-serif italic leading-relaxed">
            "{decodeHtmlEntities(highlight.originalContent)}"
          </p>
        </div>
      )}

      {/* Note */}
      {highlight.note && (
        <div className="bg-primary/5 rounded-lg p-3 sm:p-4 border border-primary/10 mb-4">
          <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider mb-2 flex items-center gap-2">
             <span className="text-base">💭</span> Note
          </p>
          <div className="text-sm text-foreground/90 prose prose-sm max-w-none">
            <MarkdownRenderer content={highlight.note} maxLength={isExpanded ? undefined : 200} />
          </div>
        </div>
      )}

      <hr className="border-border/40 my-4" />

      {/* Footer */}
      <div className="flex flex-col gap-3 pt-1">
          {/* Top Row: Tags & Location */}
          <div className="flex items-start justify-between gap-4">
             {/* Left: Location & Source */}
             <div className="text-xs text-muted-foreground/60 font-medium font-mono flex items-center gap-2 mt-1">
               {(highlight.chapter || highlight.page) && (
                 <span className="flex items-center gap-1.5">
                   {highlight.chapter && <span className="truncate max-w-[120px]">{highlight.chapter}</span>}
                   {highlight.chapter && highlight.page && <span className="w-1 h-1 rounded-full bg-border" />}
                   {highlight.page && <span>p. {highlight.page}</span>}
                 </span>
               )}

               {highlight.sourceUrl && (
                  <>
                     <span className="w-px h-3 bg-border" />
                     <a
                       href={highlight.sourceUrl}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-center gap-1 hover:text-primary transition-colors"
                       onClick={(e) => e.stopPropagation()}
                     >
                       Source <ExternalLink className="w-3 h-3" />
                     </a>
                  </>
               )}
             </div>

             {/* Right: Tags */}
             {highlight.tags && highlight.tags.length > 0 && (
                <div className="flex justify-end">
                   <TagList tags={highlight.tags} size="xs" />
                </div>
             )}
          </div>

          {/* Bottom Row: Actions */}
          <div className="flex items-center justify-between border-t border-border/30 pt-3 mt-1">
             {/* Book Info (If shown) */}
             <div>
                {showBookInfo && highlight.bookId ? (
                   <Link
                     href={`/library/${highlight.bookId}`}
                     className="group/link flex flex-col"
                   >
                     <div className="text-sm font-semibold truncate group-hover/link:text-primary transition-colors max-w-[200px]">
                       {highlight.bookTitle || "Unknown Book"}
                     </div>
                     <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                       {highlight.bookAuthor}
                     </div>
                   </Link>
                ) : (
                  // Empty spacer if no book info needed
                  <span />
                )}
             </div>

             {/* Action Buttons */}
             <div className="flex items-center gap-1">
               {onAddTag && (
                  <button
                    onClick={() => onAddTag(highlight)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors text-xs font-medium flex items-center gap-1"
                  >
                    <span className="text-[10px] opacity-70">#</span> Tag
                  </button>
               )}

               <div className="w-px h-4 bg-border/50 mx-1" />

               {onCreateFlashcard && (
                  <button
                    onClick={() => onCreateFlashcard(highlight)}
                    className="flex items-center gap-1.5 p-1.5 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 hover:text-amber-700 rounded-md transition-colors cursor-pointer group/flash text-xs font-medium"
                    title="Create Flashcard"
                  >
                    <span className="text-sm leading-none">⚡</span>
                    <span>Flashcard</span>
                  </button>
               )}

               {(onEdit || onDelete) && (
                 <>
                   {onEdit && (
                     <button
                       onClick={() => onEdit(highlight)}
                       className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
                       title="Edit"
                     >
                       <Edit2 className="w-4 h-4" />
                     </button>
                   )}
                   {onDelete && (
                     <button
                       onClick={() => onDelete(highlight)}
                       className="p-1.5 text-muted-foreground hover:text-error hover:bg-error/10 rounded-md transition-colors cursor-pointer"
                       title="Delete"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   )}
                 </>
               )}
             </div>
          </div>
      </div>
    </div>
  );
}
