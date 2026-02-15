"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";

interface MarkdownRendererProps {
  content: string;
  maxLength?: number;
  className?: string;
}

export function MarkdownRenderer({ 
  content, 
  maxLength = 500,
  className = "" 
}: MarkdownRendererProps) {
  const [expanded, setExpanded] = useState(false);
  
  const shouldTruncate = content.length > maxLength && !expanded;
  const displayContent = shouldTruncate
    ? content.slice(0, content.lastIndexOf(" ", maxLength) || maxLength) + "…"
    : content;

  return (
    <div className={className}>
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom styling for elements
            p: ({ children }) => <p className="leading-relaxed">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
            code: ({ children }) => (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
            ),
            a: ({ href, children }) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {children}
              </a>
            ),
            ul: ({ children }) => <ul className="list-disc pl-4">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-primary/30 pl-3 italic text-muted-foreground">
                {children}
              </blockquote>
            ),
          }}
        >
          {displayContent}
        </ReactMarkdown>
      </div>
      
      {content.length > maxLength && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline mt-1"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

// Simple inline note display (for compact views)
export function NotePreview({ content, className = "" }: { content: string; className?: string }) {
  return (
    <MarkdownRenderer 
      content={content} 
      maxLength={200} 
      className={`text-sm text-muted-foreground ${className}`} 
    />
  );
}
