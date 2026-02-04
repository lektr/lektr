"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getTags,
  createTag,
  addTagToBook,
  type Tag
} from "@/lib/api";
import { TagBadge } from "./tag-badge";
import { TagColorPicker } from "./tag-color-picker";

interface BulkTagSelectorProps {
  bookIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkTagSelector({ bookIds, onClose, onSuccess }: BulkTagSelectorProps) {
  const queryClient = useQueryClient();
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: getTags,
  });

  const availableTags = tagsData?.tags ?? [];

  // Helper to apply a tag to all selected books
  const applyTag = async (tagId: string) => {
    setIsProcessing(true);
    let successCount = 0;

    try {
      // Execute sequentially to avoid overwhelming concurrency if many items selected
      // Or map with Promise.all for speed. Let's do Promise.all with simple error handling.
      await Promise.all(
        bookIds.map(async (bookId) => {
          try {
            await addTagToBook(tagId, bookId);
            successCount++;
          } catch (err) {
            console.error(`Failed to tag book ${bookId}`, err);
          }
        })
      );

      toast.success(`Tagged ${successCount} books`);
      queryClient.invalidateQueries({ queryKey: ["books"] });
      onSuccess();
    } catch (err) {
      toast.error("Failed to apply tags");
    } finally {
      setIsProcessing(false);
    }
  };

  const createTagMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string }) =>
      createTag(name, color),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setNewTagName("");
      // Auto-add the new tag to the books
      applyTag(data.tag.id);
    },
    onError: (error) => {
      toast.error("Failed to create tag", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    },
  });

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
            <h3 className="text-lg font-semibold">Tag {bookIds.length} Books</h3>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
             Select a tag to add it to all selected books.
          </p>

          {/* Available tags */}
          {availableTags.length > 0 && (
            <div className="mb-6 max-h-[200px] overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => !isProcessing && applyTag(tag.id)}
                    disabled={isProcessing}
                    className="transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <TagBadge
                        name={tag.name}
                        color={tag.color}
                        size="md"
                        // Just static display, the button wrapper handles click
                      />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create new tag */}
          <form onSubmit={handleCreateTag} className="space-y-3 pt-4 border-t border-border/50">
            <p className="text-sm font-medium">Create & Apply New Tag</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name"
                className="flex-1 input-bordered rounded-lg px-3 py-2 text-sm bg-muted/50 focus:bg-background"
                maxLength={50}
                disabled={isProcessing}
              />
              <button
                type="submit"
                disabled={!newTagName.trim() || createTagMutation.isPending || isProcessing}
                className="btn btn-primary px-4 py-2 text-sm"
              >
                {(createTagMutation.isPending || isProcessing) ? "..." : "Add"}
              </button>
            </div>

            {/* Color picker */}
            <div className="mt-2">
              <TagColorPicker
                selectedColor={selectedColor}
                onSelect={(c) => setSelectedColor(c || undefined)}
                allowNoColor={false}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
