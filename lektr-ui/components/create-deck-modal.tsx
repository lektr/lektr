"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createDeck } from "@/lib/api";
import { MultiTagSelector } from "@/components/multi-tag-selector";
import { Modal } from "@/components/modal";

interface CreateDeckModalProps {
// ... existing interface ...
}



interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateDeckModal({ isOpen, onClose }: CreateDeckModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"manual" | "smart">("manual");

  // Smart deck settings
  const [tagLogic, setTagLogic] = useState<"AND" | "OR">("AND");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [includeRaw, setIncludeRaw] = useState(false);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      toast.success("Deck created");
      handleClose();
    },
    onError: (error) => {
      toast.error("Failed to create deck", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setType("manual");
    setSelectedTagIds([]);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (type === "smart" && selectedTagIds.length === 0) {
      toast.error("Smart decks must have at least one tag");
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      ...(type === "smart" && {
        tagLogic,
        tagIds: selectedTagIds,
        settings: {
          includeRawHighlights: includeRaw,
        },
      }),
    });
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={handleClose} maxWidth="md">
        <h2 className="text-xl font-semibold mb-6">Create New Deck</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Deck Type</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => setType("manual")}
                  className={`py-1.5 text-sm font-medium rounded-md transition-all ${
                    type === "manual" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => setType("smart")}
                  className={`py-1.5 text-sm font-medium rounded-md transition-all ${
                    type === "smart" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Smart
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {type === "manual"
                  ? "Manually add flashcards to this deck."
                  : "Automatically collects cards and highlights based on tags."}
              </p>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1.5">Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Physics, History, Random"
                className="w-full"
                autoFocus
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1.5">Description (Optional)</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full resize-none"
              />
            </div>

            {type === "smart" && (
              <div className="space-y-4 pt-4 border-t border-border/50 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Select Tags</label>
                  <MultiTagSelector
                    selectedTagIds={selectedTagIds}
                    onChange={setSelectedTagIds}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Match Logic</label>
                  <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setTagLogic("AND")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        tagLogic === "AND" ? "bg-background shadow-sm" : "hover:text-foreground text-muted-foreground"
                      }`}
                    >
                      Match All (AND)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTagLogic("OR")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        tagLogic === "OR" ? "bg-background shadow-sm" : "hover:text-foreground text-muted-foreground"
                      }`}
                    >
                      Match Any (OR)
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <input
                    id="includeRaw"
                    type="checkbox"
                    checked={includeRaw}
                    onChange={(e) => setIncludeRaw(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <label htmlFor="includeRaw" className="text-sm font-medium block">
                      Include Raw Highlights
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Show highlights as "Virtual Cards" even if I haven't made a flashcard yet.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary"
              disabled={createMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || (type === "smart" && selectedTagIds.length === 0)}
              className="btn btn-primary"
            >
              {createMutation.isPending ? "Creating..." : "Create Deck"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
