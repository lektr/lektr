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
  onEdit?: (highlight: Highlight) => void;
  onDelete?: (highlight: Highlight) => void;
  onAddTag?: (highlight: Highlight) => void;
}

export function HighlightCard({
  highlight,
  showBookInfo = false,
  accentColor,
  className,
  collapseLength = 500,
  onEdit,
  onDelete,
  onAddTag
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
            "{decodeHtmlEntities(highlight.content.slice(0, collapseLength))}
            <span className="text-muted-foreground">...</span>"
          </>
        ) : (
          `"${decodeHtmlEntities(highlight.content)}"`
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            {/* Location & Book Info */}
         <div className="flex flex-col gap-1 min-w-0">
            {showBookInfo && highlight.bookId && (
              <Link 
                href={`/library/${highlight.bookId}`}
                className="group/link block"
              >
                <div className="text-sm font-semibold truncate group-hover/link:text-primary transition-colors">
                  {highlight.bookTitle || "Unknown Book"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {highlight.bookAuthor}
                </div>
              </Link>
            )}

            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 flex-wrap">
               {(highlight.chapter || highlight.page) ? (
                 <>
                    {highlight.chapter && <span className="truncate max-w-[150px]">{highlight.chapter}</span>}
                    {highlight.chapter && highlight.page && <span className="text-border mx-1">|</span>}
                    {highlight.page && <span>Page {highlight.page}</span>}
                 </>
               ) : (
                 !showBookInfo && <span className="opacity-50">No location info</span>
               )}
               
               {highlight.sourceUrl && (
                 <>
                   {(highlight.chapter || highlight.page) && <span className="text-border mx-1">|</span>}
                   <a 
                     href={highlight.sourceUrl} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="flex items-center gap-1 text-primary hover:underline hover:text-primary/80 transition-colors"
                     onClick={(e) => e.stopPropagation()}
                   >
                     <span>Source</span>
                     <ExternalLink className="w-3 h-3" />
                   </a>
                 </>
               )}
            </div>
         </div>
         
         {/* Actions, Tags */}
         <div className="flex items-center gap-2 flex-wrap">
           {highlight.tags && highlight.tags.length > 0 && (
              <TagList tags={highlight.tags} size="xs" />
           )}

           {onAddTag && (
             <button
               onClick={() => onAddTag(highlight)}
               className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary px-2 py-1 rounded-full bg-muted/50 hover:bg-primary/10 transition-colors cursor-pointer"
             >
               + Tag
             </button>
           )}
           
           {(onEdit || onDelete) && (
             <>
               <div className="w-px h-4 bg-border mx-1" />
               
               {onEdit && (
                 <button
                   onClick={() => onEdit(highlight)}
                   className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors cursor-pointer"
                   title="Edit"
                 >
                   <Edit2 className="w-3.5 h-3.5" />
                 </button>
               )}
               
               {onDelete && (
                 <button
                   onClick={() => onDelete(highlight)}
                   className="p-1.5 text-muted-foreground hover:text-error hover:bg-error/10 rounded-full transition-colors cursor-pointer"
                   title="Delete"
                 >
                   <Trash2 className="w-3.5 h-3.5" />
                 </button>
               )}
             </>
           )}
         </div>
      </div>
    </div>
  );
}
