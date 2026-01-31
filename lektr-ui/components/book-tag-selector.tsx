"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  getTags, 
  createTag, 
  addTagToBook, 
  removeTagFromBook,
  type Tag 
} from "@/lib/api";
import { TagBadge } from "./tag-badge";
import { TagColorPicker } from "./tag-color-picker";

interface BookTagSelectorProps {
  bookId: string;
  currentTags: { id: string; name: string; color: string | null }[];
  onClose: () => void;
}

export function BookTagSelector({ bookId, currentTags, onClose }: BookTagSelectorProps) {
  const queryClient = useQueryClient();
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | undefined>();

  const { data: tagsData, isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: getTags,
  });

  const createTagMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string }) =>
      createTag(name, color),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setNewTagName("");
      // Auto-add the new tag to the book
      addTagMutation.mutate({ tagId: data.tag.id });
    },
    onError: (error) => {
      toast.error("Failed to create tag", { 
        description: error instanceof Error ? error.message : "Unknown error" 
      });
    },
  });

  const addTagMutation = useMutation({
    mutationFn: ({ tagId }: { tagId: string }) =>
      addTagToBook(tagId, bookId),
    onSuccess: () => {
      // Invalidate both the books list and the specific book
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["book", bookId] });
      toast.success("Tag added to book");
    },
    onError: (error) => {
      toast.error("Failed to add tag", { 
        description: error instanceof Error ? error.message : "Unknown error" 
      });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: ({ tagId }: { tagId: string }) =>
      removeTagFromBook(tagId, bookId),
    onSuccess: () => {
      // Invalidate both the books list and the specific book
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["book", bookId] });
      toast.success("Tag removed from book");
    },
    onError: (error) => {
      toast.error("Failed to remove tag", { 
        description: error instanceof Error ? error.message : "Unknown error" 
      });
    },
  });

  const currentTagIds = new Set(currentTags.map((t) => t.id));
  const availableTags = tagsData?.tags.filter((t) => !currentTagIds.has(t.id)) ?? [];

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      createTagMutation.mutate({ name: newTagName.trim(), color: selectedColor });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div 
        className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Manage Book Tags</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Current tags */}
          {currentTags.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Current tags</p>
              <div className="flex flex-wrap gap-2">
                {currentTags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    name={tag.name}
                    color={tag.color}
                    size="md"
                    onRemove={() => removeTagMutation.mutate({ tagId: tag.id })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Available tags */}
          {availableTags.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Add existing tag</p>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    name={tag.name}
                    color={tag.color}
                    size="md"
                    onClick={() => addTagMutation.mutate({ tagId: tag.id })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Create new tag */}
          <form onSubmit={handleCreateTag} className="space-y-3">
            <p className="text-sm text-muted-foreground">Create new tag</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="flex-1"
                maxLength={50}
              />
              <button
                type="submit"
                disabled={!newTagName.trim() || createTagMutation.isPending}
                className="btn btn-primary px-4"
              >
                {createTagMutation.isPending ? "..." : "Add"}
              </button>
            </div>
            
            {/* Color picker */}
            <div className="mt-4">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Color</label>
              <TagColorPicker 
                selectedColor={selectedColor} 
                onSelect={(c) => setSelectedColor(c || undefined)} 
                allowNoColor={false}
              />
            </div>
          </form>
        </div>

        <div className="border-t border-border p-4">
          <button
            onClick={onClose}
            className="w-full btn btn-secondary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
