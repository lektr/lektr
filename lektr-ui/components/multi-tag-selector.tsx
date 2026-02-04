"use client";

import { useQuery } from "@tanstack/react-query";
import { getTags } from "@/lib/api";
import { TagBadge } from "./tag-badge";

interface MultiTagSelectorProps {
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
}

export function MultiTagSelector({ selectedTagIds, onChange }: MultiTagSelectorProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: getTags,
  });

  const tags = data?.tags ?? [];
  const selectedSet = new Set(selectedTagIds);

  const toggleTag = (tagId: string) => {
    const newSelected = new Set(selectedSet);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    onChange(Array.from(newSelected));
  };

  if (isLoading) {
    return <div className="skeleton h-20 w-full" />;
  }

  if (tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg text-center">
        No tags found. create tags in the Tags section first.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border/50 max-h-40 overflow-y-auto">
      {tags.map((tag) => {
        const isSelected = selectedSet.has(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={`
              flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-all
              ${isSelected ? "bg-primary/15 border-primary/20" : "bg-muted border-transparent opacity-60 hover:opacity-100"}
            `}
            style={isSelected ? { color: tag.color || "inherit" } : {}}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tag.color || "currentColor" }}
            />
            {tag.name}
            {isSelected && <span className="ml-1 text-[10px]">✕</span>}
          </button>
        );
      })}
    </div>
  );
}
