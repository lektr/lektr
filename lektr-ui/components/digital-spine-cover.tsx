"use client";

import { cn } from "@/lib/utils";
import { type Book } from "@/lib/api";

interface DigitalSpineCoverProps {
  book: Book;
  className?: string;
  variant?: "default" | "micro";
}

// Curated "Classic Book" Palette
const SPINE_COLORS = [
  { name: "Midnight Blue", bg: "bg-[#1e3a8a]", text: "text-[#dbeafe]" },
  { name: "Forest Green", bg: "bg-[#14532d]", text: "text-[#dcfce7]" },
  { name: "Burgundy", bg: "bg-[#881337]", text: "text-[#ffe4e6]" },
  { name: "Charcoal", bg: "bg-[#1f2937]", text: "text-[#f3f4f6]" },
  { name: "Royal Purple", bg: "bg-[#581c87]", text: "text-[#f3e8ff]" },
  { name: "Burnt Orange", bg: "bg-[#c2410c]", text: "text-[#ffedd5]" },
  { name: "Slate", bg: "bg-[#334155]", text: "text-[#f1f5f9]" },
  { name: "Deep Teal", bg: "bg-[#0f766e]", text: "text-[#ccfbf1]" },
];

const PATTERNS = [
  "plain",
  "vertical-stripe",
  "geometric",
  "grain"
] as const;

// Simple string hash
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function DigitalSpineCover({ book, className, variant = "default" }: DigitalSpineCoverProps) {
  const hash = hashString(book.id + book.title);

  const colorTheme = SPINE_COLORS[hash % SPINE_COLORS.length];
  const pattern = PATTERNS[hash % PATTERNS.length];

  // Helper to get pattern styles
  const getPatternStyle = () => {
    switch(pattern) {
      case "vertical-stripe":
        return {
          backgroundImage: `
            linear-gradient(90deg,
              rgba(255,255,255,0.03) 0%,
              rgba(255,255,255,0.03) 50%,
              transparent 50%,
              transparent 100%
            )
          `,
          backgroundSize: "20px 100%"
        };
      case "geometric":
        return {
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)
          `,
          backgroundSize: "20px 20px"
        };
      case "grain":
        return { opacity: 0.8 }; // Rely on a noise CSS class if available, or just solid
      default:
        return {};
    }
  };

  // Micro variant for list view - just color + first letter
  if (variant === "micro") {
    return (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center",
          colorTheme.bg,
          colorTheme.text,
          className
        )}
      >
        <span className="font-serif font-bold text-xs opacity-90">
          {book.title.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col relative overflow-hidden",
        colorTheme.bg,
        colorTheme.text,
        className
      )}
    >
      {/* Texture / Pattern Layer */}
      <div className="absolute inset-0 pointer-events-none" style={getPatternStyle()} />

      {/* Spine/Fold Effect (Left side shadow) */}
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-linear-to-r from-black/20 to-transparent pointer-events-none z-10" />

      {/* Content Container */}
      <div className="flex-1 flex flex-col items-center justify-between p-6 z-0 relative">

        {/* Header Decoration */}
        <div className="w-16 h-px bg-current opacity-30 mt-4" />

        {/* Title Section */}
        <div className="flex-1 flex flex-col items-center justify-center text-center w-full">
          <h3 className={cn(
            "font-serif font-bold tracking-tight leading-snug line-clamp-4 wrap-break-word hyphens-auto px-4",
            // Responsive typography based on title length
            book.title.length < 20 ? "text-2xl" :
            book.title.length < 50 ? "text-xl" : "text-lg"
          )}>
            {book.title}
          </h3>
          {book.author && (
            <p className="mt-3 text-sm font-medium opacity-75 uppercase tracking-widest text-[10px] line-clamp-2">
              {book.author}
            </p>
          )}
        </div>

        {/* Footer Decoration / Publisher */}
        <div className="flex flex-col items-center gap-2 mb-2 opacity-60">
          <div className="w-3 h-3 rounded-full border border-current" />
          <span className="text-[9px] uppercase tracking-widest font-semibold">
            {book.sourceType === "kindle" ? "Kindle" :
             book.sourceType === "web" ? "Web" : "Library"}
          </span>
        </div>
      </div>
    </div>
  );
}
