"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createCard, updateCard, getDecks, type Flashcard, type Highlight, type Deck } from "@/lib/api";
import { MarkdownEditor } from "@/components/markdown-editor";
import { Modal } from "@/components/modal";
import Link from "next/link";
import { ExternalLink, ArrowRight, ArrowLeft, ArrowDown, ArrowUp } from "lucide-react";

interface CardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Deck ID - required for deck-based creation/edit, optional for highlight mode */
  deckId?: string;
  /** If provided, modal is in edit mode */
  card?: Flashcard;
  /** If provided, modal is in "create from highlight" mode with deck selector */
  highlight?: Highlight;
  onSuccess?: () => void;
}

export function CardFormModal({ isOpen, onClose, deckId, card, highlight, onSuccess }: CardFormModalProps) {
  const isEditMode = Boolean(card);
  const isHighlightMode = Boolean(highlight) && !card;

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState(deckId || "");
  const [template, setTemplate] = useState("standard");
  const queryClient = useQueryClient();

  // Fetch decks for highlight mode (deck selector)
  const { data: decksData, isLoading: isLoadingDecks } = useQuery({
    queryKey: ["decks"],
    queryFn: getDecks,
    enabled: isHighlightMode,
  });

  const manualDecks = decksData?.decks?.filter((d: Deck) => d.type === "manual") || [];

  // Sync state when props change
  useEffect(() => {
    if (card) {
      // Edit mode
      setFront(card.front);
      setBack(card.back);
      setSelectedDeckId(deckId || "");
    } else if (highlight) {
      // Highlight mode
      setFront("");
      let content = highlight.content;
      if (highlight.note) {
        content += `\n\n> **Note:** ${highlight.note}`;
      }
      setBack(content);
      setSelectedDeckId(deckId || "");
    } else {
      // Create mode
      setFront("");
      setBack("");
      setSelectedDeckId(deckId || "");
      setTemplate("standard");
    }
  }, [card, highlight, deckId]);

  const effectiveDeckId = deckId || selectedDeckId;

  const createMutation = useMutation({
    mutationFn: (data: { front: string; back: string; highlightId?: string }) =>
      createCard(effectiveDeckId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deck-cards", effectiveDeckId] });
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      toast.success("Card created");
      if (isHighlightMode) {
        onSuccess?.();
        onClose();
      } else {
        setFront("");
        setBack("");
      }
    },
    onError: (error) => {
      toast.error("Failed to create card", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { front: string; back: string }) =>
      updateCard(card!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deck-cards", effectiveDeckId] });
      toast.success("Card updated");
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast.error("Failed to update card", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    if (!effectiveDeckId) {
      toast.error("Please select a deck");
      return;
    }

    const data = { front: front.trim(), back: back.trim() };

    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate({
        ...data,
        highlightId: highlight?.id,
      });
    }
  };

  const handleSaveAndClose = async () => {
    if (!front.trim() || !back.trim()) return;
    if (!effectiveDeckId) {
      toast.error("Please select a deck");
      return;
    }
    try {
      await createMutation.mutateAsync({
        front: front.trim(),
        back: back.trim(),
        highlightId: highlight?.id,
      });
      onClose();
    } catch {
      // Error handled by mutation onError
    }
  };

  // Keyboard shortcut for saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSaveAndClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [front, back, effectiveDeckId]);

  // Regex to strip cloze syntax: {{c1::answer::hint}} -> answer
  const stripCloze = (text: string) => {
    return text.replace(/\{\{c\d+::(.*?)\}\}/g, (_, content) => {
      return content.split("::")[0];
    });
  };

  const applyTemplate = (t: string) => {
    setTemplate(t);
    // Don't overwrite content if user has already typed something meaningful
    // unless it's the initial load or they confirm (simplified here to just check empty-ish)
    const isClean = !front || front === "### Term\n\n" || front === "### Question\n\n" || front.startsWith("Text with");

    if (!isClean) return;

    switch (t) {
      case "concept":
        setFront("### Term\n\n");
        if (!highlight) setBack("### Definition\n\n");
        break;
      case "question":
        setFront("### Question\n\n");
        if (!highlight) setBack("### Answer\n\n");
        break;
      case "cloze":
        // For highlights, we might want to put the highlight in the front for Cloze
        if (highlight) {
          setFront(highlight.content);
          setBack(highlight.note || "Extra Context");
        } else {
          setFront("Text with {{c1::cloze}} deletion.");
          setBack("Extra Context");
        }
        break;
      default:
        // Standard - do nothing special
        break;
    }
  };

  if (!isOpen) return null;

  const getTitle = () => {
    if (isEditMode) return "Edit Card";
    if (isHighlightMode) return "⚡ Create Flashcard from Highlight";
    return "Add New Card";
  };

  return (
    <Modal onClose={onClose} maxWidth="4xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">{getTitle()}</h2>
          <div className="text-xs text-muted-foreground hidden sm:block">
            <span className="bg-muted px-1.5 py-0.5 rounded border border-border/50 font-mono">⌘+Ent</span> to save
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Controls Row: Deck & Template */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4">
             {/* Deck selector */}
             <div className="space-y-2">
                <label className="block text-sm font-medium">
                  {isHighlightMode || !isEditMode ? "Add to Deck" : "Deck"}
                </label>
                <select
                  required
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  disabled={isLoadingDecks}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm h-[42px]"
                >
                  <option value="">Select a deck...</option>
                  {manualDecks.map((deck: Deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.title} ({deck.cardCount} cards)
                    </option>
                  ))}
                </select>
             </div>

             {/* Template selector */}
             {!isEditMode && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Template</label>
                <select
                  value={template}
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm h-[42px]"
                >
                  <option value="standard">Standard</option>
                  <option value="concept">Concept (Term/Def)</option>
                  <option value="question">Question (Q/A)</option>
                  <option value="cloze">Cloze Deletion</option>
                </select>
              </div>
             )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-6 items-start">
            <div className="space-y-2 min-w-0">
              <label className="block text-sm font-medium">Front</label>
              <MarkdownEditor
                value={front}
                onChange={setFront}
                placeholder="Question or term..."
                minHeight="200px"
              />
            </div>

            {/* Copy Controls */}
            {/* Desktop: Vertical column between fields */}
            {/* Mobile: Horizontal row between fields */}
            <div className="flex lg:flex-col gap-2 justify-center items-center self-center lg:pt-8">
              <div className="flex lg:flex-col gap-1 bg-muted/30 p-1 rounded-lg border border-border/50">
                <button
                  type="button"
                  onClick={() => {
                    setBack(stripCloze(front));
                    toast.success("Copied Front to Back");
                  }}
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-background shadow-sm hover:shadow active:scale-95 transition-all rounded-md"
                  title="Copy Front to Back (+ strip cloze)"
                >
                  <ArrowRight className="w-3.5 h-3.5 hidden lg:block" />
                  <ArrowDown className="w-3.5 h-3.5 lg:hidden" />
                </button>
                <div className="w-px h-3 lg:w-3 lg:h-px bg-border/50 mx-auto" />
                <button
                  type="button"
                  onClick={() => {
                    setFront(back);
                    toast.success("Copied Back to Front");
                  }}
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-background shadow-sm hover:shadow active:scale-95 transition-all rounded-md"
                  title="Copy Back to Front"
                >
                  <ArrowLeft className="w-3.5 h-3.5 hidden lg:block" />
                  <ArrowUp className="w-3.5 h-3.5 lg:hidden" />
                </button>
              </div>
            </div>

            <div className="space-y-2 min-w-0">
              <label className="block text-sm font-medium">Back</label>
              <MarkdownEditor
                value={back}
                onChange={setBack}
                placeholder="Answer, definition, or explanation..."
                minHeight="200px"
                showClozeButton={false}
              />
              {isHighlightMode && (
                <p className="text-xs text-muted-foreground">
                  Pre-filled with your highlight text.
                </p>
              )}
            </div>
          </div>

          {/* Original Highlight Display */}
          {(highlight || card?.highlight) && (
            <div className="bg-muted/30 border border-border/50 rounded-xl p-4 text-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                  <span>⚡ Original Highlight</span>
                  <span>•</span>
                  <span className="truncate max-w-[200px] sm:max-w-[300px]">
                    {highlight?.bookTitle || card?.highlight?.bookTitle || "Unknown Book"}
                  </span>
                </div>
                {(highlight?.bookId || card?.highlight?.bookId) && (
                  <Link
                    href={`/library/${highlight?.bookId || card?.highlight?.bookId}?highlight=${highlight?.id || card?.highlight?.id}`}
                    target="_blank"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                    title="Open in book"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground italic border-l-2 border-primary/20 pl-4">
                {highlight?.content || card?.highlight?.content}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              {isEditMode ? "Cancel" : "Close"}
            </button>

            {isEditMode ? (
              <button
                type="submit"
                disabled={isPending || !front.trim() || !back.trim()}
                className="btn btn-primary"
              >
                {isPending ? "Saving..." : "Save Changes"}
              </button>
            ) : isHighlightMode ? (
              <button
                type="submit"
                disabled={isPending || !selectedDeckId || !front.trim() || !back.trim()}
                className="btn btn-primary"
              >
                {isPending ? "Creating..." : "Create Card"}
              </button>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={isPending || !front.trim() || !back.trim()}
                  className="btn btn-secondary"
                >
                  Save & Add Another
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndClose}
                  disabled={isPending || !front.trim() || !back.trim()}
                  className="btn btn-primary"
                >
                  {isPending ? "Saving..." : "Save Card"}
                </button>
              </>
            )}
          </div>
        </form>
    </Modal>
  );
}
