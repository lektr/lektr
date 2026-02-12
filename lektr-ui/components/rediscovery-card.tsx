"use client";

import Link from "next/link";
import { type RediscoveryHighlight, getCoverUrl } from "@/lib/api";
import { TagList } from "@/components/tag-badge";
import { decodeHtmlEntities } from "@/lib/html-entities";
import { Quote, BookOpen } from "lucide-react";

interface RediscoveryCardProps {
  highlight: RediscoveryHighlight;
  index?: number;
}

export function RediscoveryCard({ highlight, index = 0 }: RediscoveryCardProps) {
  const coverUrl = getCoverUrl(highlight.coverImageUrl);
  const truncatedContent =
    highlight.content.length > 280
      ? highlight.content.slice(0, 280) + "…"
      : highlight.content;

  return (
    <div
      className="group bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-500 relative overflow-hidden animate-slide-up"
      style={{ animationDelay: `${index * 0.08}s`, animationFillMode: "both" }}
    >
      {/* Gradient accent top edge */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary/60 via-accent/60 to-primary/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="p-6">
        {/* Quote icon */}
        <Quote className="w-6 h-6 text-primary/15 mb-3" />

        {/* Quote content */}
        <blockquote
          className="font-serif text-base sm:text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap mb-4"
          style={{ fontFamily: "var(--font-literata), Georgia, serif" }}
        >
          &ldquo;{decodeHtmlEntities(truncatedContent)}&rdquo;
        </blockquote>

        {/* Note preview */}
        {highlight.note && (
          <div className="bg-primary/5 rounded-lg px-3 py-2 border border-primary/10 mb-4">
            <p className="text-xs text-primary/70 font-medium flex items-center gap-1.5 mb-1">
              <span className="text-sm">💭</span> Note
            </p>
            <p className="text-sm text-foreground/70 line-clamp-2">
              {highlight.note}
            </p>
          </div>
        )}

        {/* Tags */}
        {highlight.tags && highlight.tags.length > 0 && (
          <div className="mb-4">
            <TagList tags={highlight.tags} size="xs" />
          </div>
        )}

        {/* Location info */}
        {(highlight.chapter || highlight.page) && (
          <p className="text-xs text-muted-foreground/50 font-mono mb-4">
            {highlight.chapter && (
              <span className="truncate max-w-[150px] inline-block align-bottom">
                {highlight.chapter}
              </span>
            )}
            {highlight.chapter && highlight.page && " · "}
            {highlight.page && `p. ${highlight.page}`}
          </p>
        )}

        <hr className="border-border/30 mb-4" />

        {/* Book attribution */}
        <Link
          href={`/library/${highlight.bookId}`}
          className="group/book flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          {/* Mini cover */}
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="w-8 h-12 rounded-md object-cover ring-1 ring-border/20 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-8 h-12 rounded-md bg-muted flex items-center justify-center ring-1 ring-border/20 shrink-0">
              <BookOpen className="w-4 h-4 text-muted-foreground/50" />
            </div>
          )}

          <div className="min-w-0">
            <p className="text-sm font-semibold truncate group-hover/book:text-primary transition-colors">
              {highlight.bookTitle}
            </p>
            {highlight.bookAuthor && (
              <p className="text-xs text-muted-foreground truncate">
                {highlight.bookAuthor}
              </p>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}
