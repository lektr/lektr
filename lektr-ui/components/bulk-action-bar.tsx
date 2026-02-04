"use client";

import { Trash2, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onAddTags: () => void;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onDelete,
  onAddTags
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-2 p-2 pl-4 bg-foreground text-background rounded-full shadow-lg border border-border/50">
        <span className="text-sm font-medium mr-2">
          {selectedCount} selected
        </span>

        <div className="h-4 w-px bg-background/20 mx-1" />

        <button
          onClick={onAddTags}
          className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-background/10 rounded-full text-xs font-medium transition-colors"
        >
          <Tag className="w-3.5 h-3.5" />
          Tags
        </button>

        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-full text-xs font-medium transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>

        <div className="h-4 w-px bg-background/20 mx-1" />

        <button
          onClick={onClearSelection}
          className="p-1.5 hover:bg-background/10 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
