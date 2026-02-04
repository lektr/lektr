"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Library, GraduationCap, Plus, Trash2, Edit2, Copy, Hash, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { getDeck, getDeckCards, deleteCard } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { AuthGuard } from "@/components/auth-guard";
import { CardFormModal } from "@/components/card-form-modal";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { type Flashcard } from "@/lib/api";

export default function DeckPage() {
  const params = useParams();
  const deckId = params.id as string;
  const [isCreateCardOpen, setIsCreateCardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const queryClient = useQueryClient();

  const { data: deckData, isLoading: isDeckLoading } = useQuery({
    queryKey: ["deck", deckId],
    queryFn: () => getDeck(deckId),
  });

  const { data: cardsData, isLoading: isCardsLoading } = useQuery({
    queryKey: ["deck-cards", deckId],
    queryFn: () => getDeckCards(deckId, { limit: 100 }), // Load lots for now
  });

  const deleteCardMutation = useMutation({
    mutationFn: deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deck-cards", deckId] });
      toast.success("Card deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete card", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const handleDeleteCard = (id: string) => {
    if (confirm("Delete this card?")) {
      deleteCardMutation.mutate(id);
    }
  };

  if (isDeckLoading) {
    return <div className="p-8"><div className="skeleton h-12 w-1/3 mb-4" /><div className="skeleton h-4 w-1/2" /></div>;
  }

  const deck = deckData?.deck;
  const cards = cardsData?.cards ?? [];

  if (!deck) return <div className="p-8">Deck not found</div>;

  return (
    <AuthGuard>
      <div className="container py-8 max-w-[1200px] mx-auto min-h-screen">
        {/* Back Button */}
        <Link
          href="/decks"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Decks
        </Link>

        <PageHeader
          title={deck.title}
          description={deck.description || "No description"}
        >
          <div className="flex gap-2">
            {deck.type === "manual" && (
              <button
                onClick={() => setIsCreateCardOpen(true)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Card
              </button>
            )}

            {(deck.dueCount || 0) > 0 ? (
              <Link
                href={`/study/${deckId}`}
                className="btn btn-primary flex items-center gap-2"
              >
                <GraduationCap className="w-4 h-4" />
                Study Now ({deck.dueCount})
              </Link>
            ) : (
               <button disabled className="btn btn-secondary opacity-50 cursor-not-allowed">
                 No cards due
               </button>
            )}
          </div>
        </PageHeader>

        {deck.type === "smart" && (
          <div className="mb-8 p-4 bg-muted/30 rounded-lg border border-border/50 flex flex-wrap gap-4 items-center">
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <Hash className="w-4 h-4" />
               <span>Smart Deck Configuration:</span>
             </div>
             <div className="flex flex-wrap gap-2">
                {deck.tags?.map(tag => (
                  <span key={tag.id} className="px-2 py-1 bg-background border border-border rounded-md text-xs font-medium flex items-center gap-1.5" style={{ color: tag.color || 'inherit' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color || 'currentColor' }} />
                    {tag.name}
                  </span>
                ))}
             </div>
             {deck.tagLogic && (
               <span className="text-xs px-2 py-0.5 bg-muted rounded">
                 Match {deck.tagLogic}
               </span>
             )}
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            Cards ({cards.length})
          </h3>

          {cards.length === 0 ? (
            <div className="text-center py-12 bg-muted/10 rounded-xl border-dashed border-2 border-border/50">
              <p className="text-muted-foreground mb-4">No cards in this deck yet.</p>
              {deck.type === "manual" && (
                <button
                  onClick={() => setIsCreateCardOpen(true)}
                  className="btn btn-primary"
                >
                  Create First Card
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {cards.map((card) => (
                <div key={card.id} className="card p-0 flex flex-col md:flex-row overflow-hidden group">
                  {/* Front/Question */}
                  <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-border/50 bg-background">
                    <div className="text-xs font-medium text-muted-foreground mb-2 flex justify-between">
                      <span>FRONT</span>
                      {card.highlight && card.highlight.bookId ? (
                        <Link
                          href={`/library/${card.highlight.bookId}?highlight=${card.highlight.id}`}
                          className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors flex items-center gap-1 max-w-[200px]"
                          title="View source context"
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>⚡</span>
                          <span className="truncate">From: {card.highlight.bookTitle || "Book"}</span>
                        </Link>
                      ) : card.highlightId && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">FROM HIGHLIGHT</span>
                      )}
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownRenderer content={card.front} />
                    </div>
                  </div>

                  {/* Back/Answer */}
                  <div className="flex-1 p-5 bg-muted/10">
                    <div className="text-xs font-medium text-muted-foreground mb-2">BACK</div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownRenderer content={card.back} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-full md:w-12 border-t md:border-t-0 md:border-l border-border/50 flex md:flex-col items-center justify-center p-2 gap-2 bg-muted/20">
                     <button
                        onClick={() => setEditingCard(card)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit Card"
                      >
                       <Edit2 className="w-4 h-4" />
                     </button>
                     <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-2 text-muted-foreground hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="Delete Card"
                      >
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unified Card Form Modal - for both create and edit */}
        <CardFormModal
          isOpen={isCreateCardOpen || Boolean(editingCard)}
          onClose={() => {
            setIsCreateCardOpen(false);
            setEditingCard(null);
          }}
          deckId={deckId}
          card={editingCard ?? undefined}
        />
      </div>
    </AuthGuard>
  );
}
