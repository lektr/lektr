import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  name: string;
  color?: string | null;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  onRemove?: () => void;
  size?: "xs" | "sm" | "md";
  href?: string;
}

export function TagBadge({ name, color, className, onClick, onRemove, size = "xs", href }: TagBadgeProps) {
  const isHex = color?.startsWith("#");
  
  // Base classes for consistent shape/size
  const sizeClasses = {
    xs: "px-2 py-0.5 text-[10px]",
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };
  
  const baseClasses = cn(
    "inline-flex items-center rounded-full font-medium transition-colors border border-transparent gap-1 select-none",
    sizeClasses[size]
  );
  
  // Default style if no color provided
  const defaultClasses = "bg-muted text-muted-foreground";

  // If hex, we simulate the "pastel" look
  const style = isHex ? { 
    backgroundColor: `${color}1A`, 
    color: color || undefined,
    borderColor: `${color}1A` 
  } : undefined;
  
  const finalClassName = cn(
    baseClasses, 
    !color && defaultClasses, 
    (!isHex && color) ? color : "",
    (onClick || href) && "cursor-pointer hover:opacity-80",
    className
  );
  
  const content = (
    <>
      <span className="truncate max-w-[150px]">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/10 rounded-full !p-0.5 !min-w-0 !min-h-0 !h-auto !w-auto -mr-1 transition-colors leading-none flex items-center justify-center aspect-square"
          aria-label={`Remove ${name} tag`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </>
  );

  if (href) {
    return (
      <Link 
        href={href} 
        className={finalClassName} 
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <span 
      className={finalClassName} 
      style={style} 
      onClick={onClick}
    >
      {content}
    </span>
  );
}

interface TagListProps {
  tags: { id: string; name: string; color?: string | null }[];
  maxVisible?: number;
  className?: string;
  size?: "xs" | "sm" | "md"; // Kept for interface compatibility, mostly handled by className or base styling
}

export function TagList({ tags, maxVisible = 3, className }: TagListProps) {
  if (!tags || tags.length === 0) return null;
  
  const visibleTags = tags.slice(0, maxVisible);
  const remaining = tags.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visibleTags.map((tag) => (
        <TagBadge 
          key={tag.id} 
          name={tag.name} 
          color={tag.color} 
          href={`/tags/${tag.id}`}
        />
      ))}
      {remaining > 0 && (
        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium self-center px-1.5">
          +{remaining}
        </span>
      )}
    </div>
  );
}
